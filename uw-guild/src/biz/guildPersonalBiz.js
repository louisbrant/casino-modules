/**
 * Created by Administrator on 2014/5/16.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var c_vip = uwData.c_vip;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var c_guildAct = uwData.c_guildAct;
var c_guildFuncCfg = uwData.c_guildFuncCfg;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var GuildPersonalEntity = require('uw-entity').GuildPersonalEntity;
var guildDao = require("../dao/guildDao.js");
var guildPersonalDao = require("../dao/guildPersonalDao.js");
var guildUtils = require("./guildUtils.js");
var g_guild = require("uw-global").g_guild;
var g_data = require("uw-global").g_data;
var g_guildWar = require("uw-global").g_guildWar;
var commonUtils = require("uw-utils").commonUtils;
var userDao = null;
var userUtils = null;
var checkRequire = function () {
    userDao = require("uw-user").userDao;
    userUtils = require("uw-user").userUtils;
};

var ds = require("uw-ds").ds;

var exports = module.exports;

/**
 * 除了上香之外的贡献
 * @param client
 * @param userId
 * @param actId
 * @param cb
 */
exports.otherAct = function(client, userId, actId, cb){
    // 6.白檀香 7.紫檀香 8.天木香
    var guildActData = c_guildAct[actId];
    if (!guildActData) return cb("木有这个数据");
    guildPersonalDao.select(client, {userId: userId}, function(err,guildPersonalData){
        if (err) return cb(err);
        if(!guildPersonalData) return cb(null,[null,null]);
        if(!guildPersonalData.guildId) return cb(null,[null,null]);
        var guildData = g_guild.getGuild(guildPersonalData.guildId);
        if (!guildData)  return cb(null,[null,null]);

        //判断次数
        var num = guildUtils.getActNum(guildPersonalData, actId);
        if (num >= guildActData.num)  return cb(null,[null,null]);

        var addAct = guildActData.act;
        //增加次数
        guildUtils.addActNum(guildPersonalData, actId, 1);
        //增加贡献
        guildUtils.addTodayAct(guildPersonalData, addAct);

        //行会贡献
        guildUtils.addGuildAct(guildData,addAct);

        var updateGuildPersonal = {
            exitGuildCount:guildPersonalData.exitGuildCount,
            lotteryCount:guildPersonalData.lotteryCount,
            noticeCount: guildPersonalData.noticeCount,
            actData: guildPersonalData.actData,
            todayAct: guildPersonalData.todayAct,
            actLastTime: guildPersonalData.actLastTime,
            addUpAct: guildPersonalData.addUpAct,
            guildAct: guildPersonalData.guildAct
        };

        var updateGuild = {
            addUpAct: guildData.addUpAct,
            lvl: guildData.lvl
        };

        g_guild.setGuild(guildData.id, guildData);

        guildPersonalDao.update(client, updateGuildPersonal, {id: guildPersonalData.id}, function(err,data){
            if (err) return cb(err);
            cb(null,[updateGuild,updateGuildPersonal]);
        });
    });
};

/**
 * 上香
 * @param client
 * @param userId
 * @param actId
 * @param cb
 * @returns {*}
 */
