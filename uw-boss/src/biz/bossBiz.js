/**
 * Created by Administrator on 2014/5/16.
 */

var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var propUtils = require("uw-utils").propUtils;
var c_msgCode = require("uw-data").c_msgCode;
var TreasureEntity = require("uw-entity").TreasureEntity;
var consts = require("uw-data").consts;
var c_chatSys = require("uw-data").c_chatSys;
var c_bossParameter = require("uw-data").c_bossParameter;
var c_bossHurtRate = require("uw-data").c_bossHurtRate;
var c_prop = require("uw-data").c_prop;
var c_game = require("uw-data").c_game;
var c_vip = require("uw-data").c_vip;
var t_otherBuff = require("uw-data").t_otherBuff;
var t_monster = require("uw-data").t_monster;
var t_item = require("uw-data").t_item;
var exports = module.exports;
var g_boss = require("uw-global").g_boss;
var g_data = require("uw-global").g_data;
var g_guild = require("uw-global").g_guild;
var g_incognito = require("uw-global").g_incognito;
var ds = require("uw-ds").ds;
var userDao = require("uw-user").userDao;
var mailBiz = require("uw-mail").mailBiz;
var mailDao = require("uw-mail").mailDao;
var userUtils = require("uw-user").userUtils;
var bossDao = require("../dao/bossDao");
var bossUtils = require("./bossUtils");
var BossEntity = require("uw-entity").BossEntity;
var chatBiz  =  require("uw-chat").chatBiz;
var heroDao = require("uw-hero").heroDao;
var heroPropHelper = require("uw-hero").heroPropHelper;
var guildPersonalDao = require("uw-guild").guildPersonalDao
var mainClient = require("uw-db").mainClient;
var accountDao = require("uw-account").accountDao;
var c_bossWorld = require("uw-data").c_bossWorld;
var treasureDao = require("uw-treasure").treasureDao;
var treasureBiz = require("uw-treasure").treasureBiz;
var loginClient = require("uw-db").loginClient;
var formula = require("uw-formula");

//检验boss列表
exports.checkBossList = function (client, cb) {
    _initGuildBossList(client, function (err, data) {
        if (err) return cb(err);
        _initWorldBossList(client, function (err, data) {
            if (err) return cb(err);
                bossDao.list(client, " 1=1 ", [], function (err, dataList) {
                    if (err) return cb(err);
                    async.map(dataList,function(bossData,cb1){
                        var updateData = {};
                        if(bossData.status==consts.bossStatus.open||bossData.status==consts.bossStatus.prize){
                            updateData.status = consts.bossStatus.closed;
                        }

                        if(bossData.type == c_prop.worldBossTypeKey.world){
                            _checkOpenWorldBoss(client,bossData.bossId, bossData.deathTime,bossData.originBossId);
                            if(g_boss.getBossObj(bossData.bossId).isOpen()){
                                updateData.status = consts.bossStatus.open;
                                updateData.startTime = new Date();
                            }
                        }

                        if(!bossData.limitStartTime){
                            updateData.limitStartTime = (new Date()).addDays(-10);
                        }
                        if(!bossData.limitEndTime){
                            updateData.limitEndTime = (new Date()).addDays(-1);
                        }

                        if(!bossData.originBossId){
                            updateData.originBossId = bossData.bossId;
                        }

                        if(Object.keys(updateData).length>0){
                            bossDao.update(client, updateData," id = ? ",[bossData.id],  cb1);
                        }else{
                            cb1();
                        }
                    },cb);
                });
        })}
    );
};

//获取boss列表
exports.getGuildBossList = function (client, cb) {
    bossDao.list(client, " type = ? ", [c_prop.worldBossTypeKey.guild], function (err, dataList) {
        if (err) return cb(err);
        var otherData = {};
        //如果状态
        for(var i = 0;i<dataList.length;i++){
            var locData = dataList[i];
            delete locData["resultData"];
            //没内存数据，但是，状态没正常
            var g_bossObj = g_boss.getBossObj(locData.bossId);
            var g_bossData = g_bossObj.getBossData();
            //[行会id,行会名称，是否上锁]
            if(g_bossObj.isOpen()){
                otherData[g_bossData.bossId] = [g_bossData.callUserGuildId,g_bossData.callUserGuildName,g_bossData.isLock];
            }else{
                otherData[g_bossData.bossId] = [];
            }
        }
        return cb(null, [dataList,otherData]);
    });
};

//获取boss列表
exports.getWorldBossList = function (client, cb) {
    bossDao.list(client, " type = ? ", [c_prop.worldBossTypeKey.world], function (err, dataList) {
        if (err) return cb(err);
        var otherData = {};
        //如果状态
        for(var i = 0;i<dataList.length;i++){
            var locData = dataList[i];
            delete locData["resultData"];
        }
        return cb(null, [dataList,otherData]);
    });
};


/**
 * 开启boss
 * @param client
 * @param userId
 * @param bossId
 * @param isLock
 * @param cb
 */
