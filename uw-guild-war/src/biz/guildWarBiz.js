/**
 * Created by Administrator on 2016/4/8.
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
var guildPersonalDao = require("uw-guild").guildPersonalDao;
var guildDao = require("uw-guild").guildDao;
var guildWarSignDao = require("../dao/guildWarSignDao.js");
var guildGroupDao = require("../dao/guildGroupDao.js");
var mainClient = require("uw-db").mainClient;
var project = require("uw-config").project;
var GuildWarSignEntity = require("uw-entity").GuildWarSignEntity;
var g_guildWar = require("uw-global").g_guildWar;
var g_gameConfig = require("uw-global").g_gameConfig;
var commonUtils = require("uw-utils").commonUtils;
var userDao = require("uw-user").userDao;
var userUtils = require("uw-user").userUtils;
var g_guild = require("uw-global").g_guild;
var g_data = require("uw-global").g_data;
var heroBiz = require("uw-hero").heroBiz;
var fightUtils = require("uw-utils").fightUtils;
var guildWarUtils = require("./guildWarUtils.js");
var async = require("async");
var ds = require("uw-ds").ds;
var formula = require("uw-formula");
var getMsg = require("uw-utils").msgFunc(__filename);
var t_otherBuff = require("uw-data").t_otherBuff;
var serverUtils = require("uw-utils").serverUtils;
var logger = require('uw-log').getLogger("uw-logger", __filename);
var iface = require("uw-data").iface;
var c_chatSys = require("uw-data").c_chatSys;

var exports = module.exports;

var guildGroupBiz = null;
var guildWarRecordBiz = null;
var mailBiz = null;
var mailDao = null;
var gameConfigDao = null;
var serverInfoBiz = null;
var serverInfoDao = null;
var chatBiz = null;
var syncGuildBiz = null;
var syncUserBiz = null;
var syncAttackRecordBiz = null;
var checkRequire = function(){
    guildGroupBiz = guildGroupBiz || require("./guildGroupBiz");
    guildWarRecordBiz = guildWarRecordBiz || require("./guildWarRecordBiz");
    mailBiz = require("uw-mail").mailBiz;
    mailDao = require("uw-mail").mailDao;
    gameConfigDao = require("uw-game-config").gameConfigDao;
    serverInfoBiz = require("uw-server-info").serverInfoBiz;
    serverInfoDao = require("uw-server-info").serverInfoDao;
    chatBiz = chatBiz || require("uw-chat").chatBiz;
    syncGuildBiz = syncGuildBiz || require("./syncGuildBiz");
    syncUserBiz = syncUserBiz || require("./syncUserBiz");
    syncAttackRecordBiz = syncAttackRecordBiz || require("./syncAttackRecordBiz");
};

//获取报名信息
exports.getSignUpData = function(client,userId,guildId,cb){
    async.parallel([
        function(cb1){
            guildWarRecordBiz.getLastRankData(client,cb1);
        },
        function(cb1){
            guildWarSignDao.select(mainClient,{serverId:project.serverId,guildId:guildId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var recordData = data[0];
        var guildWarSignData = data[1];

        var signData = new ds.SignData();
        if(guildWarSignData)
        signData.signGroupId = guildWarSignData.groupId;

        var lastGroupId = null;
        var lastGuildRank = null;
        var lastUserRank = null;
        var lastRankData = {};
        if(recordData){
            lastRankData = recordData.lastRankData||{};
            if(Object.keys(lastRankData).length>0){
                for(var key in lastRankData){
                    var locAllRankData = lastRankData[key]||{};
                    var locGuildArr = locAllRankData.guildArr||[];
                    var locUserArr = locAllRankData.userArr||[];
                    for(var i = 0;i<locGuildArr.length;i++){
                        var locGuildRank = locGuildArr[i];
                        if(!locGuildRank) continue;

                        if (locGuildRank.serverId != project.serverId) continue;

                        if(locGuildRank.guildId==guildId){
                            lastGroupId = key;
                            lastGuildRank = locGuildRank.rank;
                        }
                    }
                    for(var i = 0;i<locUserArr.length;i++){
                        var locUserRank = locUserArr[i];
                        if(!locUserRank) continue;

                        if (locUserRank.serverId != project.serverId) continue;

                        if(locUserRank.userId==userId){
                            lastGroupId = key;
                            lastUserRank = locUserRank.rank;
                        }
                    }
                }
            }else{
                signData.isPrize = 1;
            }
        }
        signData.lastGroupId = lastGroupId;
        signData.lastGuildRank = lastGuildRank;
        signData.lastUserRank = lastUserRank;
        cb(null,signData);
    })
};

//报名
exports.signUp = function(client, userId, groupId, cb){
    checkRequire();
    /*
     参数6：可报名时间星期
     参数7：可报名时间
     参数13：参加行会战行会最低等级要求
     参数14：参数行会战人数最低要求
     参数15：行会战开战星期
     */
    //判断报名时间
    var  gCfg = g_gameConfig.getData();

    if(gCfg.noSignServerArr&&gCfg.noSignServerArr.indexOf(parseInt(project.serverId) )>-1) return cb("敬请期待");

    //[开始月，开始日，开始时间，结束月，结束日，结束时间]
    //[开始月，开始日，开始时间，结束时间]
    var startTime = new Date();
    startTime.clearTime();
    startTime.setMonth(gCfg.guildWarSign[0]-1);
    startTime.setDate(gCfg.guildWarSign[1]);
    startTime.addHours(gCfg.guildWarSign[2]);

    var endTime = new Date();
    endTime.clearTime();
    endTime.setMonth(gCfg.guildWarSign[3]-1);
    endTime.setDate(gCfg.guildWarSign[4]);
    endTime.addHours(gCfg.guildWarSign[5]);


    if((new Date()).isBefore(startTime)||(new Date()).isAfter(endTime)){
        return cb(getMsg(c_msgCode.notReportTime));
    }

    //获取行会个人信息
    guildPersonalDao.select(client,{userId:userId},function(err,guildPersonalData){
        if(err) return cb(err);
        if(!guildPersonalData) return cb("还没有加入行会");
        if(!guildPersonalData.guildId) return cb("还没有加入行会");
        //判断是否会长，或者副会长
        if(guildPersonalData.position!=c_prop.guildPostKey.chairman&&guildPersonalData.position!=c_prop.guildPostKey.viceChairman) return cb(getMsg(c_msgCode.notGuildLeader));
        guildWarSignDao.select(mainClient,{serverId:project.serverId,guildId:guildPersonalData.guildId},function(err,guildWarSignData){
            if(err) return cb(err);
            if(guildWarSignData) return cb("行会已经报名!");
            guildDao.select(client,{id:guildPersonalData.guildId},function(err,guildData){
                if(err) return cb(err);
                //todo 临时去掉
                //判断行会等级
                //if(guildData.lvl < c_game.guildWar[12]) return cb("等级达不到条件");
                if(guildData.guildPopulation < c_game.guildWar[13]) return cb("行会人数至少要达到"+c_game.guildWar[13]+"人");
                    /*
                     参数8：青铜组行会战力范围要求
                     参数9：白银组行会战力范围要求
                     参数10：黄金组行会战力范围要求
                     参数11：白金组行会战力范围要求
                     参数12：钻石组行会战力范围要求
                     */
                    var curCombatCfg = [0,0];
                    switch (groupId){
                        case c_prop.guildGroupKey.diamond:
                            curCombatCfg = c_game.guildWar[11].split(",");
                            break;
                        case c_prop.guildGroupKey.wGold:
                            curCombatCfg = c_game.guildWar[10].split(",");
                            break;
                        case c_prop.guildGroupKey.hGold:
                            curCombatCfg = c_game.guildWar[9].split(",");
                            break;
                        case c_prop.guildGroupKey.silver:
                            curCombatCfg = c_game.guildWar[8].split(",");
                            break;
                        case c_prop.guildGroupKey.copper:
                            curCombatCfg = c_game.guildWar[7].split(",");
                            break;
                        default :
                            return cb("没有这个分组!");
                            break;
                    }

                    if (guildData.lvl < parseInt(curCombatCfg[0])  || guildData.lvl > parseInt(curCombatCfg[1])) return cb(getMsg(c_msgCode.fightNotRight));

                    var guildWarSignEntity = new GuildWarSignEntity();
                    /** 服务器id **/
                    guildWarSignEntity.serverId = project.serverId;/*服务器id*/
                    /** 行会id **/
                    guildWarSignEntity.guildId = guildPersonalData.guildId;/*行会id*/
                    /** 报名时间 **/
                    guildWarSignEntity.signTime = new Date();/*报名时间*/
                    /** 报名组别 **/
                    guildWarSignEntity.groupId = groupId;/*报名组别*/
                    /** 报名人id **/
                    guildWarSignEntity.signUserId = userId;/**/

                    guildWarSignDao.insert(mainClient,guildWarSignEntity,function(err,data) {
                        if (err) return cb(err);
                        cb(null,groupId);
                    });
            });
        });
    });
};


