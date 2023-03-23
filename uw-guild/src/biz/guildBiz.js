/**
 * Created by Administrator on 2014/5/16.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var c_lottery = uwData.c_lottery;
var c_vip = uwData.c_vip;
var c_lvl = uwData.c_lvl;
var c_guildLvl = uwData.c_guildLvl;
var c_guildFuncCfg = uwData.c_guildFuncCfg;
var t_itemLogic = uwData.t_itemLogic;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var t_item = uwData.t_item;
var c_open = uwData.c_open;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var chatBiz = null;
var GuildEntity = require('uw-entity').GuildEntity;
var MailEntity = require("uw-entity").MailEntity;
var GuildPersonalEntity = require('uw-entity').GuildPersonalEntity;
var g_data = require("uw-global").g_data;
var g_guildWar = require("uw-global").g_guildWar;
var g_gameConfig = require("uw-global").g_gameConfig;

var userDao = null;
var userUtils = null;
var propUtils = null;
var guildDao = null;
var guildPersonalDao = null;
var itemBiz = null;
var commonUtils = null;
var guildUtils = null;
var rankDao = null;
var g_guild = null;
var gameCommonBiz = null;
var mailBiz =  null;
var formula = require("uw-formula");
var checkRequire = function(){
    userDao = userDao || require("uw-user").userDao;
    userUtils = userUtils || require("uw-user").userUtils;
    propUtils = propUtils || require("uw-utils").propUtils;
    guildDao =  guildDao || require("../dao/guildDao.js");
    guildPersonalDao = guildPersonalDao || require("../dao/guildPersonalDao.js");
    itemBiz = itemBiz || require("uw-item").itemBiz;
    commonUtils = commonUtils ||  require("uw-utils").commonUtils;
    guildUtils = guildUtils || require("./guildUtils.js");
    rankDao = rankDao || require("uw-rank").rankDao;
    g_guild = g_guild || require("uw-global").g_guild;
    gameCommonBiz = gameCommonBiz || require("uw-game-common").gameCommonBiz;
    chatBiz = chatBiz || require("uw-chat").chatBiz;
    mailBiz = mailBiz || require("uw-mail").mailBiz;
};

var ds = require("uw-ds").ds;

var exports = module.exports;

/**
 * 获取行会数据
 * @param client
 * @param userId
 * @param cb
 */
exports.getInfo = function(client,userId,cb){
    checkRequire();
    _getRecordData(client,userId,function(err,guildPersonalData){
        if (err) return cb(err);
        var guildId = guildPersonalData.guildId;
        g_data.setGuildId(userId, guildId);
        g_data.setGuildEnnoble(userId.userId, guildPersonalData.ennoble);
        var isOpenGuildWar = g_guildWar.isOpen();
        //cfg 数据["行会战开战星期","行会战开始结束时间","可报名时间星期","可报名时间"]
        var  gCfg = g_gameConfig.getData();
        //[开始月，开始日，开始时间，结束月，结束日，结束时间]
        //[开始月，开始日，开始时间，结束时间]
        var cfgData = [gCfg.guildWarSign, gCfg.guildWarOpen];
        if(guildId){
            //有行会
            var guildData = g_guild.getGuild(guildPersonalData.guildId);
            if (!guildData){
                guildPersonalDao.update(client,{guildId:0},{id:guildPersonalData.id},function(){});
                return cb("行会已经不存在");
            }
            async.parallel([
                function(cb1){
                    userDao.selectCols(client," nickName ",{id:guildData.chairmanId},cb1);
                },
                function(cb1){
                    exports.getGuildRank(client,guildId,cb1);
                },
                function(cb1){
                    gameCommonBiz.getInfo(client,cb1);
                }
            ],function(err,data){
                if(err) return cb(err);
                var isOpenBoss = data[2].isOpenBoss;
                g_data.setGuildChange(userId,0);
                cb(null,[true,guildPersonalData,guildData,data[0].nickName,data[1],isOpenBoss,isOpenGuildWar,cfgData]);
            });
        }else{
            async.parallel([
                function(cb1){
                    exports.getGuildList(client,userId,cb1);
                },
                function(cb1){
                    gameCommonBiz.getInfo(client,cb1);
                }
            ],function(err,data){
                if (err) return cb(err);
                var dataList = data[0];
                dataList.sort(function(){ return 0.5 - Math.random() });     //打乱数组顺序
                var isOpenBoss = data[1].isOpenBoss;
                g_data.setGuildChange(userId,0);

                cb(null,[false,guildPersonalData,dataList,null,null,isOpenBoss,isOpenGuildWar,cfgData]);
            });
        }
    });
};

//获取行会排名
exports.getGuildRank = function(client,guildId,cb){
    rankDao.select(client, " userId = ? and rankType = ?", [guildId,c_prop.rankTypeKey.guildRank], function(err,rankData) {
        if (err) return cb(err);
        if(rankData){       //排行榜存在数据
            rankDao.count(client, " rankType = ? and id <= ?", [c_prop.rankTypeKey.guildRank,rankData.id], function(err,rankCount)  {
                if (err) return cb(err);
                cb(null,rankCount);
            });
        }else{      //排行榜不存在数据
            guildDao.count(client, " lvl >= (SELECT lvl FROM uw_guild WHERE id = ?) " ,[guildId], function(err,rankCount)  {
                if (err) return cb(err);
                cb(null,rankCount);
            });
        }
    });
};