exports.openBoss = function (client, userId, bossId, isLock, cb) {
    if (g_boss.getBossObj(bossId).isOpen()) {
        return cb("boss已经召唤！");
    }
    var bossParameterData = c_bossParameter[bossId];
    if (!bossParameterData) return cb("不存在该Boss数据！");
    var t_monsterData = t_monster[bossId];
    async.parallel([
        function (cb1) {
            bossDao.select(client, {bossId: bossId}, cb1);
        },
        function (cb1) {
            userDao.selectCols(client, "id,lvl,vip,nickName,diamond,giveDiamond,buyDiamond,bag,sdkChannelId,counts,countsRefreshTime", "id = ?", [userId], cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var bossData = data[0], userData = data[1];
        if (!bossData) return cb("没有该boss数据");

        if(bossData.isLimit){
            var startTime = new Date(bossData.limitStartTime);
            var endTime = new Date(bossData.limitEndTime);
            var nowDate = new Date();
            if(nowDate.isBefore(startTime)||nowDate.isAfter(endTime)){
                return cb(getMsg(c_msgCode.timeOutCantCall));
            }

            var day = nowDate.getDay();
            if(bossData.week>0){
                if (bossData.week == 7 && day != 0){
                    return cb("Boss正在休息!");
                }else if (bossData.week != day) {
                    return cb("Boss正在休息!");
                }
            }
        }

        if(userData.lvl<bossParameterData.fightLvl||userData.lvl>bossParameterData.maxLvl) return cb(getMsg(c_msgCode.noLvlSummonBoss,bossParameterData.fightLvl,bossParameterData.maxLvl));

        //修改数据库
        if (bossData.status == consts.bossStatus.open) return cb("boss已经召唤！");
        if (bossData.prize == consts.bossStatus.prize) return cb("结算中！");

        //判断公会等级
        var myGuildId = g_data.getGuildId(userId);
        var myGuild = g_guild.getGuild(myGuildId);
        var openLvl = bossParameterData.openLvl;
        if (!myGuild || myGuild.lvl < openLvl) return cb("行会等级不足!");

        if(_hasGuildFightingBoss(myGuildId)) return cb("同一个行会同时只能召唤1个boss!");

        //Boss正在休息
        var nowDate = new Date();
        if (nowDate.isBefore(bossUtils.getOpenStartTime()) || nowDate.isAfter(bossUtils.getOpenEndTime())) {
            return cb("Boss正在休息!");
        }


        //判断元宝
        //summonCost
        var costDiamond = 0;
        var delItems = {};

        var openCd = bossUtils.getOpenCd(bossData, bossId);

        var isRepeat = 0;
        if (openCd > 0){
            if(!bossParameterData.repeat) return cb("已被击杀,cd中!");

            //消耗元宝复活
            isRepeat = 1;
            /**
             * 清除BOSS CD花费
             * @param a 当前BOSS等级
             * @param b 剩余CD时间（秒）
             * @param c 今日秒CD次数
             */
            var repeatCount = bossUtils.getRepeatCount(bossData);
            var repeatCost = formula.calGuildBossRepeat(t_monsterData.level,openCd,repeatCount);
            repeatCost = parseInt(repeatCost);
            costDiamond+=repeatCost;

        }

        var summonCost = bossParameterData.summonCost;

        //判断上锁
        if(isLock&&!bossParameterData.isLimit){
            if(!c_vip[userData.vip].isLock) return cb("vip不足");
            costDiamond +=c_game.newBossCfg[2];
        }

        var itemId = parseInt(summonCost[0]);
        var itemNum = parseInt(summonCost[1]);

        if(itemId==c_prop.spItemIdKey.diamond){
            //不是复活才召唤
            if(!isRepeat){
                costDiamond += itemNum;
            }
        }else {
            var ownNum = userData.bag[itemId]||0;
            if(ownNum<itemNum) return cb("道具不足！");
            userUtils.delBag(userData.bag,itemId,itemNum);
            delItems[itemId] = itemNum;
        }

        if(_hasFightingBoss()&&!isRepeat){
            costDiamond +=c_game.newBossCfg[1];
        }

        if(costDiamond>0){
            if (userData.diamond < costDiamond) {
                return cb(getMsg(c_msgCode.noDiamond));
            }
            userUtils.reduceDiamond(userData, costDiamond);
        }

        if(isRepeat){
            bossUtils.addRepeatCount(bossData);
        }

        bossData.startTime = new Date();
        bossData.status = consts.bossStatus.open;

        bossData.callArr.push([userId,userData.nickName, (new Date()).toFormat("YYYY-MM-DD HH24:MI:SS")]);
        if(bossData.callArr.length>10) bossData.callArr.shift();

        var bossOpt = {};
        bossOpt.originHp = t_monsterData.maxHp;
        bossOpt.curHp = t_monsterData.maxHp;
/*        bossOpt.originHp = 500000000;
        bossOpt.curHp = 500000000;*/
        bossOpt.bossId = bossId;//boss的id
        bossOpt.bossName = t_monsterData.name;
        bossOpt.startTime = new Date();
        //bossOpt.endTime = (new Date()).addHours(2);
        bossOpt.callUserId = userId;//召唤者id
        bossOpt.callUserName = userData.nickName;//召唤者名字

        bossOpt.callUserGuildName = myGuild.name;//召唤者公会名
        bossOpt.callUserGuildId = myGuildId;//召唤者公会id
        bossOpt.type = c_prop.worldBossTypeKey.guild;
        bossOpt.isLock = isLock;
        bossOpt.originBossId = bossId;//boss的id
        bossOpt.isRepeat = isRepeat;

        var updateUser = {
            diamond: userData.diamond,
            giveDiamond: userData.giveDiamond,
            buyDiamond: userData.buyDiamond,
            bag: userData.bag
        };
        var updateBossData = {
            startTime: bossData.startTime,
            status: bossData.status,
            repeatTime: bossData.repeatTime,
            repeatCount: bossData.repeatCount,
            callArr: bossData.callArr
        };
        async.parallel([
            function (cb1) {
                bossDao.update(client, updateBossData, {bossId: bossId}, cb1);
            },
            function (cb1) {
                userDao.update(client, updateUser, {id: userId}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            g_boss.getBossObj(bossId).openBoss(bossOpt,function(){
                _setTimeOver(client,bossId);
            });
            //第一个%s：公会名
            //第二个%s：玩家名
            //第三个%s：世界BOSS名字
            chatBiz.addSysData(34, [bossOpt.callUserGuildName, bossOpt.callUserName, t_monsterData.name]);
            //qq浏览器渠道发大推送
            if (userData.sdkChannelId == 100039 || userData.sdkChannelId == 100069)
                exports.sendGuildPushMsg(client, userId, myGuildId, bossOpt.callUserName, t_monsterData.name, function(){});
            cb(null, [bossData, updateUser, costDiamond,delItems]);
        });
    });
};

// 给qq浏览器渠道发送大推送消息
exports.sendGuildPushMsg = function(client, callUserId, guildId, callUserName, monsterName, cb) {
    async.waterfall([
        function(cb1) {
            guildPersonalDao.getQQBrownerPersonAccountList(client, guildId, function(err, dataList) {
                if (err) return cb1(err);
                if (!dataList) return cb1(null, null, []);
                var accountIds = [];
                var callAccountId;
                for (var i = 0; i < dataList.length; i++) {
                    accountIds.push(dataList[i].accountId);
                    if (dataList[i].userId == callUserId)
                        callAccountId = dataList[i].accountId;
                }
                return cb1(null, callAccountId, accountIds);
            });
        },
        function(callAccountId, accountIds, cb1) {
            if (accountIds.length == 0 || !callAccountId)
                return cb1(null, null, []);
            accountDao.listCols(loginClient, "id, name", " id in (?) ",[accountIds], function(err, dataList) {
                if (err) return cb1(err);
                if (!dataList) return cb1(null, null, []);
                var openIds = [];
                var callOpenId;
                for (var i = 0; i < dataList.length; i++) {
                    openIds.push(dataList[i].name);
                    if (callAccountId == dataList[i].id)
                        callOpenId = dataList[i].name;
                }
                return cb1(null, callOpenId, openIds);
            });
        }
    ], function(err, callOpenId, openIds) {
        if (err) return cb(err);
        if (openIds.length == 0 || !callOpenId)
            return cb(null);
        var hgameBiz = require('uw-sdk').hgameBiz;
        var msgData = {
            'nickname': callUserName,
            'bosstype': '行会',
            'bossname': monsterName
        }
        hgameBiz.sendQQBrowserPushMsg('tplt123574', callOpenId, openIds.join(','), msgData, cb);
    });
}


//进入boss系统
exports.enter = function (client, userId, bossId,cb) {
    if (!g_boss.getBossObj(bossId).isOpen()) {
        return cb("boss未开启");
    }
    _getGUserData(client, userId, bossId, function (err, b_userData) {
        if (err) return cb(err);
        //todo 判断cd
        //返回boss信息
        var g_bossData = g_boss.getBossObj(bossId).getBossData();

        var inspireEndTime = new Date();
        var inspireNum = 0;
        var myGuildId = g_data.getGuildId(userId);
        var myGuild = g_guild.getGuild(myGuildId);

        if(g_bossData.isLock){
            if (myGuildId != g_bossData.callUserGuildId) return cb("boss已经上锁，不是同一个行会无法挑战");
        }

        if (myGuild) {
            var b_guildData = g_boss.getBossObj(bossId).getGuildData(myGuildId);
            inspireEndTime = b_guildData.inspireEndTime;
            inspireNum = b_guildData.inspireNum;
        }

        //判断是否上锁

        var bossData = new ds.BossData();
        bossData.originHp = g_bossData.originHp;//原始生命值
        bossData.curHp = g_bossData.curHp;//当前hp
        bossData.bossId = g_bossData.bossId;//boss的id
        bossData.startTime = g_bossData.startTime;//开始时间
        bossData.endTime = g_bossData.endTime;//结束时间
        bossData.inspireHurt = t_otherBuff[1].addHurt;//伤害加成,固定值
        bossData.inspireEndTime = inspireEndTime;//鼓舞结束时间
        bossData.inspireNum = inspireNum;//鼓舞次数
        bossData.myHurt = b_userData.hurt;//我的伤害
        bossData.myRank = b_userData.rank;//我的排名
        bossData.myGuildName = b_userData.guildName;//我的公会名
        bossData.callUserName = g_bossData.callUserName;//召唤者名字
        bossData.callUserGuildName = g_bossData.callUserGuildName;//召唤者公会id
        bossData.lastExitTime = g_boss.getUserObj(userId).lastExitTime;
        bossData.myKey = b_userData.myKey;
        bossData.type = g_bossData.type;
        bossData.isOver = g_bossData.isOver;
        bossData.isRepeat = g_bossData.isRepeat;
        bossData.callUserId = g_bossData.callUserId;
        bossData.callUserGuildId = g_bossData.callUserGuildId;//召唤者公会id

        cb(null, bossData);
    });
};

//开始战斗
exports.startFight = function (client, userId, bossId, cb) {
    var g_bossData = g_boss.getBossObj(bossId).getBossData();

    if(g_bossData.isOver) return cb("已经结束!");

    if(g_bossData.bossId!=bossId) return cb("数据过时，请重新进入BOSS系统");
    _getGUserData(client, userId, bossId, function (err, b_userData) {
        if(err) return cb(err);
        var exitCd = c_game.worldBossCfg[1];
        exitCd = exitCd-5;//加个误差
        //判断cd中
        if (g_boss.getUserObj(userId).lastExitTime && g_boss.getUserObj(userId).lastExitTime.clone().addSeconds(exitCd).isAfter(new Date())) {
            return cb("cd中.......");
        }

        async.parallel([
            function(cb1){
                userDao.selectCols(client,"id ,lvl"," id = ?",[userId] ,cb1);
            },
            function(cb1){
                heroDao.list(client, {userId: userId},cb1);
            }
        ],function(err,data){
            if(err) return cb(err);
            var mUserData = data[0],heroList = data[1];
            var t_monsterData = t_monster[g_bossData.bossId];

            if(g_bossData.type == c_prop.worldBossTypeKey.guild){
                var bossParameterData = c_bossParameter[g_bossData.bossId];
                if(mUserData.lvl<bossParameterData.fightLvl||mUserData.lvl>bossParameterData.maxLvl) return cb(getMsg(c_msgCode.noLvlchallengeBoss,bossParameterData.fightLvl,bossParameterData.maxLvl));
            }

            //记住最大伤害
            for(var i = 0;i<heroList.length;i++){
                var locHero = heroList[i];
                var locMaxHurt = heroPropHelper.getDamageMaxAHit(locHero,t_monsterData,mUserData.lvl);
                locMaxHurt = locMaxHurt*(1+t_otherBuff[1].addHurt/10000);
                locMaxHurt = parseInt(locMaxHurt);
                b_userData.heroMaxHurt[locHero.id] = locMaxHurt*2;//临时加两倍
            }
            b_userData.heroMaxHurt[-1] = 100000;
            //todo 判断cd
            b_userData.isStartFight = 1;
            g_boss.getBossObj(bossId).setUserData(userId, b_userData);
            var myGuildId = g_data.getGuildId(userId);
            _enterGuild(userId,myGuildId,bossId);

            if(g_bossData.type == c_prop.worldBossTypeKey.guild && b_userData.isFirstStart==1){
                userDao.selectCols(client, "id,lvl,nickName,iconId,vip,counts,countsRefreshTime", "id = ?", [userId], function (err, userData) {
                    if(err) return cb(err);

                    if(g_bossData.callUserGuildId != myGuildId){
                        var num = userUtils.getTodayCount(userData,c_prop.userRefreshCountKey.enterBoss);
                        var numLimit = c_game.worldBossCfg[9];
                        if(num>=numLimit) return cb(getMsg(c_msgCode.noBossTime));
                        userUtils.addTodayCount(userData,c_prop.userRefreshCountKey.enterBoss,1);
                    }

                    var updateUser = {
                        counts:userData.counts,
                        countsRefreshTime:userData.countsRefreshTime
                    }

                    userDao.update(client,updateUser,{id:userData.id},function(err,data){
                        if(err) return cb(err);
                        b_userData.isFirstStart = 0;

                        var bossData = new ds.BossData();
                        bossData.isFirstEnter = 0;
                        var exBossData = new ds.ExBossData();
                        exBossData.bossData = bossData;
                        exBossData.userData = updateUser;
                        cb(null, exBossData);
                    });
                });
            }else{
                var bossData = new ds.BossData();
                bossData.isFirstEnter = 0;

                var exBossData = new ds.ExBossData();
                exBossData.bossData = bossData;
                cb(null,exBossData);
            }

        });
    });

};

//离开战斗
exports.exitFight = function (client, userId, bossId, cb) {
    var g_userObj = g_boss.getUserObj(userId);
    g_userObj.lastExitTime = new Date();
    g_boss.setUserObj(userId, g_userObj);

    if (!g_boss.getBossObj(bossId).hasUserData(userId)) return cb(null);
    var userData = g_boss.getBossObj(bossId).getUserData(userId);
    if (!userData.isStartFight) return cb(null);
    userData.isStartFight = false;
    g_boss.getBossObj(bossId).setUserData(userId, userData);
    cb(null);
};

//离开所有战斗
exports.exitAllFight = function (client, userId,  cb) {
    var bossCache = g_boss.getBossCache();
    for(var key in bossCache){
        var locBossId = key;
        if (!g_boss.getBossObj(locBossId).hasUserData(userId)) continue;
        var userData = g_boss.getBossObj(locBossId).getUserData(userId);
        if (!userData.isStartFight) continue;
        userData.isStartFight = false;

        var g_userObj = g_boss.getUserObj(userId);
        g_userObj.lastExitTime = new Date();
        g_boss.setUserObj(userId, g_userObj);

        g_boss.getBossObj(locBossId).setUserData(userId, userData);
    }
    cb(null);
};

//清除cd
exports.clearFightCd = function (client, userId, cb) {
    userDao.selectCols(client, "id,diamond,buyDiamond,giveDiamond", "id = ?", [userId], function (err, userData) {
        if (err) return cb(err);
        var costDiamond = c_game.worldBossCfg[2];
        if (userData.diamond < costDiamond) {
            return cb(getMsg(c_msgCode.noDiamond));
        }

        userUtils.reduceDiamond(userData, costDiamond);
        var g_userObj = g_boss.getUserObj(userId);
        g_userObj.lastExitTime = (new Date()).addDays(-10);//设置为很久之前
        g_boss.setUserObj(userId, g_userObj);

        var updateUser = {
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond
        };
        userDao.update(client, updateUser, {id: userId}, function () {
            if (err) return cb(err);
            cb(null, [updateUser,costDiamond]);
        });
    });
};


//造成伤害
exports.hurt = function (client, userId,bossId, hurtDic, isEnd ,mData,hurtArr,cb) {
    userDao.select(client, {id:userId}, function(err, userDbData){
        if(err) return cb(err);
        var bossData = new ds.BossData();

        var g_bossData = g_boss.getBossObj(bossId).getBossData();
        if (!g_boss.getBossObj(bossId).isOpen() || !g_bossData){
            bossData.isOver = 1;
            return cb(null, [bossData,null]);
        }
        var userData = g_boss.getBossObj(bossId).getUserData(userId);
        if (!userData.isStartFight) return cb("未进入战斗!");

        //临时去掉
        /*
         var getMdata = bossUtils.mData(userData.myKey, hurtDic,isEnd);
         if(getMdata!=mData) return cb("数据错误!");
         */


        var hurtData =  _calHurt(hurtDic,hurtArr,userData.heroMaxHurt);
        var hurt = hurtData[0];
        var curHurt = hurtData[1];
        /*
         if (g_bossData.endTime.isBefore(new Date())) {
         return cb("boss活动已经结束!");
         }
         */

        //不是最后一下
        if(!isEnd){
            //5秒限制,防加速
            if(!userData.lastHurtTime){
                userData.lastHurtTime = new Date();
            }else{
                var difMilliseconds = userData.lastHurtTime.clone().getMillisecondsBetween(new Date());
                if(difMilliseconds<2.5*1000){
                    hurt = 0;
                    curHurt = 0;
                }
            }
        }

        userData.lastHurtTime = new Date();

        var items = {};
        var treasureEntity = new TreasureEntity();
        var lootTreasureNum = 0;
        if (g_bossData.isOver) {
            bossData.curHp = g_bossData.curHp;
            bossData.myHurt = userData.hurt;//我的伤害
            bossData.myRank = userData.rank;//我的伤害
            bossData.isOver = 1;
            return cb(null, [bossData,null]);
        }else{

            g_bossData.curHp -= curHurt;
            userData.hurt += hurt;

            if (g_bossData.curHp <= 0) {
                g_bossData.curHp = 0;
                g_bossData.killUserId = userId;//击杀人的id
                g_bossData.killUserName = userData.userName;//击杀人的名字
                g_bossData.deathTime = new Date();//死亡时间
                bossData.isOver = 1;
                chatBiz.addSysData(40, [g_bossData.bossName,userData.userName]);
                var bossCfgData = c_bossWorld[bossId];
                treasureEntity.userId = userId;

                if(g_bossData.type ==c_prop.worldBossTypeKey.world && bossCfgData) {
                    var treasureItem = bossCfgData.treasureAward;
                    if(treasureItem && treasureItem.length == 2) {
                        items[treasureItem[0]] = treasureItem[1];
                        lootTreasureNum = treasureItem[1];
                        treasureEntity.treasureId = treasureItem[0];
                        treasureEntity.openTime = new Date();
                        var treasureItemName = t_item[treasureItem[0]].name;
                        var color = t_item[treasureItem[0]].color;
                        chatBiz.addSysData(74, [color,treasureItemName, userDbData.nickName]);

                    }
                }
                _overBoss(client,bossId,1,function(){});
            }


            _sendMsg(35,g_bossData);
            _sendMsg(38,g_bossData);
            var bagItem = {};
            if(g_bossData.type == c_prop.worldBossTypeKey.world){
                var addNum = _sendTreasureMsg(74, g_bossData, userDbData, bossId, items, treasureEntity);
                lootTreasureNum += addNum;
            }

            bossData.curHp = g_bossData.curHp;//
            bossData.myHurt = userData.hurt;//我的伤害
            bossData.myRank = userData.rank;//我的伤害
            userData.myKey = 0|Math.random()*1000;//字符串
            bossData.myKey = userData.myKey;//字符串

            var itemsArr = userUtils.saveItems(userDbData, items);
            if (Object.keys(itemsArr[0]).length > 0) bagItem = propUtils.mergerProp(bagItem, itemsArr[0]);
            if (g_bossData.curHp <= 0 || treasureEntity.userId ){
                var updateUser = {
                    bag : userDbData.bag
                };

                async.parallel([
                    function(cb1){
                        userDao.update(client, updateUser, {id:userId},cb1);
                    },
                    function(cb1){
                        if(g_bossData.type ==c_prop.worldBossTypeKey.world){
                            var insertList = [];
                            for(var i=0; i < lootTreasureNum; i++){
                                insertList.push(treasureEntity);
                            }
                            treasureDao.insertList(client, insertList, function (err, data) {
                                if (err) return cb1(err);
                                var insertId = data.insertId;
                                var affectedRows = data.affectedRows;
                                for(var i = 0; i<affectedRows; i++) {
                                    var newO = _cloneOBj(treasureEntity);
                                    newO.id = i+insertId;
                                    newO.openTime = new Date();
                                    newO.item = null;
                                    g_incognito.setTreasureInfoById(newO.id, newO);
                                    g_incognito.setTreasureOpenTimeOut(newO);
                                }
                                cb1(null);
                            });
                        }else {
                            cb1(null);
                        }
                    }
                ],function(err, data){
                    if(err) return cb(err);
                    if(g_bossData.type ==c_prop.worldBossTypeKey.world) {
                        treasureBiz.insertTreasureRecord(client, c_prop.treasureRecordTypeKey.getTreasure, userDbData, treasureEntity.treasureId, {}, function (err, data2) {
                            if (err) {
                                console.log(err)
                            }
                        });
                    }
                    return cb(null, [bossData, bagItem])
                });
            }else {
                return cb(null, [bossData, null]);
            }
        }
    });
};

var _sendMsg = function(msgId,g_bossData){
    var c_chatSysData = c_chatSys[msgId];
    for(var i = 0;i<c_chatSysData.arg.length;i++){
        var locArg = c_chatSysData.arg[i];
        if(g_bossData.curHp<g_bossData.originHp*locArg/100&&g_bossData.sendNoHpMsgArr.indexOf(locArg)<0){
            g_bossData.sendNoHpMsgArr.push(locArg);
            chatBiz.addSysData(msgId, [g_bossData.bossName,locArg]);
            break;
        }
    }
};

var _sendTreasureMsg = function(msgId, g_bossData, userData, bossId, items,treasureEntity){
    var c_chatSysData = c_chatSys[msgId];
    var addNum = 0
    for(var i=0; i<c_chatSysData.arg.length;i++){
        var locArg = c_chatSysData.arg[i];
        if(g_bossData.curHp < g_bossData.originHp*locArg/100&g_bossData.sendTreasureMsgArr.indexOf(locArg)<0){
            g_bossData.sendTreasureMsgArr.push(locArg);
            var bossCfgData = c_bossWorld[bossId];
            if(!bossCfgData) return;
            var item = bossCfgData.treasurePercentAward;
            var num = items[item[0]] || 0;
            items[item[0]] = num + item[1];
            addNum += item[1];
            var treasureItemName = t_item[item[0]].name;
            var color = t_item[item[0]].color;
            treasureEntity.userId = userData.id;
            treasureEntity.treasureId = item[0];
            treasureEntity.openTime = new Date();
            chatBiz.addSysData(msgId, [color,treasureItemName, userData.nickName]);
        }
    }
    return addNum;
}


var _calHurt = function(hurtDic,hurtArr,heroMaxHurt){
    var hurt = 0;
    var curHurt = 0;
    hurtDic = hurtDic || {};
    hurtArr = hurtArr || [0,0];
    var curHurtCount = hurtArr[0];
    var curHurtNum = hurtArr[1];
    var tempHurtCount = 0;
    var tempHurtNum = 0;
    //console.log("hurtDic:",hurtDic);
    //console.log("hurtArr:",hurtArr);
    for (var key in hurtDic) {
        var locHeroData = hurtDic[key]||[0,0];
        var locHurt = locHeroData[0]||0;
        var locNum = locHeroData[1]||0;
        var locCurHurt = locHeroData[2]||0;

        locHurt = parseInt(locHurt) || 0;
        locNum = parseInt(locNum) || 0;

        tempHurtCount+=locHurt;
        tempHurtNum+=locNum;

        if(locHurt<=0||locNum<=0) continue;

        var locSingleHurt = locHurt/locNum;

        var locMaxHurt = heroMaxHurt[key]||0;
        if(locSingleHurt>locMaxHurt){
            locHurt = locMaxHurt*locNum;
            locCurHurt = locMaxHurt*locNum;
        }
        hurt += locHurt;
        curHurt += locCurHurt;
    }

    if(curHurtCount!=tempHurtCount||curHurtNum!=tempHurtNum){
        hurt = 0;
        curHurt = 0;
    }

    hurt = hurt<0?0:hurt;
    curHurt = curHurt<0?0:curHurt;
    return [hurt,curHurt];
};

exports.getBossResult = function (client, userId, bossId,originBossId,cb) {
    var bossObj = g_boss.getBossObj(bossId);
    if(bossObj.isOpen()){
        var userData = bossObj.getUserData(userId);
        var g_bossData = bossObj.getBossData();
        var bossResult = new ds.BossResult();
        if (g_bossData.curHp > 0) {
            bossResult.isWin = 0;//是否胜利
        } else {
            bossResult.isWin = 1;//是否胜利
        }

        bossResult.totalHurt = userData.hurt;//累计伤害
        bossResult.myHurtRank = userData.rank;//我的伤害排名
        if(g_bossData.type == c_prop.worldBossTypeKey.guild){
            bossResult.hurtGold = bossUtils.getHurtGold(g_bossData.bossId,userData.hurt);//伤害奖励
            var locItems = {};
            //第一名奖励	二到五名奖励	六到10名奖励
            //rankAward1	rankAward2	rankAward3
            if(userData.rank==1){
                locItems = bossUtils.getAwardItems(g_bossData.bossId,c_prop.bossAwardTypeKey.rankAward1);
            }
            if(userData.rank>=2&&userData.rank<=5){
                locItems = bossUtils.getAwardItems(g_bossData.bossId,c_prop.bossAwardTypeKey.rankAward2);
            }
            if(userData.rank>=6&&userData.rank<=10){
                locItems = bossUtils.getAwardItems(g_bossData.bossId,c_prop.bossAwardTypeKey.rankAward3);
            }
            bossResult.items = locItems;
        }else if(g_bossData.type == c_prop.worldBossTypeKey.world){
            bossResult.hurtGold = 0;
            bossResult.items = bossUtils.getWorldAwardItems(bossId,c_prop.bossAwardTypeKey.hurtAward,bossResult.isWin,userData.rank);
        }

        bossResult.killTotalTime = g_bossData.startTime.getSecondsBetween(new Date());//击杀耗时
        var firstUserData = _getFirstRankUser(bossId);
        if (firstUserData) {
            bossResult.firstHurtName = firstUserData.userName;//伤害第一的名字
        }
        bossResult.killUserName = g_bossData.killUserName;//最后一击的名字
        bossResult.bossId = g_bossData.bossId;
        cb(null, bossResult);
    }else{
        bossDao.select(client,{originBossId:originBossId},function(err,bossData){
            if(err) return(err);
            var bossSaveResult = bossData.resultData;
            var hurtDic = bossSaveResult.hurtDic;
            var myHurtData = hurtDic[userId]||[0,0];
            var myHurt = myHurtData[0];
            var myRank = myHurtData[1];
            var bossResult = new ds.BossResult();
            bossResult.isWin = bossSaveResult.isWin;//是否胜利
            bossResult.totalHurt = myHurt;//累计伤害
            bossResult.myHurtRank = myRank;//我的伤害排名

            if(bossData.type == c_prop.worldBossTypeKey.guild){
                bossResult.hurtGold = bossUtils.getHurtGold(bossData.bossId,myHurt);//伤害奖励
                var locItems = {};
                //第一名奖励	二到五名奖励	六到10名奖励
                //rankAward1	rankAward2	rankAward3
                if(myRank==1){
                    locItems = bossUtils.getAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.rankAward1);
                }
                if(myRank>=2&&myRank<=5){
                    locItems = bossUtils.getAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.rankAward2);
                }
                if(myRank>=6&&myRank<=10){
                    locItems = bossUtils.getAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.rankAward3);
                }
                bossResult.items = locItems;
            }else if(bossData.type == c_prop.worldBossTypeKey.world){
                bossResult.hurtGold = 0;
                bossResult.items = bossUtils.getWorldAwardItems(bossId,c_prop.bossAwardTypeKey.hurtAward,bossResult.isWin,myRank);
            }

            bossResult.killTotalTime = bossSaveResult.killTotalTime;//击杀耗时
            bossResult.firstHurtName = bossSaveResult.firstHurtName;//伤害第一的名字
            bossResult.killUserName = bossSaveResult.killUserName;//最后一击的名字
            bossResult.bossId = bossData.bossId;
            cb(null, bossResult);
        });

/*        var bossResult = new ds.BossResult();
        cb(null, bossResult);*/
    }
};


exports.getResultData = function (client, userId,originBossId,cb) {
    bossDao.select(client,{originBossId:originBossId},function(err,bossData){
        if(err) return(err);
        var resultData = bossData.resultData;
        var userIds = [];
        //获取用户名
        var rank10 = resultData.rank10||[];
        for(var i = 0;i<rank10.length;i++){
            if(i<5){
                userIds.push(rank10[i]);
            }
        }
        var callUserId = resultData.callUserId;
        if(callUserId) userIds.push(callUserId);

        _getUserNamesData(client,userIds,function(err,userNamesData){
            if(err) return(err);
            var reData = [];
            reData[0] = userNamesData[rank10[0]];
            reData[1] = userNamesData[rank10[1]];
            reData[2] = userNamesData[rank10[2]];
            reData[3] = userNamesData[rank10[3]];
            reData[4] = userNamesData[rank10[4]];

            var bossResultData = new ds.BossResultData();
            bossResultData.rank5 = [];
            for(var i = 0;i<rank10.length;i++){
                if(i<7){
                    bossResultData.rank5.push(userNamesData[rank10[i]]||"无");
                }
            }
            bossResultData.callUserName = userNamesData[callUserId]||"无";//召唤者
            bossResultData.callGuildName = resultData.callGuildName||"无";//召唤公会
            bossResultData.firstHurtName = resultData.firstHurtName||"无";//伤害第一的名字
            bossResultData.killUserName = resultData.killUserName||"无";//最后一击的名字
            var hurtDic = resultData.hurtDic||{};
            var myHurt = hurtDic[userId]||[];
            bossResultData.myHurt = myHurt[0]||0;//我的伤害
            bossResultData.isWin = resultData.isWin;
            cb(null, bossResultData);
        });
    });
};

var _getUserNamesData = function(client,userIds,cb){
    var userNamesData = {};
    if(userIds.length<=0) return cb(null, userNamesData);
    userDao.listCols(client,"id,nickName","id in (?)",[userIds],function(err,userList){
        if(err) return(err);
        for(var i = 0;i<userList.length;i++){
            var locUserData = userList[i];
            userNamesData[locUserData.id] = locUserData.nickName;
        }
        cb(null, userNamesData);
    });
};

//鼓舞
exports.inspire = function (client, userId,bossId, cb) {
    var myGuildId = g_data.getGuildId(userId);
    var myGuild = g_guild.getGuild(myGuildId);
    if (!myGuild) {
        return cb("加入公会才能鼓舞");
    }
    userDao.selectCols(client, "id,diamond,buyDiamond,giveDiamond,nickName", "id = ?", [userId], function (err, userData) {
        if (err) return cb(err);
        var costDiamond =  c_game.worldBossCfg[3];
        if (userData.diamond < costDiamond) {
            return cb(getMsg(c_msgCode.noDiamond));
        }
        userUtils.reduceDiamond(userData, costDiamond);

        var b_guildData = g_boss.getBossObj(bossId).getGuildData(myGuildId);
        var inspireEndTime = b_guildData.inspireEndTime;
        if (inspireEndTime.isBefore(new Date())) {
            inspireEndTime = new Date();
        }
        var conTime = t_otherBuff[1].conTime;
        inspireEndTime.addSeconds(conTime);
        b_guildData.inspireEndTime = inspireEndTime;
        b_guildData.inspireNum += 1;
        b_guildData.inspireRecordArr.push(userData.nickName);
        if (b_guildData.inspireRecordArr.length > 10) {
            b_guildData.inspireRecordArr.shift();
        }

        g_boss.getBossObj(bossId).setGuildData(b_guildData.guildId, b_guildData);
        var g_userData = g_boss.getBossObj(bossId).getUserData(userId);
        chatBiz.addSysData(39, [g_userData.guildName,userData.nickName]);

        var updateUser = {
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond
        };

        var updateBossData = {
            inspireEndTime: inspireEndTime,
            inspireNum: b_guildData.inspireNum
        };
        userDao.update(client, updateUser, {id: userId}, function (err, data) {
            if (err) return cb(err);
            return cb(null, [updateUser, updateBossData, costDiamond]);
        })
    });
};

//获取鼓舞列表
exports.getInspireRecordArr = function (client, userId, bossId, cb) {
    var myGuildId = g_data.getGuildId(userId);
    var myGuild = g_guild.getGuild(myGuildId);
    if (!myGuild) return cb(null, []);
    var b_guildData = g_boss.getBossObj(bossId).getGuildData(myGuildId);
    cb(null, b_guildData.inspireRecordArr);
};

//获取鼓舞次数
exports.getInspireNum = function (userId,bossId) {
    if (!g_boss.getBossObj(bossId).isOpen()) return 0;

    var myGuildId = g_data.getGuildId(userId);
    var myGuild = g_guild.getGuild(myGuildId);
    if (!myGuild) return 0;
    var b_guildData = g_boss.getBossObj(bossId).getGuildData(myGuildId);
    return b_guildData.inspireNum;
};

//获取鼓舞
exports.syncInspire = function (client, userId, bossId,cb) {
    var myGuildId = g_data.getGuildId(userId);
    var myGuild = g_guild.getGuild(myGuildId);
    if (!myGuild) return cb(null, {});

    var b_guildData = g_boss.getBossObj(bossId).getGuildData(myGuildId);
    var reBossData = {
        inspireEndTime: b_guildData.inspireEndTime,
        inspireNum: b_guildData.inspireNum
    };
    cb(null, reBossData);
};

//获取第一名
exports.getFirstHurtRank = function (bossId) {
    var locUserData = _getFirstRankUser(bossId);
    if (!locUserData){
        var locR = new ds.BossHurtRank();
        locR.userId = 0;
        locR.rank = 0;//排行
        locR.icon = 0;//头像id
        locR.userName = "无";//用户名
        locR.guildName = "无";//公会名
        locR.hurt = 0;//伤害
        locR.vip = 0;//头像id
        return locR;
    }else{
        var locR = new ds.BossHurtRank();
        locR.userId = locUserData.userId;
        locR.rank = locUserData.rank;//排行
        locR.icon = locUserData.icon;//头像id
        locR.userName = locUserData.userName;//用户名
        locR.guildName = locUserData.guildName;//公会名
        locR.hurt = locUserData.hurt;//伤害
        locR.vip = locUserData.vip;//头像id
        return locR;
    }
};

//获取前20伤害排名
exports.getHurtRankList = function (bossId) {
    var list = g_boss.getBossObj(bossId).getRankUserList();
    if (list.length <= 0) return [];
    var reList = [];
    for (var i = 0; i < 20; i++) {
        var locUserData = list[i];
        if(!locUserData) continue;
        var locR = new ds.BossHurtRank();
        locR.userId = locUserData.userId;
        locR.rank = locUserData.rank;//排行
        locR.icon = locUserData.icon;//头像id
        locR.userName = locUserData.userName;//用户名
        locR.guildName = locUserData.guildName;//公会名
        locR.hurt = locUserData.hurt;//伤害
        locR.vip = locUserData.vip;//伤害
        reList.push(locR);
    }
    return reList;
};


/**
 * 发送boss奖励
 * @param client
 * @param resultData
 * @param isWin
 * @param cb
 */
exports.sendAward = function (client, bossData, resultData,isWin, cb) {
    if(bossData.type == c_prop.worldBossTypeKey.guild){
        _sendGuildAward(client, bossData, resultData,isWin, cb)
    } else if(bossData.type == c_prop.worldBossTypeKey.world){
        _sendWorldAward(client, bossData, resultData,isWin,  cb)
    }else{
        cb();
    }
};

exports.openWorldBoss = function(client,originBossId,cb){
    bossDao.select(client,{originBossId:originBossId},function(err,bossData){
        if(err) return cb(err);
        var updateBossData = {
            startTime: new Date(),
            status: consts.bossStatus.open
        };
        _openWorldBoss(client,bossData.bossId,bossData.originBossId);
        bossDao.update(client, updateBossData, {id: bossData.id}, cb);
    });
};

exports.preWorldMsg = function(bossId,minutes){
    var t_monsterData = t_monster[bossId];
    chatBiz.addSysData(73, [t_monsterData.name,minutes]);
};

var _openWorldBoss = function(client,bossId,originBossId){
    var t_monsterData = t_monster[bossId];
    var bossOpt = {};
    bossOpt.originHp = t_monsterData.maxHp;
    bossOpt.curHp = t_monsterData.maxHp;
/*    bossOpt.originHp = 50000;
    bossOpt.curHp = 50000;*/
    bossOpt.bossId = bossId;//boss的id
    bossOpt.bossName = t_monsterData.name;
    bossOpt.startTime = new Date();
    bossOpt.type = c_prop.worldBossTypeKey.world;
    bossOpt.originBossId = originBossId;
    chatBiz.addSysData(72, [t_monsterData.name]);
    g_boss.getBossObj(bossId).openWorldBoss(bossOpt,function(){
        _setTimeOver(client,bossId);
    });
};

var _sendGuildAward = function(client, bossData, resultData, isWin, cb){
    if(!isWin) return cb();
    var insertList = [];

    var bossParameterData = c_bossParameter[bossData.bossId];

    //行会boss奖励
    //前十排名奖
    for(var i = 0 ;i<resultData.rank10.length;i++){
        var locRank = i+1;
        var locUserId = resultData.rank10[i];
        var locReplaceArgs = [locRank];
        var locItems = {};
        //第一名奖励	二到五名奖励	六到10名奖励
        //rankAward1	rankAward2	rankAward3
        if(locRank==1){
            locItems = bossUtils.getAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.rankAward1);
        }
        if(locRank>=2&&locRank<=5){
            locItems = bossUtils.getAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.rankAward2);
        }
        if(locRank>=6&&locRank<=10){
            locItems = bossUtils.getAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.rankAward3);
        }
        if(locRank>=11&&locRank<=20){
            locItems = bossUtils.getAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.rankAward4);
        }
        //c_prop.bossAwardTypeKey.rankAward1
        var mailType = c_prop.mailTypeKey.rankAward;
        if(bossParameterData&&bossParameterData.isLimit){
            mailType = c_prop.mailTypeKey.rankAwardLimit;
        }
        var locMail = mailBiz.createEntityByType(locUserId, mailType, locReplaceArgs, locItems);
        insertList.push(locMail);
    }
    //召唤者id
    var callItems = bossUtils.getAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.summonAward);
    var mailType = c_prop.mailTypeKey.summonAward;
    if(bossParameterData&&bossParameterData.isLimit){
        mailType = c_prop.mailTypeKey.summonAwardLimit;
    }
    var locMail = mailBiz.createEntityByType(bossData.callUserId, mailType, [], callItems);
    insertList.push(locMail);

    //公会id
    var guildItems = bossUtils.getAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.guildAward);
    for(var i = 0 ;i<resultData.guildUserIds.length;i++){
        var locUserId = resultData.guildUserIds[i];
        //c_prop.bossAwardTypeKey.rankAward1
        var mailType = c_prop.mailTypeKey.guildAward;
        if(bossParameterData&&bossParameterData.isLimit){
            mailType = c_prop.mailTypeKey.guildAwardLimit;
        }
        var locMail = mailBiz.createEntityByType(locUserId, mailType, [bossData.callUserName], guildItems);
        insertList.push(locMail);
    }

    //伤害数据
    for(var  key in resultData.hurtDic){
        var locUserId = key;
        var locData = resultData.hurtDic[key];
        var locHurt = locData[0];
        var locHurtItems = bossUtils.getAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.hurtAward,locHurt);
        //c_prop.bossAwardTypeKey.rankAward1
        var mailType = c_prop.mailTypeKey.hurtAward;
        if(bossParameterData&&bossParameterData.isLimit){
            mailType = c_prop.mailTypeKey.hurtAwardLimit;
        }
        var locMail = mailBiz.createEntityByType(locUserId, mailType, [locHurt], locHurtItems);
        insertList.push(locMail);
    }

    //最后一击
    var killItems = bossUtils.getAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.lastShotAward);
    var mailType = c_prop.mailTypeKey.killAward;
    if(bossParameterData&&bossParameterData.isLimit){
        mailType = c_prop.mailTypeKey.killAwardLimit;
    }
    var locMail = mailBiz.createEntityByType(bossData.killUserId, mailType, [], killItems);
    insertList.push(locMail);

    mailDao.insertList(client, insertList, function (err, data) {
        if (err) return cb(err);
        cb(null);
    });
};