exports.getGuildList = function(client, userId,  cb){
    var myUserWar = g_guildWar.getMyObj().getGuildWarUser(userId);
    var guildWarData = g_guildWar.getMyObj().getGuildWarData(myUserWar.guildId);
    //没报名
    if(!guildWarData) return cb(null,[]);

    var allList = guildWarUtils.getALLGuildWarByGroupId(guildWarData.groupId);
    var reList = [];
    for(var i = 0;i<allList.length;i++){
        var locGuildData = allList[i];
        if(locGuildData.guildId == myUserWar.guildId&&locGuildData.serverId ==myUserWar.serverId ) continue;
        var d = new ds.GuildServer();
        d.serverName = locGuildData.serverName;//服务器名
        d.serverId = locGuildData.serverId;//服务器id
        d.guildId = locGuildData.guildId;//行会id
        d.guildName = locGuildData.guildName;//行会名
        d.guildLvl = locGuildData.guildLvl;//行会等级
        d.doorLives = locGuildData.doorLives;//守卫存活数
        d.points = locGuildData.points;//宝箱数量
        d.progress = parseInt(locGuildData.points/locGuildData.maxPoints*100);//进度，百分比
        d.maxPoints = locGuildData.maxPoints;//宝箱数量
        d.lastLootTime = locGuildData.lastLootTime;//最后掠夺时间
        reList.push(d);
    }
    cb(null,reList);
};

exports.initDoorData = function(client,cb){
    var groupWarGroupDic = g_guildWar.getMyObj().getGroupWarGroupDic();

    var warList = [];
    for(var key in groupWarGroupDic){
        var locGuildWarList = groupWarGroupDic[key]||[];
        warList = warList.concat(locGuildWarList);
    }

    async.mapLimit(warList,10,function(war,cb1){
        _initDoorData(client,war.guildId,cb1);
    },function(err,data){
        if(err) return cb(err);
        cb(null);
    });
};

//获取行会战攻击数据
exports.getWarAttackData = function(client, userId, serverId, guildId, cb){
   var guildWarData = g_guildWar.getObj(serverId).getGuildWarData(guildId);
    if(!guildWarData) return cb("没有该行会数据!");
    var gw = new ds.GuildWarData();
    gw.doorList = [];//公会门信息
    gw.guildId = guildId;//行会id
    gw.guildName = guildWarData.guildName;//行会名
    gw.serverId = guildWarData.serverId;//行会id

    for(var key in guildWarData.doorData){
        var locDoorData = guildWarData.doorData[key];
        gw.doorList.push(locDoorData);
    }
    cb(null,gw);
};

//获取战斗防守数据
exports.getWarDefenceData = function(client,userId,cb){
    var myUserWar = g_guildWar.getMyObj().getGuildWarUser(userId);
    var guildWarData = g_guildWar.getMyObj().getGuildWarData(myUserWar.guildId);
    var gw = new ds.GuildWarData();
    gw.doorList = [];//公会门信息
    gw.guildId = myUserWar.guildId;//行会id
    gw.guildName = guildWarData.guildName;//行会名

    for(var key in guildWarData.doorData){
        var locDoorData = guildWarData.doorData[key];
        gw.doorList.push(locDoorData);
    }
    cb(null,gw);
};