exports.pickAct = function (client, userId, actId, cb) {
    checkRequire();

    // 6.白檀香 7.紫檀香 8.天木香
    var guildActData = c_guildAct[actId];
    if (!guildActData) return cb("木有这个数据");
    /*
     vi.	上白檀香：使用金币上香，每日有次数限制
     vii.	上紫檀香：使用元宝上香无次数限制，读取（【c_game(游戏配置)】【67】【参数1.2.3】
     viii.	上天木香：使用元宝上香无次数限制
     */
    async.parallel([
        function (cb1) {
            guildPersonalDao.select(client, {userId: userId}, cb1);
        },
        function (cb1) {
            userDao.selectCols(client,"vip,gold,diamond,buyDiamond,giveDiamond"," id = ?", [userId], cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var guildPersonalData = data[0], userData = data[1];
        var guildData = g_guild.getGuild(guildPersonalData.guildId);
        if (!guildData) return cb(getMsg(c_msgCode.outGuild));
        var costDiamond = 0, costGold = 0, addAct = guildActData.act, getGold = guildActData.gold;
        //判断次数
        var num = guildUtils.getActNum(guildPersonalData, actId);
        if(guildActData.num>0){
            if (num >= guildActData.num) return cb("今日已经达到上限");
        }

        //判断消耗
        var vip = userData.vip;
        switch (guildActData.type) {
            case 6:
                costGold = c_game.guildAct[1];
                if (userData.gold < costGold) return cb("金币不足!");

                break;
            case 7:
                //参数10：元宝上香1
                if(!c_vip[vip].isPickAct) return cb(getMsg(c_msgCode.noPrivilege));
                costDiamond = c_game.guildAct[9];
                if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));
                break;
            case 8:
                //参数11：元宝上香2
                if(!c_vip[vip].isPickAct) return cb(getMsg(c_msgCode.noPrivilege));
                costDiamond = c_game.guildAct[10];
                if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));
                break;
            default :
                return cb("未知类型");
                break;
        }

        //扣除消耗
        userUtils.reduceDiamond(userData, costDiamond);
        userUtils.addGold(userData, -costGold);
        //得到金币
        userUtils.addGold(userData, getGold);

        //增加次数
        guildUtils.addActNum(guildPersonalData, actId, 1);
        //增加贡献
        guildUtils.addTodayAct(guildPersonalData, addAct);

        //行会贡献
        guildUtils.addGuildAct(guildData,addAct);

        var updateUser = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond
        };

        var updateGuildPersonal = {
            exitGuildCount:guildPersonalData.exitGuildCount,
            lotteryCount:guildPersonalData.lotteryCount,
            noticeCount: guildPersonalData.noticeCount,
            actData: guildPersonalData.actData,
            todayAct: guildPersonalData.todayAct,
            actLastTime: guildPersonalData.actLastTime,
            addUpAct: guildPersonalData.addUpAct,
            guildAct: guildPersonalData.guildAct
        };

        var updateGuild = {
            addUpAct: guildData.addUpAct,
            lvl: guildData.lvl
        };

        g_guild.setGuild(guildData.id, guildData);

        async.parallel([
            function (cb1) {
                guildPersonalDao.update(client, updateGuildPersonal, {id: guildPersonalData.id}, cb1);
            },
            function (cb1) {
                userDao.update(client, updateUser, {id: userId}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [updateUser, updateGuild, updateGuildPersonal, costDiamond, costGold]);
        });
    });
};

//获取成员
exports.getMemberList = function (client, userId, cb) {
    guildPersonalDao.select(client, {userId: userId}, function (err, guildPersonalData) {
        if (err) return cb(err);
        if (!guildPersonalData || !guildPersonalData.guildId) return cb(null, []);
        guildPersonalDao.getPersonUserList(client, guildPersonalData.guildId, function (err, personalUserList) {
            if (err) return cb(err);
            var reMemberList = [];
            for (var i = 0; i < personalUserList.length; i++) {
                var locData = personalUserList[i];
                var lastUpdate = locData.lastUpdateTime;
                var locMember = new ds.GuildMember();
                locMember.lvl = locData.lvl;//等级
                locMember.nickName = locData.nickName;//昵称
                locMember.combat = locData.combat;//战力
                locMember.guildAct = locData.guildAct;//累计贡献
                locMember.position = locData.position;//职能
                locMember.ennoble = locData.ennoble;//爵位
                locMember.lastUpdateTime = lastUpdate;//最后更新时间
                locMember.iconId = locData.iconId;//头像
                locMember.vip = locData.vip;//vip
                locMember.userId = locData.userId;//vip
                locMember.offlineHour = 0;
                if(lastUpdate){
                    var minute = (new Date().getTime() - lastUpdate.getTime())/1000/60;
                    if(minute>2){
                        var hour = Math.ceil((minute/60));
                        locMember.offlineHour = hour;
                    }
                }
                reMemberList.push(locMember);
            }
            cb(null, reMemberList);
        });
    });
};

//操作会员
exports.opMember = function (client, userId, targetUserId, op, cb) {
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
        if (mPersonalData.guildId != tPersonalData.guildId) return cb("该玩家不在同一个行会");
        var guildData = g_guild.getGuild(mPersonalData.guildId);
        if (!guildData) return cb(getMsg(c_msgCode.outGuild));
        _opMember(mPersonalData, tPersonalData, guildData, op, function (err,data) {
            if (err) return cb(err);
            var updateMPersonal = {
                position: mPersonalData.position
            };

            var updateTPersonal = {
                guildId: tPersonalData.guildId,
                position: tPersonalData.position,
                viceTime: tPersonalData.viceTime,
                todayAct: tPersonalData.todayAct,
                actLastTime: tPersonalData.actLastTime,
                addUpAct: tPersonalData.addUpAct,
                guildAct:tPersonalData.guildAct,
                lastQuipGuildTime:tPersonalData.lastQuipGuildTime
            };

            var updateGuild = {
                chairmanId: guildData.chairmanId,
                viceChairmanId: guildData.viceChairmanId,
                guildPopulation: guildData.guildPopulation
            };
            g_guild.setGuild(guildData.id, guildData);
            async.parallel([
                function (cb1) {
                    guildPersonalDao.update(client, updateMPersonal, {id: mPersonalData.id}, cb1);
                },
                function (cb1) {
                    guildPersonalDao.update(client, updateTPersonal, {id: tPersonalData.id}, cb1);
                }
            ], function (err, data) {
                if (err) return cb(err);
                cb(null, [updateGuild, updateMPersonal]);
            });
        });
    });
};