var _sendWorldAward = function(client, bossData, resultData, isWin, cb){
    var insertList = [];
    var t_monsterData = t_monster[bossData.bossId];
    //伤害奖
    for(var  key in resultData.hurtDic){
        var locUserId = key;
        var locData = resultData.hurtDic[key];
        var locHurt = locData[0];
        var locRank = locData[1];
        var locHurtItems = bossUtils.getWorldAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.hurtAward,isWin,locRank);
        //c_prop.bossAwardTypeKey.rankAward1
        if(isWin){
            var locMail = mailBiz.createEntityByType(locUserId, c_prop.mailTypeKey.worldBossWin, [t_monsterData.name,locRank], locHurtItems);
            insertList.push(locMail);
        }else{
            var locMail = mailBiz.createEntityByType(locUserId, c_prop.mailTypeKey.worldBossLose, [t_monsterData.name,locRank], locHurtItems);
            insertList.push(locMail);
        }
    }

    if(isWin){
        //最后一击
        var killItems = bossUtils.getWorldAwardItems(bossData.bossId,c_prop.bossAwardTypeKey.lastShotAward);
        var locMail = mailBiz.createEntityByType(bossData.killUserId, c_prop.mailTypeKey.worldBossLastKill, [t_monsterData.name], killItems);
        insertList.push(locMail);
    }
    mailDao.insertList(client, insertList, function (err, data) {
        if (err) return cb(err);
        cb(null);
    });
};