//获取战斗防守数据
exports.fightStartDoor = function(client,userId, serverId, guildId, door,cb){
    if(!g_guildWar.isOpen()) return cb("行会战已经结束!");
    async.parallel([
        function (cb1) {
            cb1(null,g_guildWar.getObj(serverId).getGuildWarData(guildId));
        },
        function(cb1){
            if(serverId==project.serverId){
                cb1(null,client);
            }else{
                serverInfoBiz.getServerClient(serverId, cb1);
            }
        }
    ], function (err, data) {
        if (err) return cb(err);
        var eGuildWarData = data[0];
        var sClient = data[1];
        if(!eGuildWarData) return cb("没有该行会数据!");
        var eDoorData = eGuildWarData.doorData[door];
        var myWarUser = g_guildWar.getMyObj().getGuildWarUser(userId);
        var myGuildWarData = g_guildWar.getMyObj().getGuildWarData(myWarUser.guildId);
        var reGuildFightData = new ds.GuildFightData();
        //判断己方是否出局
        if(myGuildWarData.doorLives <=0) return cb(getMsg(c_msgCode.noSnatch));

        //判断改门是否被击破
        if(eDoorData.isBreak){
            reGuildFightData.isBreak = 1;
            return cb(null,reGuildFightData);
        }

        //判断是否在守门
        if(guildWarUtils.isInDefence(userId,myGuildWarData)) return cb("防守中，请先进行下阵!");
        //cd
        //参数5：攻打CD（秒）
        var reCd = guildWarUtils.getFightReCd(myWarUser.nextFightTime);
        //todo 临时去掉cd
        if(reCd>0) return cb("cd中.....");
        myWarUser.nextFightTime = (new Date()).addSeconds(c_game.guildWar[4]);

        //己方攻打
        // [玩家名，服务器名,行会名，门]
        g_guildWar.getMyObj().pushFightRecord(1,myWarUser.guildId,[myWarUser.userName,eGuildWarData.serverName,eGuildWarData.guildName,door]);
        //被打
        //[门，服务器名,行会名,玩家名]
        var beData = [door, myGuildWarData.serverName,myWarUser.guildName,myWarUser.userName];
        if(serverId==project.serverId){
            g_guildWar.getMyObj().pushFightRecord(2,eGuildWarData.guildId,beData);
        }else{
            _requestPushBeFightRecord(guildId,beData,eGuildWarData.serverHost,eGuildWarData.serverPort,function(){});
        }

        var updateMyGuildWarDta = {
            nextFightTime:myWarUser.nextFightTime
        };

        reGuildFightData.myGuildWarData = updateMyGuildWarDta;
        //判断是否存在守门人，如果不存在，则认为直接胜利
        var doorUserId = guildWarUtils.getDoorDataUserId(eDoorData);
        if(!doorUserId){
            var reAttackData = [userId,myWarUser.userName,myGuildWarData.serverId,myGuildWarData.serverName,myGuildWarData.guildName,1];
            var reDefenceData = [guildId,door,eDoorData.userName];
            var isLocalServer = serverId==project.serverId;
            _requestLoot(client,reAttackData,1,reDefenceData,eGuildWarData.serverHost,eGuildWarData.serverPort,isLocalServer,function(err,data){
                if(err) return cb("跨服数据失败！");
                // [状态(0:正常，1：已经提前被击破)，得到的积分,是否刚好击破]
                var lootStatus = data[0];
                var lootPoints = data[1];
                var isNowBreak = data[2];
                if(lootStatus==1){
                    reGuildFightData.isBreak = 1;
                    cb(null,reGuildFightData);
                }else{
                    reGuildFightData.directWin = 1;
                    reGuildFightData.getPoints = lootPoints;
                    //得到积分
                    //参数3：战胜守卫获得积分
                    //参数4：战败守卫获得积分
                    myGuildWarData.points+=lootPoints;
                    myGuildWarData.lastLootTime = Date.now();
                    myWarUser.points+=lootPoints;
                    myWarUser.lastLootTime = Date.now();
                    cb(null,reGuildFightData);
                }
            });
            return;
        }
        //设置对手
        g_data.setPkEnemyId(userId, ""+serverId+guildId+door);
        g_data.setGuildWarUserId(userId,doorUserId);

        userDao.selectCols(sClient, "id,robotId,lvl,equipBag,nickName,isKing,rebirthLvl,medalData,medalTitle,propertyData", " id=? ", [doorUserId], function (err, eUserData) {
            if (err) return cb(err);
            async.parallel([
                function (cb1) {
                    heroBiz.getPkList(sClient, eUserData, cb1);
                }
            ], function (err, data) {
                if (err) return cb(err);
                var heroPkDataList = data[0];
                reGuildFightData.heroList = heroPkDataList[0];
                reGuildFightData.otherDataList = heroPkDataList[1]; //[[衣服显示id,武器显示id,翅膀显示id],..]
                reGuildFightData.fightData = heroPkDataList[2];//["敌方用户等级"]

                myWarUser.inspireEndTime = new Date(myWarUser.inspireEndTime);
                //计算属性
                if(myWarUser.inspireEndTime.isAfter(new Date())){
                    guildWarUtils.calHeroProp(reGuildFightData.heroList);
                }
                cb(null, reGuildFightData);
            });
        });

    });
};



//获取战斗防守数据
exports.fightEndDoor = function(client,userId,serverId, guildId, door, isWin, cb){
    isWin = isWin ? 1:0;
    var myWarUser = g_guildWar.getMyObj().getGuildWarUser(userId);
    var myGuildWarData = g_guildWar.getMyObj().getGuildWarData(myWarUser.guildId);
    var eGuildWarData = g_guildWar.getObj(serverId).getGuildWarData(guildId);

    var eUserId = g_data.getGuildWarUserId(userId);
    if (!eUserId) return cb("无效的挑战对手");

    var curEnemyId = g_data.getPkEnemyId(userId);
    if (curEnemyId != (""+serverId+guildId+door)) return cb("无效的挑战对手");
    g_data.setPkEnemyId(userId, -111);

    async.parallel([
        function (cb1) {
            userDao.selectCols(client, "id,lvl,nickName,gold,counts,countsRefreshTime,combat,iconId,coffersPoints,todayCoffersPoints,bag,coffersKillNum", "id = ?", [userId], cb1);
        },
        function(cb1){
            if(serverId==project.serverId){
                cb1(null,client);
            }else{
                serverInfoBiz.getServerClient(serverId, cb1);
            }
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0];
        var sClient = data[1];

        userDao.selectCols(sClient, "id,robotId,lvl,equipBag,nickName,isKing,combat,iconId", " id=? ", [eUserId], function (err, eUserData) {
            if (err) return cb(err);
            //校验一下战斗力
            isWin = fightUtils.checkIsWinByCombat(isWin,userData.lvl,userData.combat,eUserData.combat);

            //{attackData:"[攻击玩家id,攻击玩家名，服务器id,服务器名称]",isWin:"是否胜利",defenceData:"[行会id,攻击哪个门,防守者名字]"}
            var reAttackData = [userId,userData.nickName,myGuildWarData.serverId,myGuildWarData.serverName,myGuildWarData.guildName,0];
            var reDefenceData = [guildId,door,eUserData.nickName];
            var isLocalServer = serverId==project.serverId;

            var f = new ds.FightResult();
            f.winStatus = isWin?consts.winStatus.win:consts.winStatus.lose;//1：胜利，2：失败
            f.attackMember = [userData.nickName,userData.combat,userData.iconId,myGuildWarData.serverName,myGuildWarData.guildName];//攻击方信息 [名字,战力,头像id,服务器名，行会名]
            f.beAttackMember = [eUserData.nickName,eUserData.combat,eUserData.iconId,eGuildWarData.serverName,eGuildWarData.guildName];//被攻击方信息 [名字,战力,头像id,服务器名，行会名]

            f.guildWarPoints = 0;
            //活动结束
            if(!g_guildWar.isOpen()){
                f.guildWarStatus = 2;
                return cb(null,f);
            }
            //预防别的服挂掉了，或者重启,跨服数据失败
            if(!eGuildWarData) {
                f.guildWarStatus = 3;
                myWarUser.nextFightTime =  (new Date()).addHours(-1);
                return cb(null,f);
            }
            _requestLoot(client,reAttackData,isWin,reDefenceData,eGuildWarData.serverHost,eGuildWarData.serverPort,isLocalServer,function(err,data){
                //跨服数据失败
                if (err) {
                    f.guildWarStatus = 3;
                    myWarUser.nextFightTime =  (new Date()).addHours(-1);
                    return cb(null,f);
                }

                // [状态(0:正常，1：已经提前被击破)，得到的积分,是否刚好击破]
                var lootStatus = data[0];
                var lootPoints = data[1];
                var isNowBreak = data[2];

                //如果已经被击破，无积分，CD清0
                if(lootStatus==1){
                    myWarUser.nextFightTime = (new Date()).addHours(-1);
                    f.guildWarPoints = 0;
                    f.coffersStatus = 1;
                    return cb(null,f);
                }
                f.coffersStatus = 0;

                //得到积分
                //参数3：战胜守卫获得积分
                //参数4：战败守卫获得积分
                myGuildWarData.points+=lootPoints;
                myGuildWarData.lastLootTime = Date.now();
                myWarUser.points+=lootPoints;
                myWarUser.lastLootTime = Date.now();

                f.guildWarPoints = lootPoints;//个人收益增加

                //战况
                if(isWin){
                    var aData = new ds.GuildWarAttackRecord();
                    aData.aServerId = project.serverId;//攻击者服务器id
                    aData.aServerName = myGuildWarData.serverName;//攻击者服务器名
                    aData.aUserName = myWarUser.userName;//攻击者名称
                    aData.aGuildName = myGuildWarData.guildName;//攻击者行会
                    aData.dServerId = eGuildWarData.serverId;//防守者服务器id
                    aData.dServerName = eGuildWarData.serverName;//防守者服务器名
                    aData.dUserName = eUserData.nickName;//防守者名称
                    aData.dGuildName = eGuildWarData.guildName;//防守者行会
                    aData.isBreak = isNowBreak;//是否击破
                    aData.door = door;//门
                    aData.time = new Date();//时间

                    _addAttackRecord(myGuildWarData.groupId,aData);
                }
                cb(null,f);
            });
        });
    });
};