//会长弹劾
exports.chairmanImpeach = function(client,cb){
    checkRequire();
    var guildList = [];
    var guildCache = g_guild.getCache()||{};
    if(g_guildWar.isOpen()) return cb(null);
    for(var key in guildCache){
        var guildData = guildCache[key].guild;
        if(guildData){
            var cosGuildData = JSON.parse(JSON.stringify(guildData));
            if(cosGuildData.lastExpelTime) cosGuildData.lastExpelTime = new Date(cosGuildData.lastExpelTime);
            if(cosGuildData.resetTime) cosGuildData.lastExpelTime = new Date(cosGuildData.resetTime);
            if(cosGuildData.lastLgTime) cosGuildData.lastExpelTime = new Date(cosGuildData.lastLgTime);
            guildList.push(cosGuildData);
        }
    }

    async.mapLimit(guildList,1, function (guild, cb1) {
        _checkChairman(client,guild,cb1);
    }, function(err,data){
        if(err) return cb(err);
        cb(null);
    });
};

var _checkChairman = function(client,guildData,cb){
    checkRequire();
    userDao.selectCols(client,"id,nickName,lastUpdateTime","id = ? ",[guildData.chairmanId],function(err,chairmanData){
        if(err) return cb(err);
        if(!chairmanData) return cb(null);
        var dayCount = c_game.guildSet[13];
        if(!chairmanData.lastUpdateTime || chairmanData.lastUpdateTime.getDaysBetween(new Date())<dayCount){
            return cb(null);
        }
        guildPersonalDao.listCols(client,"userId,guildAct"," guildId = ? and userId != ? order by guildAct desc ",[guildData.id, guildData.chairmanId],function(err,guildPersonalList){
            if(err) return cb(err);
            var userIdArr = [];
            var guildActObj = {};
            var allArr = [guildData.chairmanId];
            for(var i = 0;i<guildPersonalList.length;i++){
                var guildPersonalData = guildPersonalList[i];
                if(guildPersonalData.userId){
                    if(userIdArr.length < 20) userIdArr.push(guildPersonalData.userId);
                    allArr.push(guildPersonalData.userId);
                    guildActObj[guildPersonalData.userId] = guildPersonalData.guildAct;
                }
            }
            if(userIdArr.length<=0) return cb(null);
            userDao.listCols(client,"id,nickName,lvl,vip"," id in (?) and ( TO_DAYS( lastUpdateTime ) = TO_DAYS(NOW()) OR (TO_DAYS( NOW( ) ) - TO_DAYS( lastUpdateTime ) <= 1))",[userIdArr],function(err,userList){
                if(err) return cb(err);
                if(userList.length<=0) return cb(null);
                var userData = userList[0];
                var act = guildActObj[userList[0].id];
                if(act == 0) return cb(null);
                for(var i = 1;i<userList.length;i++){
                    var cosUserData = userList[i];
                    if(guildActObj[cosUserData.id] < act) continue;
                    if(guildActObj[cosUserData.id] >= act){
                        if(guildActObj[cosUserData.id] = act){
                            if(cosUserData.lvl >= userData.lvl){
                                if(cosUserData.lvl == userData.lvl){
                                    if(cosUserData.vip > userData.vip){
                                        userData = cosUserData;
                                    }
                                }else{
                                    userData = cosUserData;
                                }
                            }
                        }else{
                            userData = cosUserData;
                        }
                    }
                }
                if(!userData) return cb(null);
                //设置行会个人数据
                async.parallel([
                    function(cb1){
                        guildPersonalDao.update(client,{position:c_prop.guildPostKey.rankFile},{userId:guildData.chairmanId},cb1);
                    },
                    function(cb1){
                        guildPersonalDao.update(client,{position:c_prop.guildPostKey.chairman},{userId:userData.id},cb1);
                    }
                ],function(err,data){
                    if(err) return cb(err);
                    //发送邮件通知
                    var tempList = [];
                    var name = userData.nickName;
                    for(var i = 0;i < allArr.length;i++){
                        var mailUserId = allArr[i];
                        var type = 0;
                        var parameter = [];
                        if(mailUserId == guildData.chairmanId){     //降职通知
                            type = c_prop.mailTypeKey.impeachFall;
                            parameter = [dayCount,name];
                        } else if(mailUserId == userData.id){       //升职通知
                            type = c_prop.mailTypeKey.impeachUp;
                            parameter = [chairmanData.nickName,dayCount];
                        }else{      //会长更换通知
                            type = c_prop.mailTypeKey.impeachAll;
                            parameter = [chairmanData.nickName,dayCount,name];
                        }
                        var locMail = mailBiz.createEntityByType(mailUserId, type, parameter, {});
                        locMail.addTime = new Date();
                        tempList.push(locMail);
                    }
                    mailBiz.addMailByList(client,tempList,function(){});
                    //设置行会数据
                    guildData.chairmanId = userData.id;
                    var viceChairmanId = guildData.viceChairmanId||[];
                    for(var i = 0;i<viceChairmanId.length;i++){
                        if(viceChairmanId[i]==guildData.chairmanId || viceChairmanId[i]==userData.id) viceChairmanId.splice(i--,1);
                    }
                    guildData.viceChairmanId = viceChairmanId;
                    g_data.setGuildChange(userData.id,1);
                    g_guild.setGuild(guildData.id, guildData);
                    cb(null);
                });
            });
        });
    });
};