var _enterGuild = function(userId,myGuildId,bossId){
    var g_bossData = g_boss.getBossObj(bossId).getBossData();
    if(g_bossData.callUserGuildId!=myGuildId) return ;
    var b_guildData = g_boss.getBossObj(bossId).getGuildData(myGuildId);
    if(b_guildData.fightUserIds.indexOf(userId)>-1) return;
    b_guildData.fightUserIds.push(userId);
};

var _getGUserData = function (client, userId, bossId, cb) {
    if (!g_boss.getBossObj(bossId).hasUserData(userId)) {
        userDao.selectCols(client, "id,lvl,nickName,iconId,vip", "id = ?", [userId], function (err, data) {
            if (err) return cb(err);
            var userData = g_boss.getBossObj(bossId).getUserData(userId);
            userData.userName = data.nickName;
            userData.icon = data.iconId;
            userData.vip = data.vip;
            userData.key = Date.now();
            var myGuildId = g_data.getGuildId(userId);
            var myGuild = g_guild.getGuild(myGuildId);
            if (myGuild) {
                userData.guildName = myGuild.name;
            }
            cb(null, userData);
        });
    } else {
        var userData = g_boss.getBossObj(bossId).getUserData(userId);
        cb(null, userData)
    }
};


var _overBoss = function(client,bossId,isWin,cb){
    var rank10 = [];//前十
    var callUserId = null;//召唤者id
    var guildUserIds = [];//公会id
    var hurtDic = {};//伤害数据


    var g_bossData = g_boss.getBossObj(bossId).getBossData();
    if(g_bossData.isOver) return cb();

    var endPrize = c_game.worldBossCfg[8];
    setTimeout(function(){
        bossDao.update(client,{status:0},{originBossId:g_bossData.originBossId},function(err){
            g_boss.getBossObj(bossId).reset();
        });
    },(endPrize-5)*1000);

    g_bossData.isOver = 1;

    g_boss.getBossObj(bossId).calDpsRank();

    var list = g_boss.getBossObj(bossId).getRankUserList();
    for (var i = 0; i < 20; i++) {
        var locUserData = list[i];
        if(!locUserData) continue;
        rank10.push(locUserData.userId);
    }

    callUserId = g_bossData.callUserId;
    var g_guildData = g_boss.getBossObj(bossId).getGuildData(g_bossData.callUserGuildId);
    guildUserIds = g_guildData.fightUserIds.concat([]);

    var allUserData = g_boss.getBossObj(bossId).getAllUserData();
    for(var key in allUserData){
        var locUserId = parseInt(key);
        var locUserData = allUserData[key];
        if(locUserData.hurt>0){
            hurtDic[locUserId] = [locUserData.hurt,locUserData.rank];
        }
    }

    var saveData = new ds.BossSaveResult();
    saveData.rank10 = rank10;//前十
    saveData.callUserId = callUserId;//召唤者id
    saveData.guildUserIds = guildUserIds;//公会id
    saveData.hurtDic = hurtDic;//伤害数据
    saveData.callGuildName = g_bossData.callUserGuildName;
    var updateBoss = {};
    /** 结束时间 **/
    updateBoss.endTime = new Date();/*结束时间*/
    /** 击杀人的id **/
    updateBoss.killUserId = g_bossData.killUserId;/*击杀人的id*/
    updateBoss.deathBossId = bossId;
    if(isWin){
        /** 死亡时间 **/
        updateBoss.deathTime = new Date();/*死亡时间*/
        var nextBossId = g_bossData.bossId +1;
        if(c_bossWorld[nextBossId]){
            updateBoss.bossId = nextBossId;
        }

        //第一个%s：世界BOSS名字
        //第二个%s：伤害第一的玩家名
        var firstRank = exports.getFirstHurtRank(bossId);
        chatBiz.addSysData(36, [g_bossData.bossName,firstRank.userName]);
    }else{
        var nextBossId = g_bossData.bossId -1;
        if(c_bossWorld[nextBossId]){
            updateBoss.bossId = nextBossId;
            updateBoss.deathBossId = nextBossId;
        }
        chatBiz.addSysData(37, [g_bossData.bossName]);
    }

    /** 状态 **/
    updateBoss.status = 2;/*状态 0:未开启 1:开启中*/
    /** 最后一次是否胜利 **/
    updateBoss.lastIsWin = isWin;/*最后一次是否胜利*/
    /** 结算数据 **/
    updateBoss.resultData = saveData;/*结算数据*/
    /** 是否结算奖励 **/
    updateBoss.isPrize = 0;/*是否结算奖励*/

    saveData.isWin = isWin;//是否胜利
    saveData.killTotalTime = g_bossData.startTime.getSecondsBetween(new Date());//击杀耗时
    var firstUserData = _getFirstRankUser(bossId);
    if (firstUserData) {
        saveData.firstHurtName = firstUserData.userName;//伤害第一的名字
    }

    saveData.killUserName = g_bossData.killUserName;//最后一击的名字


    bossDao.update(client,updateBoss,{originBossId:g_bossData.originBossId},function(err){
        if(err) return cb(err);
        exports.sendAward(client, g_bossData, updateBoss.resultData, isWin, function(err){
            if(err) return cb(err);
            bossDao.update(client,{isPrize:1},{originBossId:g_bossData.originBossId},function(err){
                if(err) return cb(err);
                cb(null);
            });
        });
    });
};