exports.pushBeFightRecord = function(client,eGuildId,data,cb){
    //[门，服务器名,行会名,玩家名]
    g_guildWar.getMyObj().pushFightRecord(2,eGuildId,data);
    cb(null);
};

/**
 * 掠夺
 * @param client
 * @param attackUserId
 * @param attackUserName
 * @param attackServerId
 * @param attackServerName
 * @param attackGuildName
 * @param attackIsDirect
 * @param isWin
 * @param guildId
 * @param door
 * @param defenceUserName
 * @param cb
 * @returns [状态(0:正常，1：已经提前被击破)，得到的积分,是否刚好击破]
 */
exports.lootDefense = function(client, attackUserId, attackUserName, attackServerId, attackServerName,attackGuildName,attackIsDirect, isWin,  guildId, door, defenceUserName,cb){
    var defenceGuildWarData = g_guildWar.getMyObj().getGuildWarData(guildId);
    var defenceDoorData = defenceGuildWarData.doorData[door];
    var status = 0;
    var getPoints = 0;
    var isNowBreak = 0;
    //是否被击破
    if(defenceDoorData.hp<=0){
        status = 1;
        return cb(null,[status,getPoints,isNowBreak]);
    }

    getPoints = isWin?c_game.guildWar[2]:c_game.guildWar[3];
    if(getPoints>defenceDoorData.hp) getPoints = defenceDoorData.hp;

    defenceDoorData.hp -= getPoints;
    defenceGuildWarData.points -=getPoints;

    if(defenceDoorData.hp<=0){
        defenceDoorData.isBreak = 1;
        //下阵
        defenceDoorData.userId = null;//守门人id
        defenceDoorData.userName = null;//守门人名字
        defenceDoorData.userIcon = null;//守门人头像

        defenceGuildWarData.doorLives --;
        isNowBreak = 1;
    }

    //防守记录
    var dData = new ds.GuildWarDefenceRecord();
    dData.isWin = isWin;//是否胜利
    dData.time = new Date();//时间
    dData.door = door;//门
    dData.attackServerId = attackServerId;//攻击者服务器id
    dData.attackServerName = attackServerName;//攻击者服务器名
    dData.attackUserName = attackUserName;//攻击者名称
    dData.attackGuildName = attackGuildName;//攻击者行会
    dData.defenceUserName = defenceUserName;//防守者名称
    dData.hp = getPoints;//损失血量
    dData.isDirect = attackIsDirect;
    _addDefenceRecord(guildId,dData);

    cb(null,[status,getPoints,isNowBreak]);
};

var _calGetPoints = function(myGuildWarData,myWarUser,eGuildWarData,door,getPoints){
    var eDoorData = eGuildWarData.doorData[door];
    myGuildWarData.points+=getPoints;
    myGuildWarData.lastLootTime = Date.now();
    myWarUser.points+=getPoints;
    myWarUser.lastLootTime = Date.now();
    //扣除积分.门口血量
    eDoorData.hp -= getPoints;
    eGuildWarData.points -=getPoints;

    if(eDoorData.hp<=0){
        eDoorData.isBreak = 1;
        eGuildWarData.doorLives --;
    }
};

//获取战况
exports.getAttackRecordList = function(client,userId,cb){
    var warUser = g_guildWar.getMyObj().getGuildWarUser(userId);
    var guildWarData = g_guildWar.getMyObj().getGuildWarData(warUser.guildId);

    var objList = g_guildWar.getAllObj();
    var recordList = [];
    for(var i = 0;i<objList.length;i++){
        var locObj = objList[i];
        var locList = locObj.getGuildWarAttackRecordArr(guildWarData.groupId);
        recordList = recordList.concat(locList);
    }

    return cb(null,recordList);
};

//获取防守记录
exports.getDefenceRecordList = function(client,userId,cb){
    var warUser = g_guildWar.getMyObj().getGuildWarUser(userId);
    var recordList = g_guildWar.getMyObj().getGuildWarDefenceRecordArr(warUser.guildId);
    return cb(null,recordList);
};


/**
 * 上阵
 * @param client
 * @param userId
 * @param door
 * @param cb
 * @returns
 */
exports.upDoor = function(client,userId,door,cb){
    if(!g_guildWar.isOpen()) return cb("行会战已经结束!");
    userDao.selectCols(client,"id,nickName,iconId,vip"," id = ?",[userId],function(err,userData){
        if(err) return cb(err);
        var warUser = g_guildWar.getMyObj().getGuildWarUser(userId);
        var guildId = warUser.guildId;
        var guildWarData = g_guildWar.getMyObj().getGuildWarData(guildId);
        if(warUser.nextUpTime&&(new Date()).isBefore(warUser.nextUpTime)) return cb(getMsg(c_msgCode.defendCD));
        if(guildWarUtils.isInDefence(userId,guildWarData)) return cb("你已经处于防守状态");
        var locDoorData = guildWarData.doorData[door];
        if(locDoorData.userId) return cb(null,1);
        //判断是否被击破
        if(locDoorData.isBreak) return cb("已经被击破，无法上阵！");
        locDoorData.userId = userId;//守门人id
        locDoorData.userName = userData.nickName;//守门人名字
        locDoorData.userIcon = userData.iconId;//守门人头像

        guildWarData.refreshId++;
        cb(null,0);
    });
};

//下阵
exports.downDoor = function(client,userId,door, cb){
    if(!g_guildWar.isOpen()) return cb("行会战已经结束!");
    var warUser = g_guildWar.getMyObj().getGuildWarUser(userId);
    var guildId = warUser.guildId;
    var guildWarData = g_guildWar.getMyObj().getGuildWarData(guildId);
    var locDoorData = guildWarData.doorData[door];
    //不是会长
    if(warUser.guildPosition !=c_prop.guildPostKey.chairman){
        if(locDoorData.userId!=userId){
            return cb(null);
        }
    }

    if(locDoorData.userId==userId){
        warUser.nextUpTime = (new Date()).addSeconds(5);
    }

    locDoorData.lastUserId = locDoorData.userId;//守门人id
    locDoorData.lastUserName = locDoorData.userName;//守门人名字
    locDoorData.lastUserIcon = locDoorData.userIcon;//守门人头像
    locDoorData.userId = null;//守门人id
    locDoorData.userName = null;//守门人名字
    locDoorData.userIcon = null;//守门人头像
    locDoorData.lastDownTime = new Date();

    guildWarData.refreshId++;
    if(guildWarData.refreshId>100) guildWarData.refreshId = 1;
    cb(null);
};