/**
 * 创建行会
 * @param client
 * @param userId
 * @param name
 * @param cb
 */
exports.establishGuild = function(client,userId,name,cb){
    checkRequire();
    var openCon = c_open.guild.lvlRequired;
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            _getRecordData(client,userId,cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0],guildPersonalData = data[1];
        if(userData.lvl < openCon) return cb("等级未达到开启条件");
        if(guildPersonalData.guildId) return cb("已有行会");

        var lastQuitGuildTime = guildPersonalData.lastQuipGuildTime;
        if(lastQuitGuildTime){
            //var quitGuildCount = guildUtils.getTodayExitGuild(guildPersonalData);
            //var quitGuildCd = formula.calQuitGuildCfg(quitGuildCount);
            var quitGuildCd = parseInt(c_game.guildSet[5])*60*60;
            var joinTime = lastQuitGuildTime.getTime() + quitGuildCd*1000;
            //todo 临时去掉cd判断
            if(new Date(joinTime) > new Date()) return cb("退会cd中");
        }

        //限制长度
        var nameLength = commonUtils.getStringLength(name);
        if(nameLength<= 0) return cb(getMsg(c_msgCode.guildNameIsNull));//长度超出啦
        if(nameLength>12) return cb(getMsg(c_msgCode.guildNameTooLong));//长度超出啦
        //过滤敏感字符
        if(commonUtils.checkFuckWord(name)) return cb(getMsg(c_msgCode.guildNameIllegal));
        if(name.indexOf(" ")>=0) return cb("名称不能包含空格");
        if(name.indexOf("\n")>=0 || name.indexOf("\\n")>=0 || name.indexOf("\r")>=0 || name.indexOf("\\r")>=0|| name.indexOf("\"")>=0) return cb("名称不能包含回车换行或双引号");
        name=name.replace("\\n","");name=name.replace("\n","");
        name=name.replace("\\r","");name=name.replace("\r","");
        name=name.replace("\"","");

        guildDao.select(client,{name:name},function(err,guildData){
            if(err) return cb(err);
            if(guildData) return cb(getMsg(c_msgCode.guildNameSame));
            var needDiamond = c_game.guildSet[1];
            if(userData.diamond < needDiamond) return cb(getMsg(c_msgCode.noDiamond));

            //扣除元宝
            userUtils.reduceDiamond(userData,needDiamond);

            var guildEntity = new GuildEntity();
            guildEntity.name = name;
            guildEntity.chairmanId = userId;
            guildEntity.viceChairmanId = [];
            guildEntity.guildPopulation = 1;
            guildEntity.addUpAct = 0;
            guildEntity.joinCon = c_prop.guildJoinConKey.verify;
            guildEntity.joinLvl = 1;
            guildEntity.lvl = 1;
            guildEntity.appliedMembers = [];
            guildEntity.ennobleData = {};

            var updateData = {
                diamond: userData.diamond
            };
            async.parallel([
                function (cb1) {
                    userDao.update(client,updateData,{id:userId},cb1);
                },
                function (cb1) {
                    guildDao.insert(client, guildEntity,cb1);
                }
            ], function (err, upData) {
                if (err) return cb(err);
                var insertData = upData[1];
                guildEntity.id = insertData.insertId;

                g_guild.setGuild(guildEntity.id,guildEntity);

                guildPersonalData.guildId = guildEntity.id;
                guildPersonalData.position = c_prop.guildPostKey.chairman;
                guildPersonalData.ennoble = c_prop.ennobleTypeKey.civilian;
                //guildPersonalData.joinTime = new Date();

                var updateGuildPersonalData = {
                    guildId: guildPersonalData.guildId,
                    position: guildPersonalData.position,
                    viceTime: guildPersonalData.viceTime,
                    todayAct: guildPersonalData.todayAct,
                    actLastTime: guildPersonalData.actLastTime,
                    addUpAct: guildPersonalData.addUpAct,
                    ennoble: guildPersonalData.ennoble
                    //joinTime:guildPersonalData.joinTime
                };
                guildPersonalDao.update(client, updateGuildPersonalData,{id:guildPersonalData.id},function(err,upGuildPersonalData){
                    if (err) return cb(err);
                    g_data.setGuildId(userId,guildEntity.id);
                    cb(null,[guildEntity,updateData,needDiamond,upGuildPersonalData]);
                });
            });
        });
    });
};

/**
 * 搜索行会
 * @param client
 * @param guildId
 * @param cb
 */
exports.seekGuild = function(client,guildId,cb){
    checkRequire();
    var guildData = g_guild.getGuild(guildId);
    cb(null,guildData);
};

/**
 * 申请加入行会
 * @param client
 * @param userId
 * @param guildId
 * @param cb
 */