var _initGuildBossList = function (client, cb) {
    var bossIDList = bossUtils.getGuildBossIds();
    bossDao.listCols(client, "bossId,type", " type = ? ", [c_prop.worldBossTypeKey.guild], function (err, bossList) {
        if (err) return cb(err);
        var ownBossIds = [];
        for (var j = 0; j < bossList.length; j++) {
            var locBoss = bossList[j];
            ownBossIds.push(locBoss.bossId);
        }

        var insertList = [];
        for (var i = 0; i < bossIDList.length; i++) {
            var locBossId = bossIDList[i];
            if (ownBossIds.indexOf(locBossId) == -1) {
                var bossParameterData = c_bossParameter[locBossId];
                if(!bossParameterData.isOpen) continue;

                var bossEntity = new BossEntity();
                bossEntity.bossId = locBossId;
                bossEntity.startTime = null;
                bossEntity.endTime = null;
                bossEntity.killUserId = null;
                bossEntity.deathTime = null;
                bossEntity.type = c_prop.worldBossTypeKey.guild;
                bossEntity.originBossId = locBossId;

                if(bossParameterData.isLimit){
                    bossEntity.isLimit = 1;
                    if(bossParameterData.startTime){
                        bossEntity.limitStartTime = new Date(bossParameterData.startTime);
                    }
                    if(bossParameterData.endTime){
                        bossEntity.limitEndTime = new Date(bossParameterData.endTime);
                    }
                }
                bossEntity.week = bossParameterData.week;
                insertList.push(bossEntity);
            }
        }

        if (insertList.length > 0) {
            bossDao.insertList(client, insertList, cb);
        } else {
            cb();
        }
    });
};