//进入行会战系统
exports.enter = function(client,userId,cb){
    if(!g_guildWar.isOpen()) return cb("行会战没有开启或者已经结束!");
    var guildId = g_data.getGuildId(userId);
    if(!guildId) return cb("没有加入任何行会");
    var guildWarData = g_guildWar.getMyObj().getGuildWarData(guildId);
    if(!guildWarData) return cb("没有报名行会战");
    if(g_guildWar.getMyObj().hasGuildWarUser(userId)){
        var warUser = g_guildWar.getMyObj().getGuildWarUser(userId);
        //这里主要是预防从备份数据中取出来，时间格式不对
        if(warUser.nextFightTime) warUser.nextFightTime = new Date( warUser.nextFightTime);//下一次可以战斗的时间
        if(warUser.inspireEndTime) warUser.inspireEndTime = new Date( warUser.inspireEndTime);//鼓舞结束时间
        if(warUser.nextUpTime) warUser.nextUpTime = new Date( warUser.nextUpTime);//下一次上阵时间
        return cb(null);
    }

    async.parallel([
        function(cb1){
            userDao.selectCols(client,"id,nickName,iconId,vip,combat"," id = ?",[userId],cb1);
        },
        function(cb1){
            guildPersonalDao.selectCols(client,"id,position"," userId = ?",[userId],cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0];
        var guildPersonalData = data[1];
        var warUser = g_guildWar.getMyObj().newGuildWarUser(userId);
        warUser.userName = userData.nickName;
        warUser.guildId = guildId;
        warUser.guildName = guildWarData.guildName;
        warUser.points = 0;//个人积分
        warUser.vip = userData.vip;//vip
        warUser.iconId = userData.iconId;//用户头像
        warUser.groupId = guildWarData.groupId;//用户头像
        warUser.nextFightTime = new Date();
        warUser.inspireEndTime  = new Date();
        warUser.guildPosition = guildPersonalData.position;
        warUser.serverId = project.serverId;
        warUser.combat = userData.combat;
        g_guildWar.getMyObj().pushWarUserGroup(guildWarData.groupId,warUser);
        cb(null);

    });
};

//进入100条数据，主要用于压测
exports.enter100User = function(client,cb){
    checkRequire();
    //每个行会10个玩家
    var guildWar = g_guildWar.getMyObj().getGuildWarDic();
    var guildIds = [];
    for(var key in guildWar){
        var locGuildData = guildWar[key];
        guildIds.push(locGuildData.guildId);
    }
    if(guildIds.length<=0) return cb(null);
    var addNum = 0;
    async.map(guildIds,function(locGuildId,cb1){
        guildPersonalDao.listCols(client,"id,userId"," guildId  = ? limit 0,10",[locGuildId],function(err,personList){
            if(err) return cb1(err);
            async.map(personList,function(locPerson,cb2){
                g_data.setGuildId(locPerson.userId,locGuildId);
                addNum++;
                exports.enter(client,locPerson.userId,cb2);
            },cb1);
        });
    },function(err,data){
        if(err)  return cb(err);
        cb(null,addNum);
    });
};

exports.getGuildWarAllRank = function(client,userId,cb){
    var warUser = g_guildWar.getMyObj().getGuildWarUser(userId);
    var guildWar = g_guildWar.getMyObj().getGuildWarData(warUser.guildId);
    _getGroupRankData(client,guildWar.groupId,function(err,data){
        if(err) return cb(err);
        //会长和个人只返回前10名
        var reChairArr = [];
        var reUserArr = [];
        for(var i=0;i<10;i++){
            var locChairRank = data.chairArr[i];
            if(locChairRank) reChairArr.push(locChairRank);
            var loUserRank = data.userArr[i];
            if(loUserRank) reUserArr.push(loUserRank);
        }
        data.chairArr = reChairArr;
        data.userArr = reUserArr;
        cb(null,data);
    });
};

exports.getLastRankList = function(client,groupId,cb){
    checkRequire();
    guildWarRecordBiz.getLastRankData(client,function(err,recorData){
        if(err) return cb(err);
        var lastRankData = null;
        if(recorData) lastRankData = recorData.lastRankData;
        if(!lastRankData||!lastRankData[groupId]){
            var allRank = new ds.GuildWarAllRank();
            allRank.guildArr = [];//行会排行
            allRank.chairArr = [];//会长排行
            allRank.userArr = [];//个人排行
            return cb(null,allRank);
        }
        return cb(null,lastRankData[groupId]);
    });
};


exports.checkOpen = function(client,cb){
    checkRequire();
    //判断报名时间
    //[开始月，开始日，开始时间，结束时间]
    var startTime = guildWarUtils.getOpenStartTime();
    var endTime = guildWarUtils.getOpenEndTime();
    var mainWarData = g_guildWar.getMainWarData();
    //提前消息
    //15,10,5,1 写死吧。。

    var tempArr = c_chatSys[81].arg;
    var diffMinutes = (new Date()).getMinutesBetween(startTime);
    if(diffMinutes>0){
        for(var i = 0;i<tempArr.length;i++){
            var locM = tempArr[i];
            if(mainWarData.msgTimeArr.indexOf(locM)>-1) continue;
            if(diffMinutes<=locM){
                mainWarData.msgTimeArr.push(locM);
                chatBiz.addSysData(81,[locM]);
                chatBiz.addSysData(82,[locM]);
                _clearAllSync();
                break;
            }
        }
    }

    if((new Date()).isBefore(startTime)||(new Date()).isAfter(endTime)){
        return cb(null);
    }


    if(mainWarData.endTime){
        if((new Date()).isBefore(mainWarData.endTime.clone().addMinutes(10))) return;
    }
    if(g_guildWar.isStarting()) return cb(null);
    if(g_guildWar.isOpen()) return cb(null);
    _open(client,cb);
};

var _open = function(client,cb){
    checkRequire();
    //return cb(null);
    if(g_guildWar.isOpen()) return cb(null);
    if(g_guildWar.isStarting()) return cb(null);
    g_guildWar.setIsStarting(1);
    _clearAllSync();
    //清除排行
    guildGroupDao.update(mainClient,{lastRankData:null,lastRankTime:null},function(){});
    //清除数据
    g_guildWar.clear();
    setTimeout(function(){
        guildGroupBiz.init(client,function(err,data){
            g_guildWar.setIsStarting(0);
            if(err) return cb(err);

            var endTime = guildWarUtils.getOpenEndTime();
            var overReSeconds = (new Date()).getSecondsBetween(endTime);
            //overReSeconds = 1*60;
            endTime = (new Date()).addSeconds(overReSeconds);
            setTimeout(function(){
                _over(client);
            }, overReSeconds * 1000);
            g_guildWar.open();
            g_guildWar.setIsSync(1);
            var mainWarData = g_guildWar.getMainWarData();
            mainWarData.startTime = new Date();//开始时间
            mainWarData.endTime  = endTime; //结束时间

            chatBiz.addSysData(83,[]);
            chatBiz.addSysData(84,[]);
            cb(null);
        });
    },3000);
};

//活动结束
var _over = function(client,cb){
    checkRequire();
    g_guildWar.over();
    var awardSeconds = 60 + (0| Math.random()*60);
    //保存上次排行数据
    setTimeout(function(){
        setTimeout(function(){
            g_guildWar.setIsSync(0);
        },10*60*1000);
        setTimeout(function(){
            _clearAllSync();
            g_guildWar.resetServerData();
        },15*60*1000);
        _saveRankData(client,function(err,data){
            if(err){
                logger.error("行会战保存排行异常");
                logger.error(err);
            }
        });

        //活动结束
        _sendRankAward(client,function(err,data){
            if(err){
                logger.error("行会战奖励发奖失败!");
                logger.error(err);
            }
        });

    },awardSeconds*1000);

    guildWarSignDao.clear(mainClient,function(){});
};

var _saveRankData = function(client,cb){
    //行会
    //会长
    //个人
    async.parallel([
        function(cb1){
            _getGroupRankData(client,1,cb1);
        },
        function(cb1){
            _getGroupRankData(client,2,cb1);
        },
        function(cb1){
            _getGroupRankData(client,3,cb1);
        },
        function(cb1){
            _getGroupRankData(client,4,cb1);
        },
        function(cb1){
            _getGroupRankData(client,5,cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var saveData = {};
        saveData[1] = data[0];
        saveData[2] = data[1];
        saveData[3] = data[2];
        saveData[4] = data[3];
        saveData[5] = data[4];
        guildWarRecordBiz.saveLastRankData(client,saveData,cb);
    });
};

var _getGroupRankData = function(client,groupId,cb){
    //行会
    //会长
    //个人
    async.parallel([
        function(cb1){
            _getPointsRankList(client,groupId,cb1);
        },
        function(cb1){
            _getChairRankList(client,groupId,cb1);
        },
        function(cb1){
            _getUserRankList(client,groupId,cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var allRank = new ds.GuildWarAllRank();
        allRank.guildArr = data[0];//行会排行
        allRank.chairArr = data[1];//会长排行
        allRank.userArr = data[2];//个人排行
        cb(null,allRank);
    });
};

var _sendRankAward = function(client, cb){
        var groupIdArr = [1,2,3,4,5];

        //行会奖励
        async.mapLimit(groupIdArr,1,function(groupId,cb1){
            //行会
            _getGroupRankData(client,groupId,function(err){
                _sendGroupRankAward(client, groupId, cb1);
            });
        },function(err,data){
            cb(err,data);
        });

};

var _sendGroupRankAward = function (client, locGroupId, cb) {
    var insertList = [];
    //第一个%s：玩家行会所报名的组别；
    //第二个%s：玩家行会所取得的排名；
    var guildWarList = g_guildWar.getMyObj().getGuildWarDataByGroupId(locGroupId);
    //行会奖励
    async.mapLimit(guildWarList, 2, function (loc1GuildWar, cb1) {
        //行会
        _awardGuildMembers(client, loc1GuildWar.guildId, loc1GuildWar.groupId, loc1GuildWar.rank, function(err){
            if (err) {
                logger.error("行会战行会奖励发奖失败!");
                logger.error(err);
            }
            cb1();
        });
    }, function (err, data) {
        if (err) {
            logger.error("行会战行会奖励发奖失败!");
            logger.error(err);
        }
    });

    //发前10
    for (var j = 0; j < guildWarList.length; j++) {
        var locGuildWar = guildWarList[j];
        if(locGuildWar.rank>10) continue;
        //会长
        var locChairItems = guildWarUtils.getAwardItems(locGroupId, locGuildWar.rank, 2);
        if (!locChairItems) continue;
        var chairmanData = locGuildWar.chairmanData||[];
        var locChairId = chairmanData[0];
        var locMail = mailBiz.createEntityByType(locChairId, c_prop.mailTypeKey.guildWarRank2, [c_prop.guildGroup[locGroupId], locGuildWar.rank], locChairItems);
        insertList.push(locMail);
    }

    var userWarList = g_guildWar.getMyObj().getWarUserArrByGroupId(locGroupId);
    //发前10
    for (var j = 0; j < userWarList.length; j++) {
        var locUserWar = userWarList[j];
        if(locUserWar.rank>10) continue;
        var locUserWarItems = guildWarUtils.getAwardItems(locGroupId, locUserWar.rank, 3);
        if (!locUserWarItems) continue;
        //第一个%s：玩家行会所报名的组别；
        //第二个%s：玩家行会所取得的排名；
        var locMail = mailBiz.createEntityByType(locUserWar.userId, c_prop.mailTypeKey.guildWarRank3, [c_prop.guildGroup[locGroupId], locUserWar.rank], locUserWarItems);
        insertList.push(locMail);
    }
    if (insertList.length <= 0) return cb(null);
    mailDao.insertList(client, insertList, function (err, data) {
        if (err) return cb(err);
        cb(null);
    });
};

var _awardGuildMembers = function(client,guildId,groupId,rank,cb){
    var locGuildWarItems = guildWarUtils.getAwardItems(groupId,rank,1);
    guildPersonalDao.listCols(client,"userId"," guildId = ? ",[guildId],function(err,personList){
        if(err) cb(err);
        var insertList = [];
        for(var i = 0;i<personList.length;i++){
            var locPerson = personList[i];
            if(!g_guildWar.getMyObj().hasGuildWarUser(locPerson.userId)) continue;
            var locMail = mailBiz.createEntityByType(locPerson.userId, c_prop.mailTypeKey.guildWarRank1, [c_prop.guildGroup[groupId],rank], locGuildWarItems);
            insertList.push(locMail);
        }
        if(insertList.length<=0) return cb(null);
        mailDao.insertList(client, insertList, function (err, data) {
            if (err) return cb(err);
            cb(null);
        });
    });
};

var _getPointsRankList = function(client,groupId,cb){
    var guildWarList = guildWarUtils.getALLGuildWarByGroupId(groupId);
    guildWarUtils.sortGuildWarRankList(guildWarList);
    //排序
    var rankList = [];
    for(var i = 0;i<guildWarList.length;i++){
        var locWar = guildWarList[i];
        var d = new ds.GuildWarRank();
        d.rank = locWar.rank;//排名
        d.guildId = locWar.guildId;//行会id
        d.guildName = locWar.guildName;//行会名称
        d.points = locWar.points;//积分
        d.serverId = locWar.serverId;//服务器id
        rankList.push(d);
    }
    cb(null,rankList);
};

//获取会长排名
var _getChairRankList = function(client,groupId,cb){
    var guildWarList = guildWarUtils.getALLGuildWarByGroupId(groupId);
    guildWarUtils.sortGuildWarRankList(guildWarList);
    var rankList = [];
    for(var i = 0;i<guildWarList.length;i++){
        var locWar = guildWarList[i];
        var d = new ds.GuildWarUserRank();
        var chairmanData = locWar.chairmanData;////会长数据 [会长id,会长名称，会长vip,会长头像]
        d.rank = locWar.rank;//排名
        d.userId = chairmanData[0];//玩家id
        d.userName = chairmanData[1];//玩家名
        d.vip = chairmanData[2];//玩家vip
        d.iconId = chairmanData[3];//玩家头像
        d.guildName = locWar.guildName;//行会名
        d.points = locWar.points;//行会点数
        d.serverId = locWar.serverId;//服务器id
        rankList.push(d);
    }
    cb(null,rankList);
};

//获取个人排名
var _getUserRankList = function(client,groupId,cb){
    var userWarList = guildWarUtils.getALLUserWarByGroupId(groupId);
    guildWarUtils.sortUserRankList(userWarList);
    var rankList = [];
    for(var i = 0;i<userWarList.length;i++){
        var locUserWar = userWarList[i];
        var d = new ds.GuildWarUserRank();
        d.rank = locUserWar.rank;//排名
        d.userId = locUserWar.userId;//玩家id
        d.userName = locUserWar.userName;//玩家名
        d.vip = locUserWar.vip;//玩家vip
        d.iconId = locUserWar.iconId;//玩家头像
        d.guildName = locUserWar.guildName;//行会名
        d.points = locUserWar.points;//行会点数
        d.serverId = locUserWar.serverId;//服务器id
        rankList.push(d);
    }
    cb(null,rankList);
};

//清除cd
exports.clearCd = function(client, userId, cb){
    userDao.selectCols(client, "id,diamond,buyDiamond,giveDiamond,counts,countsRefreshTime", "id = ?", [userId], function (err, userData) {
        if (err) return cb(err);
        var todatCount = userUtils.getTodayCount(userData,c_prop.userRefreshCountKey.clearGuildWarCount);
        var costDiamond = formula.calClearGuildWarCd(todatCount+1);
        if (userData.diamond < costDiamond) {
            return cb(getMsg(c_msgCode.noDiamond));
        }

        userUtils.addTodayCount(userData,c_prop.userRefreshCountKey.clearGuildWarCount,1);
        userUtils.reduceDiamond(userData, costDiamond);

        var myWarUser = g_guildWar.getMyObj().getGuildWarUser(userId);
        myWarUser.nextFightTime  = (new Date()).addHours(-1);//设置为很久之前

        var updateUser = {
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            counts: userData.counts,
            countsRefreshTime: userData.countsRefreshTime
        };
        var updateMyGuildWarData = {
            nextFightTime:myWarUser.nextFightTime
        };

        userDao.update(client, updateUser, {id: userId}, function () {
            if (err) return cb(err);
            cb(null, [updateUser,costDiamond,updateMyGuildWarData]);
        });
    });
};

//鼓舞
exports.inspire = function(client, userId, cb){
    if(!g_guildWar.isOpen()) return cb("行会战已经结束!");
    userDao.selectCols(client, "id,diamond,buyDiamond,giveDiamond,counts,countsRefreshTime", "id = ?", [userId], function (err, userData) {
        if (err) return cb(err);
        var myWarUser = g_guildWar.getMyObj().getGuildWarUser(userId);
        var myGuildWar = g_guildWar.getMyObj().getGuildWarData(myWarUser.guildId);
        //如果己方被击破，无法鼓舞
        if(myGuildWar.doorLives<=0) return cb(getMsg(c_msgCode.noInspire));
        var todatCount = userUtils.getTodayCount(userData,c_prop.userRefreshCountKey.inspireGuildWar);
        var costDiamond = formula.calInspireGuildWar(todatCount+1);
        if (userData.diamond < costDiamond) {
            return cb(getMsg(c_msgCode.noDiamond));
        }

        userUtils.addTodayCount(userData,c_prop.userRefreshCountKey.inspireGuildWar,1);
        userUtils.reduceDiamond(userData, costDiamond);


        myWarUser.inspireEndTime = new Date(myWarUser.inspireEndTime);
        if(myWarUser.inspireEndTime.isBefore(new Date())) myWarUser.inspireEndTime  = new Date();

        //鼓舞时间
        var conTime = t_otherBuff[c_prop.otherBuffIdKey.inspireGuildWar].conTime;
        myWarUser.inspireEndTime.addSeconds(conTime);

        var updateUser = {
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            counts: userData.counts,
            countsRefreshTime: userData.countsRefreshTime
        };
        var updateMyGuildWarData = {
            inspireEndTime:myWarUser.inspireEndTime
        };
        userDao.update(client, updateUser, {id: userId}, function () {
            if (err) return cb(err);
            cb(null, [updateUser,costDiamond,updateMyGuildWarData]);
        });
    });
};


exports.getInfo = function(client, userId, cb){
    var warUser = g_guildWar.getMyObj().getGuildWarUser(userId);
    var guildWar = g_guildWar.getMyObj().getGuildWarData(warUser.guildId);

    var guildList = guildWarUtils.getALLGuildWarByGroupId(guildWar.groupId);
    guildWarUtils.sortGuildWarRankList(guildList);
    guildWarUtils.calGuildRank(guildList);

    var mainWarData = g_guildWar.getMainWarData();

    var d = new ds.MyGuildWarData();
    d.groupId = guildWar.groupId;//组别
    d.guildReNum = guildWarUtils.getLiveGuildNum(guildList);//行会剩余数量
    d.guildRank = guildWar.rank;//我的行会排名
    d.doorLives = guildWar.doorLives;//城门存活数
    d.points = guildWar.points;//点数

    d.nextFightTime = warUser.nextFightTime;//下一次攻击时间
    d.inspireEndTime = warUser.inspireEndTime;//鼓舞结束时间
    d.warEndTime = mainWarData.endTime;//行会战结束时间
    d.guildTotal = guildList.length;//行会所有数量
    d.isDefence = guildWarUtils.isInDefence(userId,guildWar);
    d.myGuildRefreshId = guildWar.refreshId;//刷新id
    d.serverId = project.serverId;

    if(d.overReSeconds<0) d.overReSeconds = 0;

    cb(null,d);
};

//同步数据
exports.syncData = function(client, userId, sceneType,attackData, cb){
    var warUser = g_guildWar.getMyObj().getGuildWarUser(userId);
    var guildWar = g_guildWar.getMyObj().getGuildWarData(warUser.guildId);

    async.parallel([
        function(cb1){
            exports.getInfo(client, userId, cb1);
        },
        function(cb1){
            cb1(null,guildWar.fightRecordArr);
        },
        function(cb1){
            if(sceneType==1){
                exports.getGuildList(client,userId,cb1);
            }else{
                cb1(null);
            }
        },
        function(cb1){
            if(sceneType==2){
                //serverId, guildId,
                var serverId = attackData[0];
                var guildId = attackData[1];
                exports.getWarAttackData(client,userId,serverId,guildId,cb1);
            }else{
                cb1(null);
            }
        },
        function(cb1){
            if(sceneType==3){
                exports.getWarDefenceData(client,userId,cb1);
            }else{
                cb1(null);
            }
        }
    ],function(err,data){
        if (err) return cb(err);
        var syncData = new ds.GuildWarSyncData();
        syncData.myGuildWarData = data[0];
        syncData.fightRecordArr = data[1];
        syncData.guildList = data[2];//GuildServer
        syncData.attackData = data[3];//GuildWarData
        syncData.defenceData = data[4];//GuildWarData
        cb(null,syncData);
    });
};

//获取当前服务器的obj
exports.getCurServerGuildWarObj = function(client,cb){
    if(!g_guildWar.isSync()) return cb(null);
    var obj = g_guildWar.getMyObj();
    g_guildWar.addServerSyncId();
    var syncId =  g_guildWar.getServerSyncId();
    var guildWarSyncData = new ds.GuildWarServerSyncData();
    var newObj = JSON.parse(JSON.stringify(obj));
    delete newObj._guildWarGroupDic;
    delete newObj._guildWarUserGroupDic;
    guildWarSyncData.guildWarObj = obj;
    guildWarSyncData.syncId = syncId;
    cb(null,guildWarSyncData);
};
/*

exports.syncOtherServerObj = function(client,cb){
    if(!g_guildWar.isSync()) return cb(null);
    var g_serverData = g_guildWar.getServerData();
    //curServerData:"[serverGroupId,serverId,serverHost,serverPort]"
    var gameCfg = g_gameConfig.getData();
    if(!gameCfg.guildWarHost||!gameCfg.guildWarPort) return cb(null);
    var curServerData = [g_serverData.serverGroupId,project.serverId,g_serverData.serverHost,g_serverData.serverPort];
    _requestGetOtherServerData(curServerData,gameCfg.guildWarHost,gameCfg.guildWarPort,function(err,otherServerSyncObj){
        if(err){
            g_serverData.errNum++;
            if(g_serverData.errNum>=5){
                g_serverData.errNum = 0;
                g_guildWar.setOtherServerSyncObj(null);
                g_guildWar.delOtherObj();
            }
            return cb(err);
        }
        g_serverData.errNum = 0;
        for(var key in otherServerSyncObj){
            var locSyncObj = otherServerSyncObj[key];
            if(locSyncObj.serverId == project.serverId) continue;
            var locMySyncObj  = g_guildWar.getOtherServerSyncObj(locSyncObj.serverId);
            if(locMySyncObj&&locMySyncObj.syncId>locSyncObj.syncId&&locSyncObj.syncId!=1) continue;
            if(!locSyncObj.guildWarObj) {
                g_guildWar.delObj(locSyncObj.serverId);
            }else{
                guildWarUtils.syncGuildWarObj(locSyncObj.serverId,locSyncObj.guildWarObj);
            }
        }
        g_guildWar.setOtherServerSyncObj(otherServerSyncObj);
        //console.log("otherServerSyncObj:",otherServerSyncObj);
        cb(null);
    });
};
*/

var _addDefenceRecord = function(guildId,data){
    var recordList = g_guildWar.getMyObj().getGuildWarDefenceRecordArr(guildId);
    recordList.push(data);
    //只记录400条
    if(recordList.length>200) recordList.shift();
};

var _addAttackRecord = function(groupId,data){
    var recordList = g_guildWar.getMyObj().getGuildWarAttackRecordArr(groupId);
    recordList.push(data);
    //只记录400条
    if(recordList.length>200) recordList.shift();
};

var _initDoorData = function(client,guildId,cb){
    //获取行会id,获取战力最高的4个人
    guildDao.getUserListByCombat(client,guildId,4,function(err,userList){
        if(err) return cb(err);
        commonUtils.breakArray(userList);
        var guildWarData = g_guildWar.getMyObj().getGuildWarData(guildId);
        //参数2：守卫进度
        var guildWarCfg = c_game.guildWar;

        for(var i = 0;i<=3;i++){
            var guildWarDoor = new  ds.GuildWarDoor();
            guildWarDoor.door = i;//门口，东南西北 0,1,2,3
            guildWarDoor.hp = guildWarCfg[1];//生命值
            var userData = userList[i];
            if(userData){
                guildWarDoor.userId = userData.id;//守门人id
                guildWarDoor.userName = userData.nickName;//守门人名字
                guildWarDoor.userIcon = userData.iconId;//守门人头像
                guildWarDoor.lastUserId = userData.userId;//守门人id
                guildWarDoor.lastUserName = userData.userName;//守门人名字
                guildWarDoor.lastUserIcon = userData.userIcon;//守门人头像
            }
            guildWarDoor.isBreak = 0;//是否击破
            guildWarData.doorData[i] = guildWarDoor;
        }
        cb(null);
    });
};

/**
 * 请求掠夺守卫门
 * @param client
 * @param attackData [攻击玩家id,攻击玩家名，服务器id,服务器名称，攻击者行会名,是否直接击破]
 * @param isWin 是否胜利
 * @param defenceData [行会id,攻击哪个门,防守者名字]
 * @param serverHost
 * @param serverPort
 * @param isLocalServer
 * @param cb
 * @private
 */
var _requestLoot = function(client,attackData,isWin,defenceData,serverHost,serverPort,isLocalServer,cb){
    if(isLocalServer){
        exports.lootDefense(client, attackData[0], attackData[1], attackData[2], attackData[3],attackData[4],attackData[5], isWin,  defenceData[0], defenceData[1], defenceData[2],cb);
    }else{
        //{attackData:"[攻击玩家id,攻击玩家名，服务器id,服务器名称,是否直接击破]",isWin:"是否胜利",defenceData:"[行会id,攻击哪个门,防守者名字]"}
        var args = {};
        var argsKeys = iface.admin_guildWar_lootDefense_args;
        args[argsKeys.attackData] = attackData;
        args[argsKeys.isWin] = isWin;
        args[argsKeys.defenceData] = defenceData;
        serverUtils.requestServer(iface.admin_guildWar_lootDefense,args,serverHost,serverPort,cb);
    }
};

/**
 * 增加攻击数据
 * @param guildId 行会id
 * @param data 数据
 * @param serverHost
 * @param serverPort
 * @param cb
 * @private
 */
var _requestPushBeFightRecord = function(guildId,data,serverHost,serverPort,cb){
    var args = {};
    var argsKeys = iface.admin_guildWar_pushBeFightRecord_args;
    args[argsKeys.guildId] = guildId;
    args[argsKeys.data] = data;
    serverUtils.requestServer(iface.admin_guildWar_pushBeFightRecord,args,serverHost,serverPort,cb);
};

/**
 * 获取其他服务器信息
 * @param curServerData
 * @param serverHost
 * @param serverPort
 * @param cb
 * @private
 */
var _requestGetOtherServerData = function(curServerData,serverHost,serverPort,cb){
    var args = {};
    var argsKeys = iface.admin_guildWarSync_getOtherServerData_args;
    args[argsKeys.curServerData] = curServerData;
    serverUtils.requestServer(iface.admin_guildWarSync_getOtherServerData,args,serverHost,serverPort,cb);
};

var _clearAllSync = function(){
    checkRequire();
    syncGuildBiz.clearMyGuildDynamicData(function(){});
    syncGuildBiz.clearMyGuildStaticData(function(){});
    syncUserBiz.clearMyUserDynamicData(function(){});
    syncUserBiz.clearMyUserStaticData(function(){});
    syncAttackRecordBiz.clearMyRecordDynamicData(function(){});
}