exports.joinGuild = function(client,userId,guildId,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            _getRecordData(client,userId,cb1);
        },
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var guildPersonalData = data[0],userData = data[1];
        var guildData = g_guild.getGuild(guildId);
        if (!guildData) return cb("行会已经不存在");
        if(guildPersonalData.guildId) return cb("您已加入其它行会");
        if(guildData.joinCon == c_prop.guildJoinConKey.cannot) return cb("该行会不可加入");
        if(userData.lvl < guildData.joinLvl) return cb("等级不足");

        var guildMan = c_lvl[guildData.lvl].guildMan;
        var lastQuitGuildTime = guildPersonalData.lastQuipGuildTime;
        if(lastQuitGuildTime){
            //var quitGuildCount = guildUtils.getTodayExitGuild(guildPersonalData);
            //var quitGuildCd = formula.calQuitGuildCfg(quitGuildCount);
            var quitGuildCd = parseInt(c_game.guildSet[5])*60*60;
            var joinTime = lastQuitGuildTime.getTime() + quitGuildCd*1000;
            //todo 临时去掉cd判断
            if(new Date(joinTime) > new Date()) return cb("退会cd中");
        }
        if(guildData.guildPopulation >= guildMan) return cb(getMsg(c_msgCode.applicationMax));

        var isJoin = false;
        if(guildData.joinCon == c_prop.guildJoinConKey.verify){     //需要验证
            if(guildData.appliedMembers.indexOf(guildId) < 0) guildData.appliedMembers.push(userId);
            if(guildPersonalData.appliedMsg.indexOf(guildId) < 0) guildPersonalData.appliedMsg.push(guildId);
        }else{      //直接加入
            isJoin = true;
            guildData.guildPopulation += 1;
            guildPersonalData.guildId = guildId;
            guildPersonalData.position = c_prop.guildPostKey.rankFile;
            guildPersonalData.ennoble = c_prop.ennobleTypeKey.civilian;

        }

        var updateGuildData = {
            appliedMembers: guildData.appliedMembers,
            guildPopulation: guildData.guildPopulation
        };
        var updateGuildPersonalData = {
            guildId: guildPersonalData.guildId,
            position: guildPersonalData.position,
            viceTime: guildPersonalData.viceTime,
            todayAct: guildPersonalData.todayAct,
            actLastTime: guildPersonalData.actLastTime,
            addUpAct: guildPersonalData.addUpAct,
            appliedMsg: guildPersonalData.appliedMsg,
            ennoble: guildPersonalData.ennoble
        };
        g_guild.setGuild(guildData.id, guildData);
        async.parallel([
            function (cb1) {
                guildPersonalDao.update(client, updateGuildPersonalData,{id:guildPersonalData.id},cb1);
            }
        ], function (err, upData) {
            if (err) return cb(err);
            cb(null,[isJoin,updateGuildData,updateGuildPersonalData]);
        });
    });
};

/**
 * 获取申请列表
 * @param client
 * @param guildId
 * @param cb
 */
exports.getAppliedMembers = function(client,userId,cb){
    checkRequire();
    guildPersonalDao.select(client,{userId:userId},function(err,guildPersonalData){
        if (err) return cb(err);
        if(!guildPersonalData.guildId) return cb(getMsg(c_msgCode.outGuild));
        if(c_guildFuncCfg[guildPersonalData.position].agreeApp == 0) return cb("没有权限");
        var guildData = g_guild.getGuild(guildPersonalData.guildId);
        if (!guildData) return cb(getMsg(c_msgCode.outGuild));

        var appliedMembers = guildData.appliedMembers;
        if(appliedMembers.length <= 0) return cb(null,[]);
        userDao.listCols(client, " id,lvl,nickName,combat,vip ", " id in (?) ",[appliedMembers],function(err, userList){
            cb(null,userList);
        });
    });
};

/**
 * 申请列表管理
 * @param client
 * @param userId
 * @param tUserId
 * @param isConsent
 * @param cb
 */