var _initWorldBossList = function (client, cb) {
    var bossIDList = bossUtils.getWorldBossIds();
    bossDao.listCols(client, "bossId,type,originBossId", " type = ? ", [c_prop.worldBossTypeKey.world], function (err, bossList) {
        if (err) return cb(err);
        var ownBossIds = [];
        for (var j = 0; j < bossList.length; j++) {
            var locBoss = bossList[j];
            ownBossIds.push(locBoss.originBossId);
        }

        var insertList = [];
        for (var i = 0; i < bossIDList.length; i++) {
            var locBossId = bossIDList[i];
            if (ownBossIds.indexOf(locBossId) == -1) {
                var bossEntity = new BossEntity();
                bossEntity.bossId = locBossId;
                bossEntity.startTime = null;
                bossEntity.endTime = null;
                bossEntity.killUserId = null;
                bossEntity.deathTime = null;
                bossEntity.type = c_prop.worldBossTypeKey.world;
                bossEntity.originBossId = locBossId;

                var bossParameterData = c_bossWorld[locBossId];
                if(bossParameterData.isLimit) bossEntity.isLimit = 1;
                insertList.push(bossEntity);
            }
        }

        if (insertList.length > 0) {
            bossDao.insertList(client, insertList, cb);
        } else {
            cb();
        }
    });
};