//初始化公会id
exports.initGuildIdToGlobal = function (client, userId, cb) {
    guildPersonalDao.selectCols(client, "guildId,ennoble", " userId = ?", [userId], function (err, data) {
        if (err) return cb(err);
        if(!data) {
            g_data.setGuildId(userId, null);
            g_data.setGuildEnnoble(userId, null);
            return cb(null);
        }
        g_data.setGuildId(userId, data.guildId);
        g_data.setGuildEnnoble(userId, data.ennoble);
        cb(null);
    });
};

//获取公会名称
exports.getGuildNameByUserIds = function(client,userIds,cb){
    var reData = {};
    if(userIds.length<=0) return cb(null,reData);
    guildPersonalDao.listCols(client, "userId, guildId", " userId in (?)", [userIds], function (err, dataList) {
        if (err) return cb(err);
        for(var i = 0;i<dataList.length;i++){
            var locData = dataList[i];
            reData[locData.userId] = g_guild.getGuildName(locData.guildId);
        }
        cb(null,reData);
    });
};

var _opMember = function (mPersonalData, tPersonalData, guildData, op, cb) {
    var guildFuncData = c_guildFuncCfg[mPersonalData.position];
    if (!guildFuncData) return cb(null);
    switch (op) {
        case c_prop.guildMemberOpKey.trans:
            //转让会长
            //判断权限
            if (!guildFuncData.upToChairman) return cb("权限不足!");
            //行会战开启期间不能转让会长
            if(g_guildWar.isOpen()) return cb(getMsg(c_msgCode.noGuildTransfer));

            mPersonalData.position = c_prop.guildPostKey.rankFile;
            tPersonalData.position = c_prop.guildPostKey.chairman;
            guildData.chairmanId = tPersonalData.userId;
            var viceChairmanId = guildData.viceChairmanId||[];
            for(var i = 0;i<viceChairmanId.length;i++){
                if(viceChairmanId[i]==mPersonalData.userId || viceChairmanId[i]==tPersonalData.userId) viceChairmanId.splice(i--,1);
            }
            g_data.setGuildChange(tPersonalData.userId,1);
            break;
        case c_prop.guildMemberOpKey.kick:
            if (guildFuncData.moveMember == 0)  return cb("权限不足!");
            if (guildFuncData.moveMember == 2) {
                if (tPersonalData.position != c_prop.guildPostKey.rankFile)
                    return cb("权限不足!");
            }
            //行会战开启期间不能踢人
            if(g_guildWar.isOpen()) return cb(getMsg(c_msgCode.noGuildExpel));
            //moveMember

            guildData.guildPopulation -= 1;
            var ennoble = tPersonalData.ennoble;
            if(ennoble){
                guildData.ennobleData[ennoble] -= 1;
                if(guildData.ennobleData[ennoble] < 0) guildData.ennobleData[ennoble] = 0;
            }
            //如果是副会长
            commonUtils.arrayRemoveObject(guildData.viceChairmanId,tPersonalData.userId);

            //踢出行会
            tPersonalData.guildId = 0;
            tPersonalData.position = c_prop.guildPostKey.rankFile;
            tPersonalData.guildAct = 0;
            tPersonalData.ennoble = 0;
            tPersonalData.lastQuipGuildTime = new Date();


            g_data.setGuildId(tPersonalData.userId, null);
            g_data.setGuildEnnoble(tPersonalData.userId, null);
            g_data.setGuildChange(tPersonalData.userId,1);
            break;
        case c_prop.guildMemberOpKey.release:
            if (!guildFuncData.movePosition) return cb("权限不足!");
            //解除职务
            //todo
            tPersonalData.position = c_prop.guildPostKey.rankFile;
            commonUtils.arrayRemoveObject(guildData.viceChairmanId,tPersonalData.userId);
            g_data.setGuildChange(tPersonalData.userId,1);
            break;
        case c_prop.guildMemberOpKey.increase:
            if (!guildFuncData.upToVice) return cb("权限不足!");
            if(guildData.viceChairmanId.length>=3) return cb("最多3个副会长");
            //提升职务
            //todo
            tPersonalData.position = c_prop.guildPostKey.viceChairman;

            if(guildData.viceChairmanId.indexOf(tPersonalData.userId)<0){
                guildData.viceChairmanId.push(tPersonalData.userId);
            }

            g_data.setGuildChange(tPersonalData.userId,1);
            break;
    }
    cb(null);
};