exports.appliedMembersSet = function(client,userId,tUserId,isConsent,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            guildPersonalDao.selectCols(client," guildId,position ",{userId:userId},cb1);
        },
        function(cb1){
            _getRecordData(client,tUserId,cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var guildPersonalData = data[0],tGuildPersonalData = data[1];

        var lastQuitGuildTime = tGuildPersonalData.lastQuipGuildTime;
        if(lastQuitGuildTime){
            var quitGuildCd = parseInt(c_game.guildSet[5])*60*60;
            var joinTime = lastQuitGuildTime.getTime() + quitGuildCd*1000;
            if(new Date(joinTime) > new Date()) return cb("该玩家正在退会cd中");
        }

        if(!guildPersonalData.guildId) return cb(getMsg(c_msgCode.outGuild));
        var otherGuildEntered = false;      //是否已加入其它行会
        var membersMax = false;     //是否满员
        if(tGuildPersonalData.guildId) otherGuildEntered = true;
        var guildData = g_guild.getGuild(guildPersonalData.guildId);
        if (!guildData) return cb(getMsg(c_msgCode.outGuild));
        if (c_guildFuncCfg[guildPersonalData.position].agreeApp == 0) return cb("权限不足");
        var guildMan = c_lvl[guildData.lvl].guildMan;
        var guildPopulation = guildData.guildPopulation;
        if (guildPopulation >= guildMan) membersMax = true;
        if (isConsent && !otherGuildEntered && !membersMax) {      //同意
            guildData.guildPopulation += 1;
            tGuildPersonalData.guildId = guildPersonalData.guildId;
            tGuildPersonalData.position = c_prop.guildPostKey.rankFile;
            tGuildPersonalData.ennoble = c_prop.ennobleTypeKey.civilian;
            //tGuildPersonalData.joinTime = new Date();
        }
        commonUtils.arrayRemoveObject(guildData.appliedMembers, tUserId);
        commonUtils.arrayRemoveObject(tGuildPersonalData.appliedMsg, guildPersonalData.guildId);

        var updateGuildData = {
            appliedMembers: guildData.appliedMembers,
            guildPopulation: guildData.guildPopulation
        };
        var updateGuildPersonalData = {
            guildId: tGuildPersonalData.guildId,
            position: tGuildPersonalData.position,
            viceTime: tGuildPersonalData.viceTime,
            todayAct: tGuildPersonalData.todayAct,
            actLastTime: tGuildPersonalData.actLastTime,
            addUpAct: tGuildPersonalData.addUpAct,
            appliedMsg: tGuildPersonalData.appliedMsg,
            ennoble: tGuildPersonalData.ennoble
            //joinTime:tGuildPersonalData.joinTime
        };
        g_guild.setGuild(guildData.id, guildData);
        async.parallel([
            function (cb1) {
                guildPersonalDao.update(client, updateGuildPersonalData, {id: tGuildPersonalData.id}, cb1);
            }
        ], function (err, upData) {
            if (err) return cb(err);
            g_data.setGuildId(tUserId, guildPersonalData.guildId);
            g_data.setGuildChange(tUserId,1);
            cb(null, [updateGuildData, updateGuildPersonalData, otherGuildEntered, membersMax]);
        });
    });
};

/**
 * 工会设置
 * @param client
 * @param userId
 * @param joinCon
 * @param joinLvl
 * @param cb
 */
exports.guildSetting = function(client,userId,joinCon,joinLvl,cb){
    checkRequire();
    guildPersonalDao.select(client,{userId:userId},function(err,guildPersonalData){
        if (err) return cb(err);
        if(!guildPersonalData.guildId) return cb(getMsg(c_msgCode.outGuild));
        if(c_guildFuncCfg[guildPersonalData.position].setGuild == 0) return cb("没有权限");
        var guildData = g_guild.getGuild(guildPersonalData.guildId);
        if (!guildData) return cb(getMsg(c_msgCode.outGuild));
        guildData.joinCon = joinCon;
        guildData.joinLvl = joinLvl;
        var updateGuildData = {
            joinCon: guildData.joinCon,
            joinLvl: guildData.joinLvl
        };
        g_guild.setGuild(guildData.id, guildData);
        cb(null,updateGuildData);
    });
};

/**
 * 修改公告
 * @param client
 * @param userId
 * @param notice
 * @param cb
 */
exports.setNotice = function(client,userId,notice,cb){
    checkRequire();
    guildPersonalDao.select(client, {userId: userId}, function (err, guildPersonalData) {
        if (err) return cb(err);
        if (!guildPersonalData.guildId) return cb(getMsg(c_msgCode.outGuild));
        if (c_guildFuncCfg[guildPersonalData.position].changeNotice == 0) return cb("没有权限");
        var guildData = g_guild.getGuild(guildPersonalData.guildId);
        if (!guildData) return cb(getMsg(c_msgCode.outGuild));

        if (notice.replace(/[^\x00-\xFF]/g, '**').length > 60) return cb(getMsg(c_msgCode.noticeTooLong));
        var count = guildUtils.getTodayNotice(guildPersonalData);
        if (count > 30) return cb(getMsg(c_msgCode.noticeMax));
        guildUtils.addTodayNotice(guildPersonalData, 1);
        guildData.notice = notice;
        var updateGuildData = {
            notice: guildData.notice
        };
        var updateGpData = {
            actData:guildPersonalData.actData,
            todayAct:guildPersonalData.todayAct,
            exitGuildCount:guildPersonalData.exitGuildCount,
            lotteryCount:guildPersonalData.lotteryCount,
            actLastTime: guildPersonalData.actLastTime,
            noticeCount: guildPersonalData.noticeCount
        };
        g_guild.setGuild(guildData.id, guildData);
        async.parallel([
            function (cb1) {
                guildPersonalDao.update(client, updateGpData, {id: guildPersonalData.id}, cb1);
            }
        ], function (err, upData) {
            if (err) return cb(err);
            cb(null, [updateGuildData, updateGpData]);
        });
    });
};

/**
 * 退会
 * @param client
 * @param userId
 * @param cb
 */