var _getFirstRankUser = function (bossId) {
    var list = g_boss.getBossObj(bossId).getRankUserList();
    if (list.length <= 0) return null;
    var locUserData = list[0];
    return locUserData;
};

var _setTimeOver = function(client,bossId){
    _overBoss(client,bossId,0,function(){});
};

var _hasFightingBoss = function(){
    var bossCache = g_boss.getBossCache();
    for(var key in bossCache){
        var locBossObj = bossCache[key];
        if(!locBossObj.isOpen()) continue;
        if(!locBossObj.getBossData().isOver) return true;
    }
    return false;
};

var _hasGuildFightingBoss = function(guildId){
   var bossCache = g_boss.getBossCache();
    for(var key in bossCache){
        var locBossObj = bossCache[key];
        if(!locBossObj.isOpen()) continue;
        if(locBossObj.getBossData().isOver) continue;
        if(guildId &&  guildId == locBossObj.getBossData().callUserGuildId){
            return true;
        }
    }
    return false;
};

/**
 * 初始化世界boss
 */
var _checkOpenWorldBoss = function (client,bossId, deathTime,originBossId) {
    deathTime = deathTime || (new Date()).addDays(-1);
    if(deathTime.equalsDay(new Date())) return ;
    var startOpenTime = bossUtils.getWorldOpenStartTime(bossId);
    var endOpenTime = bossUtils.getWorldOpenEndTime(bossId);
    if((new Date()).isAfter(startOpenTime)&&(new Date()).isBefore(endOpenTime)){
        _openWorldBoss(client,bossId,originBossId);
    }
};

var _cloneOBj = function(obj) {
    var newO = {};
    if(obj instanceof Array){
        newO = [];
    }
    for(var key in obj){
        var val = obj[key];
        newO[key] = typeof val === 'object' ? arguments.callee(val) : val;
    }
    return newO;
}


/*if(require.main = module){
    var treasureDao = require("uw-treasure").treasureDao;
    var uwClient = require("uw-db").uwClient;
    var insertList = [];
    var treasureEntity = new TreasureEntity();
    for(var i=0; i<4; i++){
        insertList.push(treasureEntity);
    }

    treasureDao.insertList(uwClient, insertList, function(err, dataList){
        if(err) return cb(err);
        var insertId = dataList.insertId;
        var affectedRows = dataList.affectedRows;
        var newList = {};
        for(var i = 0; i<affectedRows; i++){
            var newO = _cloneOBj(treasureEntity);
            newO.id = i+insertId;
            newList[newO.id] = newO;
        }

        //cb(null);
    })
}*/