exports.exitGuild = function(client,userId,cb){
    checkRequire();
    guildPersonalDao.select(client,{userId:userId},function(err,guildPersonalData){
        if(err) return cb(err);
        if(!guildPersonalData.guildId) return cb(getMsg(c_msgCode.outGuild));
        var guildData = g_guild.getGuild(guildPersonalData.guildId);
        if (!guildData) return cb(getMsg(c_msgCode.outGuild));
        var guildId = guildData.id;
        if (c_guildFuncCfg[guildPersonalData.position].quitGuild == 0) {      //会长
            //行会战开启期间，无法退出行会和解散行会
            if(g_guildWar.isOpen()) return cb(getMsg(c_msgCode.noGuildDisband));

            if (guildData.guildPopulation > 1) return cb(getMsg(c_msgCode.cantGdisband));
            guildPersonalData.guildId = 0;
            guildPersonalData.position = c_prop.guildPostKey.rankFile;
            guildPersonalData.guildAct = 0;
            guildPersonalData.ennoble = c_prop.ennobleTypeKey.civilian;
            guildPersonalData.lastQuipGuildTime = new Date();
            if (guildPersonalData.outMsg.indexOf(guildId) < 0) guildPersonalData.outMsg.push(guildId);
            guildUtils.addTodayExitGuild(guildPersonalData, 1);
            var updateGuildPersonalData = {
                noticeCount: guildPersonalData.noticeCount,
                actData:guildPersonalData.actData,
                lotteryCount:guildPersonalData.lotteryCount,
                guildId: guildPersonalData.guildId,
                position: guildPersonalData.position,
                viceTime: guildPersonalData.viceTime,
                todayAct: guildPersonalData.todayAct,
                actLastTime: guildPersonalData.actLastTime,
                addUpAct: guildPersonalData.addUpAct,
                outMsg: guildPersonalData.outMsg,
                exitGuildCount: guildPersonalData.exitGuildCount,
                guildAct: guildPersonalData.guildAct,
                ennoble: guildPersonalData.ennoble,
                lastQuipGuildTime: guildPersonalData.lastQuipGuildTime
            };
            async.parallel([
                function (cb1) {
                    guildDao.del(client, {id: guildData.id}, cb1);
                },
                function (cb1) {
                    guildPersonalDao.update(client, updateGuildPersonalData, {id: guildPersonalData.id}, cb1);
                }
            ], function (err, upData) {
                if (err) return cb(err);
                g_data.setGuildId(userId, null);
                g_data.setGuildEnnoble(userId, null);
                cb(null, [{}, updateGuildPersonalData, guildId]);
            });
        } else {      //成员
            //行会战开启期间，无法退出行会和解散行会
            if(g_guildWar.isOpen()) return cb(getMsg(c_msgCode.noGuildOut));

            var ennoble = guildPersonalData.ennoble;
            if(ennoble){
                guildData.ennobleData[ennoble] -= 1;
                if(guildData.ennobleData[ennoble] < 0) guildData.ennobleData[ennoble] = 0;
            }
            //if(guildPersonalData.position == c_prop.guildPostKey.viceChairman) commonUtils.arrayRemoveObject(guildData.viceChairmanId, guildPersonalData.userId);
            var viceChairmanId = guildData.viceChairmanId||[];
            for(var i = 0;i<viceChairmanId.length;i++){
                if(viceChairmanId[i]==guildPersonalData.userId) viceChairmanId.splice(i,1);
            }
            guildPersonalData.guildId = 0;
            guildPersonalData.position = c_prop.guildPostKey.rankFile;
            guildPersonalData.guildAct = 0;
            guildPersonalData.ennoble = c_prop.ennobleTypeKey.civilian;
            guildPersonalData.lastQuipGuildTime = new Date();
            if (guildPersonalData.outMsg.indexOf(guildId) < 0) guildPersonalData.outMsg.push(guildId);
            guildUtils.addTodayExitGuild(guildPersonalData, 1);
            guildData.guildPopulation -= 1;
            if(guildData.guildPopulation < 1) guildData.guildPopulation=1;

            var updateGuildData = {
                guildPopulation: guildData.guildPopulation,
                viceChairmanId: guildData.viceChairmanId,
                ennobleData:guildData.ennobleData
            };
            var updateGuildPersonalData = {
                actData:guildPersonalData.actData,
                lotteryCount:guildPersonalData.lotteryCount,
                noticeCount: guildPersonalData.noticeCount,
                guildId: guildPersonalData.guildId,
                position: guildPersonalData.position,
                viceTime: guildPersonalData.viceTime,
                todayAct: guildPersonalData.todayAct,
                actLastTime: guildPersonalData.actLastTime,
                addUpAct: guildPersonalData.addUpAct,
                outMsg: guildPersonalData.outMsg,
                exitGuildCount: guildPersonalData.exitGuildCount,
                guildAct: guildPersonalData.guildAct,
                lastQuipGuildTime: guildPersonalData.lastQuipGuildTime,
                ennoble: guildPersonalData.ennoble
            };

            g_guild.setGuild(guildData.id, guildData);

            async.parallel([
                function (cb1) {
                    guildPersonalDao.update(client, updateGuildPersonalData, {id: guildPersonalData.id}, cb1);
                }
            ], function (err, upData) {
                if (err) return cb(err);

                g_data.setGuildId(userId, null);

                cb(null, [updateGuildData, updateGuildPersonalData, 0]);
            });
        }
    });
};

/**
 * 抽奖
 * @param client
 * @param userId
 * @param cb
 */
exports.lottery = function (client,userId,count,cb) {
    checkRequire();
    async.parallel([
        function(cb1){
            guildPersonalDao.select(client,{userId:userId},cb1);
        },
        function(cb1) {
            userDao.select(client,{id:userId}, cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var guildPersonalData = data[0], userData = data[1];
        if (!guildPersonalData.guildId) return cb(getMsg(c_msgCode.outGuild));
        //var lotteryCount = guildUtils.getTodayLottery(guildPersonalData);
        //if (lotteryCount >= c_vip[userData.vip].guildLotteryCount) return cb(getMsg(c_msgCode.noTreasure));
        var guildData = g_guild.getGuild(guildPersonalData.guildId);
        if (!guildData) cb(getMsg(c_msgCode.outGuild));
        if (guildData.lvl < c_game.guildSet[8]) return cb(getMsg(c_msgCode.noGuildLevel));
        var items = {};

        //必掉金币
        var willFall = {};
        willFall[c_prop.spItemIdKey.gold] = parseInt(c_game.lotteryWillFall[0])*parseInt(count);
        items = propUtils.mergerProp(items,willFall);

        var cosAct = 0;        //消耗贡献值
        for(var i = 0; i < count; i++){
            items = propUtils.mergerProp(items, _getLotteryObj(userData.lvl, guildData.lvl));
            cosAct += c_game.guildAct[2];        //消耗贡献值
        }

        if (guildPersonalData.addUpAct < cosAct) return cb("贡献值不足");
        //获得物品
        var bagItems = {};
        var equipBagItems = {};
        var itemsArr = userUtils.saveItems(userData, items);
        if (Object.keys(itemsArr[0]).length > 0) bagItems = propUtils.mergerProp(bagItems, itemsArr[0]);
        if (Object.keys(itemsArr[1]).length > 0) equipBagItems = propUtils.mergerProp(equipBagItems, itemsArr[1]);

        //贡献值扣除
        guildPersonalData.addUpAct -= cosAct;
        //guildUtils.addTodayLottery(guildPersonalData, 1);

        for(var key in items){
            var locItemData = t_item[key];
            chatBiz.addSysData(32,[userData.nickName,locItemData.name,locItemData.color]);
        }

        //更新
        var updateData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag,
            prestige: userData.prestige
        };
        var updateGpData = {
            addUpAct: guildPersonalData.addUpAct,
            actLastTime: guildPersonalData.actLastTime
            //lotteryCount: guildPersonalData.lotteryCount
        };
        async.parallel([
            function (cb1) {
                userDao.update(client, updateData, {id: userId}, cb1);
            },
            function (cb1) {
                guildPersonalDao.update(client, updateGpData, {id: guildPersonalData.id}, cb1);
            }
        ], function (err, data1) {
            if (err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            return cb(null, [updateData, updateGpData, items, bagItems, equipBagItems]);
        });
    });
};

/**
 * 爵位
 * @param client
 * @param userId
 * @param targetUserId
 * @param ennobleType
 * @param cb
 */
exports.setEnnoble = function(client,userId,targetUserId,ennobleType,cb){
    ennobleType = parseInt(ennobleType);
    checkRequire();
    async.parallel([
        function (cb1) {
            guildPersonalDao.select(client, {userId: userId}, cb1);
        },
        function (cb1) {
            guildPersonalDao.select(client, {userId: targetUserId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var mPersonalData = data[0], tPersonalData = data[1];
        if (!mPersonalData.guildId) return cb(getMsg(c_msgCode.outGuild));
        var guildData = g_guild.getGuild(mPersonalData.guildId);
        if (!guildData) return cb(getMsg(c_msgCode.outGuild));
        if (mPersonalData.guildId != tPersonalData.guildId) return cb("该玩家不在同一个行会");
        if (c_guildFuncCfg[mPersonalData.position].setEnnoble == 0) return cb("没有权限");
        var ennobleCountObj = {};
        var ennobleCount = c_guildLvl[guildData.lvl].ennobleCount;     //[亭长,庶长,轻骑,游骑,校尉,都尉,男爵,子爵,伯爵,侯爵,公爵,王爵]
        for(var i=0;i<ennobleCount.length;i++){
            ennobleCountObj[ennobleCount[i][0]] = ennobleCount[i][1];
        }

        if(ennobleType == c_prop.ennobleTypeKey.civilian){
            var oldEnnoble = tPersonalData.ennoble;
            if(oldEnnoble){
                var oldEnnobleCount = guildData.ennobleData[oldEnnoble]||0;
                if(oldEnnobleCount>0){
                    oldEnnobleCount--;
                    guildData.ennobleData[oldEnnoble] = oldEnnobleCount;
                }
            }
            //设置爵位
            tPersonalData.ennoble = c_prop.ennobleTypeKey.civilian;
        }else{
            if(!ennobleCountObj[ennobleType]) return cb("行会等级不足");
            var nowCount = 0;
            var allowCount = ennobleCountObj[ennobleType];
            //人数判断
            if(!guildData.ennobleData) guildData.ennobleData = {};
            if(guildData.ennobleData[ennobleType]) nowCount = guildData.ennobleData[ennobleType];
            if(nowCount>=allowCount) return cb(getMsg(c_msgCode.noPosition));

            var memberLvl = _getRankFileLvl(tPersonalData.guildAct);
            if(memberLvl == 0 && ennobleType != c_prop.ennobleTypeKey.civilian) return cb(getMsg(c_msgCode.noMemberLv));
            var ennobleCon = c_lvl[memberLvl].ennobleCon;
            if(ennobleCon.indexOf(ennobleType)<0) return cb(getMsg(c_msgCode.noMemberLv));

            if(tPersonalData.ennoble != ennobleType){
                var oldEnnoble = tPersonalData.ennoble;
                if(oldEnnoble){
                    var oldEnnobleCount = guildData.ennobleData[oldEnnoble]||0;
                    if(oldEnnobleCount>0){
                        oldEnnobleCount--;
                        guildData.ennobleData[oldEnnoble] = oldEnnobleCount;
                    }
                }
                //设置爵位
                tPersonalData.ennoble = ennobleType;
                if(guildData.ennobleData[ennobleType]){
                    guildData.ennobleData[ennobleType] = nowCount + 1;
                }else{
                    guildData.ennobleData[ennobleType] = 1;
                }
            }
        }

        var updateTPersonal = {
            ennoble: tPersonalData.ennoble
        };
        var updateGuild = {
            ennobleData: guildData.ennobleData
        };
        g_guild.setGuild(guildData.id, guildData);
        g_data.setGuildEnnoble(tPersonalData.userId, tPersonalData.ennoble);
        guildPersonalDao.update(client, updateTPersonal, {id: tPersonalData.id}, function (err, data) {
            if (err) return cb(err);
            var returnArr = [];
            returnArr.push(updateGuild);
            if(userId==targetUserId) returnArr.push(updateTPersonal);
            cb(null, returnArr);
        });
    });
};

//获取行会列表
exports.getGuildList = function(client,userId,cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if(err) return cb(err);
        var lvl = userData.lvl;
        guildDao.listCols(client," id,lvl,name,guildPopulation "," joinCon != ? AND joinLvl <= ? ",[c_prop.guildJoinConKey.cannot,lvl],function(err,guildData) {
            if (err) return cb(err);
            if (!guildData) {
                cb(null,[]);
            } else {
                cb(null,guildData);
            }
        });
    });
};

/*****************************************************************************************************/

//判断是否有数据，无数据插入一条
var _getRecordData = function(client,userId,cb){
    guildPersonalDao.select(client,{userId:userId},function(err,guildPersonalData) {
        if(err) return cb(err);
        if(!guildPersonalData) {        //如果不存在该用户数据则插入一条
            var guildPersonalEntity = new GuildPersonalEntity();
            guildPersonalEntity.userId = userId;
            guildPersonalEntity.outMsg = [];
            guildPersonalEntity.ennoble = c_prop.ennobleTypeKey.civilian;
            guildPersonalEntity.actLastTime = new Date();
            guildPersonalDao.insert(client, guildPersonalEntity, function(err,data){
                if(err) return cb(err);
                guildPersonalEntity.id = data.insertId;
                cb(null,guildPersonalEntity);
            });
        }else{
            cb(null,guildPersonalData);
        }
    });
};

//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};

//判断权重获得抽奖物品
var _weigh = function(secArr,returnObj,lvl){
    //获得随机区间的权重总数
    var weightNum = 0;      //权重总数
    var weight = 0;
    var weightIdArr = [];       //随机库id
    for (var i = secArr[0]; i <= secArr[1]; i++) {
        var lotteryData = c_lottery[i];
        if (!lotteryData) break;
        if (lvl < lotteryData.needLvl) continue;
        if (lvl >= lotteryData.surpassLvl && lotteryData.surpassLvl != 0) continue;
        weightNum = weightNum + lotteryData.rate;
        weightIdArr.push(i);
    }
    //随机物品以及对应数量
    var eventRandomNum = _getRandomNumber(1, weightNum);
    for (var i = 0; i < weightIdArr.length; i++) {
        var locWeightId = weightIdArr[i];
        var lotteryData = c_lottery[locWeightId];
        weight = weight + lotteryData.rate;
        if (weight >= eventRandomNum) {
            returnObj[lotteryData.itemId] = _getRandomNumber(lotteryData.minNum,lotteryData.maxNum);
            break;
        }
    }
}

//获取抽奖所得物品id  {"id":数量,"id":数量,...}
var _getLotteryObj = function(lvl,guildLvl) {
    var returnObj = {};
    //var pro1 = c_game.lotteryCfg[0];     //普通抽奖 库1概率
    var count = 1;     //普通抽奖所得数量
    for (var j = 0; j < count; j++) {
        //var randomNum = _getRandomNumber(1, 10000);
        //if (randomNum <= pro1) {}
        var secArr = [];
        if(guildLvl >= 5 && guildLvl< 15) secArr = c_game.guildAct[3].split(",");
        if(guildLvl >= 15 && guildLvl< 30) secArr = c_game.guildAct[4].split(",");
        if(guildLvl >= 30) secArr = c_game.guildAct[5].split(",");
        _weigh(secArr,returnObj,lvl);
    }
    return returnObj;
}

//计算会员等级
var _getRankFileLvl = function(guildAct){
    var returnLvl = 0;
    if(guildAct<c_lvl[1].rankFileNeedAct) return returnLvl;
    for(var i = 30;i>=1;i--){
        if(guildAct >= c_lvl[i].rankFileNeedAct){
            returnLvl = i;
            break;
        }
    }
    return returnLvl;
}

