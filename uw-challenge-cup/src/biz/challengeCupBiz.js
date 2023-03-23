/**
 * Created by Administrator on 2016/1/4.
 */

var exports = module.exports;
var challengeCupDao = require("../dao/challengeCupDao");
var challengeCupRankDao  = require("../dao/challengeCupRankDao");
var async = require("async");
var uwData = require("uw-data");
var c_prop = uwData.c_prop;
var g_challengCup = require("uw-global").g_challengCup;
var mainClient = require("uw-db").mainClient;
var loginClient = require("uw-db").loginClient;
var mailBiz = require("uw-mail").mailBiz;
var c_game = require("uw-data").c_game;
var c_challengeCupRankReward = require("uw-data").c_challengeCupRankReward;
var uwClient = require("uw-db").uwClient;
var project = require("uw-config").project
var ds = require("uw-ds").ds;
var g_data = require("uw-global").g_data;
var g_guild = require("uw-global").g_guild;
var c_msgCode = uwData.c_msgCode;
var getMsg = require("uw-utils").msgFunc(__filename);
var ChallengeCupEntity = require('uw-entity').ChallengeCupEntity;
var heroBiz = require("uw-hero").heroBiz;
var userUtils = require("uw-user").userUtils;
var chatBiz = require("uw-chat").chatBiz;
var c_chatSys = require("uw-data").c_chatSys;
var consts = require("uw-data").consts;
var c_vip =  require("uw-data").c_vip;
var fightUtils = require("uw-utils").fightUtils;
var commonUtils = require("uw-utils").commonUtils;

var serverInfoDao = null;
var fiveDaysTargetDao = null;
var userDao = null;
var arenaRecordBiz =  null;

var expireDate = 5;//5分钟


var checkRequire = function(){
    arenaRecordBiz = require("uw-arena-record").arenaRecordBiz;
    serverInfoDao = serverInfoDao || require("uw-server-info").serverInfoDao;
    userDao = userDao || require("uw-user").userDao;
    fiveDaysTargetDao = fiveDaysTargetDao || require("uw-fiveDaysTarget").fiveDaysTargetDao;
};
/**
 * 取得王城擂主活动是否开启
 * @param client
 * @param userId
 * @param cb
 */
exports.getIsOpen = function(client, userId, cb){
    checkRequire();
    serverInfoDao.select(loginClient,{serverId:project.serverId},function(err,serverData) {
        if(err) return cb(err);
        var isOpen = g_challengCup.getIsOpen();
        var now = new Date();
        var openTime = new Date();
        if(!serverData) return cb("服务器信息有误");
        var serverDay = c_game.challengeCupCfg[0]-1;//4   开服第五天
        var day = _getDiffDay(serverData.serverDate, now);
        if (day<serverDay){
            openTime.addDays(serverDay-day).setHours(c_game.challengeCupCfg[7],0,0);
        }else {
            //需要整改
            var T = c_game.challengeCupCfg[6];
            var diffDay = (day-serverDay)%T;
            if(!diffDay) {
                var nowDate = new Date();
                if(isOpen) {
                    diffDay = T;
                }else{
                    if(nowDate.isBefore(nowDate.clone().setHours(c_game.challengeCupCfg[7],0,0))) {
                        diffDay  =0;
                    }else{
                        diffDay = T
                    }
                }
            }else {
                diffDay = T - diffDay;
            }
            openTime.addDays(diffDay).setHours(c_game.challengeCupCfg[7],0,0);
        }

        return cb(null, [isOpen, new Date(), openTime]);
    });
};

exports.trailer = function(cb){
    var beforeTime = {}, afterTime = {};
    var argsBefor = c_chatSys[47].arg || [];
    var argsAfter = c_chatSys[49].arg || [];
    for(var i=0; i<argsBefor.length; i++){
        beforeTime[argsBefor[i]] = true;
    }
    for(var i=0; i<argsAfter.length;i++){
        afterTime[argsAfter[i]] = true;
    }

    exports.getIsOpen(uwClient,0, function(err, data){
        if(err) return cb(err);
        var isOpen = data[0];
        var openTime = data[2];
        if(isOpen) {
            var now = new Date();
            var endTime = new Date();
            endTime.setHours(c_game.challengeCupCfg[8], 0, 0,0);
            var diff =  now.clone().getMinutesBetween(endTime);
            //console.log("*********"+diff);
            if (now.clone().isBefore(endTime) && afterTime[diff]) {
                chatBiz.addSysData(49, [diff]);
                chatBiz.addSysData(56, [diff]);
            }
        }else {
            var now = new Date();
            var diff = now.clone().getMinutesBetween(openTime);
            if (now.isBefore(openTime) && now.clone().isBefore(openTime) && beforeTime[diff]) {
                chatBiz.addSysData(47, [diff]);
                chatBiz.addSysData(54, [diff]);
            }
        }
        cb(null);
    })

}

/**
 * 获取王城擂主主信息
 * @param client
 * @param userId
 * @param cb
 */
exports.getInfo = function(client, userId, cb) {
   /* if(!g_challengCup.getIsOpen()){
        return cb("活动未开始");
    }*/
    //取数据库数据
    var locData = g_challengCup.getChampionCupUserData();
    var reData = {};
    reData.isOpen = g_challengCup.getIsOpen();
    var now = new Date();
    reData.userId= locData.userId;
    {
        var diff = locData.leftTime - now;
        diff = diff < 0 ? 0:diff;
        reData.leftTime = Math.floor((diff/1000));
    }
    reData.activityLeftTime = Math.floor((new Date().setHours(c_game.challengeCupCfg[8],0,0,0) - now)/1000);
    reData.nextChallengeTime = 0;

    var locUserData = g_challengCup.getUserData(userId);
    if (!locUserData){
        locUserData = {};
    }
    var fightCd = c_game.challengeCupCfg[2];
    //判断是否在cd中
    if(locUserData.endFightTime) {
        var diff =locUserData.endFightTime.clone().addSeconds(fightCd) - now;
        diff = diff < 0? 0:diff;
        reData.nextChallengeTime = Math.floor(diff/1000);
    }

    var weiguanData =  g_challengCup.getWeiguanData();
    reData.upCount = weiguanData.up;//顶数
    reData.downCount = weiguanData.down;//踩数
    reData.myOpNum = locUserData.opNum||0;//个人操作次数

    if (reData.userId) {
        userDao.select(client, {id: reData.userId}, function (err, data) {
            if (err) return cb(err);
            reData.nickName = data.nickName;
            reData.lvl = data.lvl;
            reData.iconId = data.iconId;
            reData.vip = data.vip;
            reData.combat = data.combat;
            var myGuildId = g_data.getGuildId(reData.userId);
            var myGuild = g_guild.getGuild(myGuildId);
            if (myGuild) {
                reData.guildName = myGuild.name;
                reData.guildLevel = myGuild.lvl;
            }
            var challengerUserId = g_challengCup.getChallengerUserId();
            if(challengerUserId) {
                reData.challengerUserId = challengerUserId;
            }
            heroBiz.getMainHeroDisplay(uwClient,reData.userId ,function(err,data){
                if(err) return cb(err);
                reData.HeroDisplay = data;
                return cb(null, reData);
            })
        });
    }else {
        return cb(null, reData);
    }
};

/**
 * 登台
 *@param userId
 */
exports.toBeChampion = function(client, userId, cb){
    if(!g_challengCup.getIsOpen()){
        return cb("活动未开始");
    }
    checkRequire();
    var now = new Date();
    var championUserData =  g_challengCup.getChampionCupUserData();
    if (championUserData.userId){
        exports.getInfo(client, userId, function(err, data){
            if(err) return cb(err);
            cb(null, data);
        })
    }else {
        championUserData.userId = userId;
        //活动结束或者成功守擂到规定时间的最近时间戳
        championUserData.leftTime = _getLeftTime();
        g_challengCup.setChampionCupUserData(championUserData);
        //更新challengeCup 和 challengeRankCup 表
        var championData = g_challengCup.getChampionData(userId) || {};
        championData.startTime = new Date();
        championData.userId = userId;
        if (!championData.maxTime){
            championData.maxTime = 0;
        }
        userDao.select(client, {id: userId}, function (err, data) {
            if (err) return cb(err);
            championData.iconId = data.iconId;
            championData.lvl = data.lvl;
            championData.vip = data.vip;
            championData.combat = data.combat;
            championData.nickName = data.nickName;
            g_challengCup.setChampionData(userId, championData);
            var updateChallengeCup = {
                userId: userId,
                leftTime: championUserData.leftTime
            }
            var reData = {};
            reData.combat = championData.combat;
            delete championData.combat;
            //改为定时更新
            challengeCupDao.update(client, updateChallengeCup, {id: championUserData.id}, function (err) {
                console.log(err)
            });
            challengeCupRankDao.insert(client, championData, function (err) {
                console.log(err)
            });

            reData.isOpen = g_challengCup.getIsOpen();
            reData.activityLeftTime = Math.floor((new Date().setHours(c_game.challengeCupCfg[8], 0, 0, 0) - now) / 1000);
            reData.userId = championUserData.userId;
            {
                var diff = championUserData.leftTime - now;
                diff = diff < 0 ? 0 : diff;
                reData.leftTime = Math.floor((diff / 1000));
            }
            g_challengCup.openChampionTimeout(reData.leftTime, _activityEndedPrematurely);
            reData.nickName = championData.nickName;
            reData.lvl = championData.lvl;
            reData.vip = championData.vip;

            reData.iconId = championData.iconId;
            reData.nextChallengeTime = 0;
            {
                //登台者也属于参与者
                var locUserData = g_challengCup.getUserData(userId);
                if (!locUserData) {
                    locUserData = {};
                }
                g_challengCup.setUserData(userId, locUserData);
                var updateChallengeCupData = {
                    exData: g_challengCup.getUserDic()
                }
                challengeCupDao.update(client, updateChallengeCupData, {id: championUserData.id}, function(err){
                    console.log(err);
                });
                var fightCd = c_game.challengeCupCfg[2];
                //判断是否在cd中
                if (locUserData.endFightTime) {
                    var diff = locUserData.endFightTime.clone().addSeconds(fightCd) - now;
                    diff = diff < 0 ? 0 : diff;
                    reData.nextChallengeTime = Math.floor(diff / 1000);
                }
            }
            var myGuildId = g_data.getGuildId(reData.userId);
            var myGuild = g_guild.getGuild(myGuildId);
            if (myGuild) {
                reData.guildName = myGuild.name;
                reData.guildLevel = myGuild.lvl;
            }
            reData.challengerUserId = g_challengCup.getChallengerUserId();
            heroBiz.getMainHeroDisplay(uwClient, userId, function (err, data) {
                if (err) return cb(err);
                reData.HeroDisplay = data;
                chatBiz.addSysData(53, [reData.nickName]);
                chatBiz.addSysData(59, [reData.nickName]);
                return cb(null, reData);
            })
        })
    }
}

/**
 * 改变守擂者
 * @param userId
 */
exports.changeChampion = function(client, userId, cb) {
    checkRequire();
    if(!userId){
        return cb(null);
    }
    var reData = g_challengCup.getChampionCupUserData();
    if (reData.userId  == userId ) {
        return cb("竟是同一个人");
    }
    async.parallel([
        function(cb1) {
            userDao.select(client, {id:userId}, cb1);
        }
    ], function (err, data) {
        if(err) return cb(err);
        var now = new Date();
        var userData = data[0];
        var championCupUserData = g_challengCup.getChampionCupUserData();
        var leftTime = c_game.challengeCupCfg[1];
        championCupUserData.userId = reData.userId = userData.id;
        reData.nickName = userData.nickName;
        reData.lvl = userData.lvl;
        var myGuildId = g_data.getGuildId(userId);
        var myGuild = g_guild.getGuild(myGuildId);
        if (myGuild) {
            reData.guildName = myGuild.name;
            reData.guildLevel = myGuild.lvl;
        }
        reData.challengerUserId = 0;
        championCupUserData.leftTime = reData.leftTime = now.addSeconds(leftTime);
        //开始定时器，倒计时
        g_challengCup.openChampionTimeout(leftTime, _activityEndedPrematurely);
        reData.nextChallengeTime = null;
        //改变内存中的守擂者信息
        g_challengCup.setChampionCupUserData(championCupUserData);

        return cb(null, reData);
    });
};
/**
 *开启擂台赛
 */
exports.openChallengeCup = function(client, cb) {
    checkRequire();
    challengeCupDao.select(client, {}, function(err, challengeCupdata) {
        if (err) return cb(err);
        //判断活动是否开启
        var now = new Date();
        serverInfoDao.select(loginClient,{serverId:project.serverId},function(err,serverData){
            if (!serverData ) return cb("服务器维护中....");
            if (consts.serverStatus.notOpen==serverData.status)
                return cb("活动未开始");
            if(!challengeCupdata) { //观察开服第几天了
            //观察开服第几天

                //无擂主数据，先插一条，再返回
                g_challengCup.reset();
                challengeCupRankDao.clean(client, function(err){if (err)console.log(err)});
                var  insertData = new ChallengeCupEntity();
                insertData.userId = 0;

                var day = _getDiffDay(serverData.serverDate, now);
                now = new Date();
                if (day<4 || !_isActivity(day -4)){

                }else {
                    insertData.isOpen = 1;
                    g_challengCup.setOpen(true);
                    g_challengCup.setIsFirst(true);
                    var nowClone = now.clone();
                    nowClone.setHours(c_game.challengeCupCfg[8], 0, 0, 0);
                    var leftActivityTime = now.getSecondsBetween(nowClone);
                    //设置老擂主
                    if(leftActivityTime >= 0) {
                        g_challengCup.openActivityTimeOut(leftActivityTime, _activityEnded);
                    }
                    //广播消息
                    chatBiz.addSysData(60, []);
                    chatBiz.addSysData(61, []);

                    //扒掉披风
                    _resetIsKing(0);
                }
                challengeCupDao.insert(client, insertData, function(err, data){
                    if (err) return cb(err);
                    insertData.id = data.insertId;
                    insertData.userId = 0;
                    g_challengCup.setChampionCupUserData(insertData);
                });

                return cb(null);
            }else {
                //假如是开启状态,开启
                var updateChallengeData = null;
                if (!challengeCupdata.isOpen) {//假如非开启状态
                    var day = 0;
                    if (challengeCupdata.startTime) { //活动已开启
                        day = _getDiffDay(challengeCupdata.startTime, now);
                        now = new Date();
                        if (day == 0) {
                            return cb("活动已结束");
                        }
                        if (!_isActivity(day)) {
                            return cb("活动未开始");
                        }
                    } else {//活动未开启，判断开服时间
                        day = _getDiffDay(serverData.serverDate, now);
                        now = new Date();
                        if (day < 4) {
                            return cb("活动已结束");
                        }
                        if (!_isActivity(day-4)) {
                            return cb("活动未开始");
                        }
                    }
                    //保存霸主信息
                    var championCupUserData = g_challengCup.getChampionCupUserData();
                    var temp = {};
                    temp.worship = championCupUserData.worship;
                    temp.worshipCount = championCupUserData.worshipCount;
                    temp.buffOpenNum = championCupUserData.buffOpenNum;
                    temp.buffOpenTime = championCupUserData.buffOpenTime;
                    temp.buffEndTime = championCupUserData.buffEndTime;
                    temp.userId = 0;
                        g_challengCup.reset();
                         _setChampionId(challengeCupdata.id);
                        var waitTime = c_game.challengeCupCfg[1];
                        g_challengCup.clearUserData();

                        if (challengeCupdata.userId) {//上届擂主为第一个守擂人,如果有的话
                            challengeCupdata.leftTime = new Date().addSeconds(waitTime);

                            var userJoin = {};
                            userJoin.startTime = userJoin.endTime = now.clone().addDays(-10);
                            g_challengCup.setUserData(challengeCupdata.userId, userJoin);
                        }


                        for (var key in challengeCupdata) {
                            if (key == "exData") continue;
                            championCupUserData[key] = challengeCupdata[key];
                        }
                        //恢复内存数据
                        for(var key in temp){
                            championCupUserData[key] = temp[key];
                        }

                        g_challengCup.setChampionCupUserData(championCupUserData);

                        //若过去一个周期，重新开始；否则未开启
                        updateChallengeData = {
                            userId: 0,
                            isOpen: 1,
                            exData: {}
                        }
                        challengeCupDao.update(client, updateChallengeData, {id: challengeCupdata.id}, function () {
                        });
                        //清空守擂排行榜数据
                        challengeCupRankDao.clean(client, function (err) {
                            if (err)console.log(err);
                        });
                    //广播消息
                    chatBiz.addSysData(60, []);
                    chatBiz.addSysData(61, []);
                    //扒掉披风
                    _resetIsKing(0);
                } else {
                    _setChampionId(challengeCupdata.id);
                }


               /* exports.changeChampion(client, challengeCupdata.userId, function (err, data) {
                });*/
                //开始活动定时器
                //var leftActivityTime = (c_game.challengeCupCfg[8] - c_game.challengeCupCfg[7])*3600; //当前离活动结束的时间差(单位秒)
                //var leftTime = c_game.challengeCupCfg[1];                                            //当前离成为擂主的时间差(单位秒)
                var nowClone = now.clone();
                nowClone.setHours(c_game.challengeCupCfg[8], 0, 0, 0);
                var leftActivityTime = now.getSecondsBetween(nowClone);
                var leftTime = 0;
                if (challengeCupdata.leftTime && challengeCupdata.leftTime.isAfter(now)) {
                    leftTime = now.getSecondsBetween(challengeCupdata.leftTime);
                }

                var championCupUserData = g_challengCup.getChampionCupUserData();
                //假如存在守擂人
                if (championCupUserData.userId) {
                    g_challengCup.openChampionTimeout(leftTime, _activityEndedPrematurely);
                }

                if (!challengeCupdata.startTime) {
                    g_challengCup.setIsFirst(true);
                }
                //设置老擂主
                if (leftActivityTime >= 0) {
                    g_challengCup.openActivityTimeOut(leftActivityTime, _activityEnded);
                }
                g_challengCup.setOpen(true);
                return cb(null);
            }
        });
    });
};

//获取前20守擂排名
exports.getDurationTimeRankList = function (userId,cb) {
    var list = g_challengCup.getRankUserList(userId);
    if (list.length <= 1) return cb(null,[]);
    var reList = [];
    var now = new Date();
    for (var i = 0; i < list.length; i++) {
        var locUserData = list[i];
        if(locUserData) {
            var locUserId = locUserData.userId;
            /*if (!locUserData.endTime){
                locUserData.endTime = now;
            }*/
            var userData = g_challengCup.getChampionData(locUserId);
            if (userData) {
                var locR = new ds.ChampionDurationTimeRank();
                locR.userId = locUserData.userId;
                locR.durationTime = Math.floor((locUserData.maxTime)/1000);
                locR.lvl = userData.lvl;
                locR.iconId = userData.iconId;
                locR.rank = userData.rank;
                locR.name = userData.nickName;
                locR.vip = userData.vip;
                reList.push(locR);
            }
        }else {
            reList.push(locUserData);
        }
    }
    return cb(null, reList);
};


//清除cd
exports.clearCd = function(client,userId, cb) {
    checkRequire();
    var locUserData = g_challengCup.getUserData(userId);
    if (!locUserData){
       return cb("没cd你也清");
    }

    userDao.selectCols(client, "id,diamond,buyDiamond,giveDiamond", "id = ?", [userId], function (err, userData) {
        if (err) return cb(err);
        var costDiamond = c_game.challengeCupCfg[3];
        if (userData.diamond < costDiamond) {
            return cb(getMsg(c_msgCode.noDiamond));
        }

        userUtils.reduceDiamond(userData, costDiamond);
        locUserData.endFightTime = (new Date()).addDays(-10);//设置为很久之前
        g_challengCup.setUserData(userId, locUserData);

        var updateUser = {
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond
        };
        userDao.update(client, updateUser, {id: userId}, function () {
            if (err) return cb(err);
            cb(null, [costDiamond,updateUser]);
        });
    });
}

//开始战斗
exports.startFight = function (client, userId, championUserId,cb) {
    checkRequire();
    if(!g_challengCup.getIsOpen()){

        return cb(null, [c_msgCode.eventEnded.id]);
    }
    if (g_challengCup.getIsChallenged()){
        var challengerUserId = g_challengCup.getChallengerUserId();//得到当前守擂者userId
        var userData = g_challengCup.getUserData(challengerUserId);
        if (userData && userData.endFightTime) {
            if (userData.endFightTime.isAfter(new Date()))
                return cb(null, [c_msgCode.userBeInFignting.id]);
            else //战斗过期重置
                g_challengCup.setChallengerUserId(0);
        }
    }
    var locUserData = g_challengCup.getUserData(userId);
    if (!locUserData){
        locUserData = {};
    }
    var fightCd = c_game.challengeCupCfg[2];
    //判断是否在cd中
    if(locUserData.endFightTime && locUserData.endFightTime.clone().addSeconds(fightCd).isAfter(new Date())){
        return cb("挑战cd中...");
    }
    async.parallel([
        function(cb1) {
            userDao.selectCols(client, "id,lvl,nickName,diamond,giveDiamond,buyDiamond", "id = ?", [userId], cb1);
        }
    ],function(err, data){
        if (err) return cb(err);
        var userData = data[0];
        var needDiamond = c_game.challengeCupCfg[9];
        if(userData.diamond < needDiamond){
            return cb(getMsg(c_msgCode.noDiamond));
        }
        userUtils.reduceDiamond(userData, needDiamond);
        var championCupUser = g_challengCup.getChampionCupUserData() || {};
        if (!championCupUser.userId){
            return cb("当前没有守擂人");
        }

        if (championCupUser.userId != championUserId){
            return cb(null, [c_msgCode.userChangeIfGoOn.id]);
        }

        var challengerData = g_challengCup.getUserData(userId) || {};
        challengerData.startFightTime  = new Date();
        challengerData.endFightTime = new Date().addMinutes(expireDate);
        g_challengCup.setUserData(userId, challengerData);
        g_challengCup.setChallengerUserId(userId);

        var updateChallengeCup = {
            exData : g_challengCup.getUserDic()
        }

        var updateUser = {
            diamond: userData.diamond,
            giveDiamond: userData.giveDiamond,
            buyDiamond: userData.buyDiamond
        };

        async.parallel([
            function (cb1) {
                userDao.update(client, updateUser, {id: userId}, cb1);
            },
            function (cb1) {
                if(championCupUser.id) {
                    challengeCupDao.update(client, updateChallengeCup, {id: championCupUser.id}, cb1);
                }else {
                    cb1("不可能到这里");//
                }
            }
        ], function (err, data) {
            if (err) return cb(err);
            userDao.select(client,{id:championCupUser.userId},function(err,eUserData){
                if (err) return cb(err);
                heroBiz.getPkList(client,eUserData,function(err,data){
                    if (err) return cb(err);
                    var heroPkDataList = data;
                    var heroList = heroPkDataList[0];
                    var otherDataList = heroPkDataList[1];
                    var fightData = heroPkDataList[2];
                    cb(null, [null,needDiamond,heroList,otherDataList,fightData,updateUser]);
                });
            });
        });
    });


};

//结束战斗
exports.endFight = function (client, userId, isWin,cb) {
    checkRequire();
    var championCupUser = g_challengCup.getChampionCupUserData();
    if(!championCupUser.userId){
        return cb("当前无擂主");
    }
    async.parallel([
        function(cb1) {
            userDao.select(client, {id: userId}, cb1);
        },
        function(cb1) {
            userDao.select(client, {id:championCupUser.userId}, cb1);
        }],function(err, data){
        if(err) return cb(err);
        var userData = data[0];
        var enemyData = data[1];

        //校验一下战斗力
        isWin = fightUtils.checkIsWinByCombat(isWin,userData.lvl,userData.combat,enemyData.combat);

        var locUserData = g_challengCup.getUserData(userId);
        if (!locUserData) {
            locUserData = {};
        }
        locUserData.endFightTime = new Date();
        g_challengCup.setUserData(userId, locUserData);
        g_challengCup.setChallengerUserId(0);
        var fightResult = new ds.FightResult();

        fightResult.beAttackMember = [enemyData.nickName, enemyData.combat, enemyData.iconId];
        fightResult.attackMember = [userData.nickName,userData.combat,userData.iconId];

        fightResult.winStatus = isWin?consts.winStatus.win:consts.winStatus.lose;
        //插入记录
        arenaRecordBiz.insertRecord(client,userData,enemyData,fightResult,c_prop.fightTypeKey.challengeCupPk,function(){});

        if (isWin) {//胜利了，开始守擂

            var oldUserId = championCupUser.userId;
            if (oldUserId) {
                var oldChampionUser = g_challengCup.getChampionData(oldUserId) || {};
                var newChampionUser = g_challengCup.getChampionData(userId) || {};
                newChampionUser.userId = userId;
                if (!newChampionUser.maxTime){
                    newChampionUser.maxTime = 0;
                }
                newChampionUser.iconId = userData.iconId;
                newChampionUser.lvl = userData.lvl;
                newChampionUser.vip = userData.vip;
                newChampionUser.nickName = userData.nickName;
                newChampionUser.startTime = new Date();
                oldChampionUser.endTime = new Date();
                var diff = oldChampionUser.endTime - oldChampionUser.startTime;

                var updateOldChallengeCupRank = {
                    endTime: oldChampionUser.endTime
                }
                if (diff > oldChampionUser.maxTime) {
                    oldChampionUser.maxTime = diff;
                    updateOldChallengeCupRank.maxTime = oldChampionUser.maxTime;
                }
                chatBiz.addSysData(48, [newChampionUser.nickName,oldChampionUser.nickName]);
                chatBiz.addSysData(55, [newChampionUser.nickName,oldChampionUser.nickName]);
                challengeCupRankDao.update(client, updateOldChallengeCupRank, {userId: oldUserId}, function () {
                });
                var updateNewChallengeCupRank = {
                    startTime: new Date(),
                    endTime: null
                }
                g_challengCup.setChampionData(oldUserId, oldChampionUser);

                if (newChampionUser.id) {
                    challengeCupRankDao.update(client, updateNewChallengeCupRank, {userId: userId}, function () {
                        g_challengCup.setChampionData(userId,newChampionUser);
                    });
                } else {
                        updateNewChallengeCupRank.userId = userId;
                        updateNewChallengeCupRank.iconId = userData.iconId;
                        updateNewChallengeCupRank.lvl = userData.lvl;
                        updateNewChallengeCupRank.nickName = userData.nickName;
                        updateNewChallengeCupRank.vip = userData.vip;
                        challengeCupRankDao.insert(client, updateNewChallengeCupRank, function (err, data) {
                            if(err) return cb(err);
                            newChampionUser.id = data.insertId;
                            g_challengCup.setChampionData(userId,newChampionUser);
                        })
                }
            }
            championCupUser.userId = userId;
            championCupUser.leftTime =_getLeftTime();
            //重置成为擂主的倒计时
            var leftTimeData = null;
            {
                var diff = championCupUser.leftTime - new Date();
                diff = diff < 0 ? 0:diff;
                leftTimeData = Math.floor((diff/1000));
            }
            g_challengCup.openChampionTimeout(leftTimeData,_activityEndedPrematurely);
            g_challengCup.setChampionCupUserData(championCupUser);
            exports.changeChampion(client, userId, function () {
            })

            var updateChallengeCup = {
                userId: userId,
                leftTime: championCupUser.leftTime,
                exData: g_challengCup.getUserDic()
            }
            challengeCupDao.update(client, updateChallengeCup, {id: championCupUser.id}, function (err, data) {
                if (err) return cb(err);
                return cb(null,fightResult);
            });
        } else {//失败了，就当什么也没发生
            return cb(null, fightResult);
        }
    });
};

exports.op = function(client,userId,op,cb){
    userDao.selectCols(client,"id,vip,bag",{id:userId},function(err,userData){
        if(err) return cb(err);
        var limitNum = c_vip[userData.vip].kingOp;
        var g_userData = g_challengCup.getUserData();
        if(!g_userData) g_userData = {opNum:0};
        if (g_userData.opNum >= limitNum) return cb("本轮已经没有次数!");
        g_userData.opNum +=1 ;
        g_challengCup.setUserData(userId,g_userData);
        var weiguanData =  g_challengCup.getWeiguanData();
        if(op==0){
            weiguanData.up+=1;
        }
        if(op==1){
            weiguanData.down+=1;
        }

        //得到围观礼包
        var getItemId = c_game.challengeCupCfg[16];
        userUtils.addBag(userData.bag,getItemId,1);
        var updateUser = {
            bag :userData.bag
        };

        userDao.update(client,updateUser,{id:userData.id},function(err,data){
            if(err) return cb(err);

            cb(null,[weiguanData.up,weiguanData.down,g_userData.opNum]);
        })
    });
};

/**
 * 某人守擂到规定时间，活动提前结束
 */
var _activityEndedPrematurely  = function() {
    checkRequire();
    if (!g_challengCup.getIsOpen())
        return;
    //擂主即为守擂者
    var championCupUserData = g_challengCup.getChampionCupUserData();
    if(!championCupUserData.userId){
        return;  //不可思议
    }
    //更新擂主数据

    /*if(championCupUserData.championUserId !=championCupUserData.userId)
    {
        var updateUserData = {
            isKing: 1
        }
        userDao.update(uwClient, updateUserData, {id:championCupUserData.userId }, function(){});//认证擂主
        updateUserData.isKing = 0;
        userDao.update(uwClient, updateUserData, {id: championCupUserData.championUserId}, function(){});//
    }*/
    _resetIsKing(championCupUserData.userId);

    championCupUserData.championUserId = championCupUserData.userId;
    championCupUserData.worship = 0;
    championCupUserData.worshipCount = 0;
    championCupUserData.buffOpenNum = 0;
    championCupUserData.buffOpenTime = null;

    //更新守擂排行数据
    var championData = g_challengCup.getChampionData(championCupUserData.userId) || {};
    championData.endTime = new Date();
    g_challengCup.setChampionData(championCupUserData.userId, championData);
    var updateChampionData = {
        endTime: championData.endTime.toFormat("YYYY-MM-DD HH24:MI:SS"),
        maxTime: championData.maxTime
    };
    if (championData.endTime - championData.startTime > championData.maxTime){
        championData.maxTime = championData.endTime - championData.startTime;
        updateChampionData.maxTime = championData.maxTime;

    }

    challengeCupRankDao.update(uwClient, updateChampionData, {id: championData.id}, function() {});
    g_challengCup.setChampionData(championCupUserData.userId, championData);

    //发放奖励
    var mailType = c_prop.mailTypeKey.champions;

    _sendRewardMail(championCupUserData.userId, mailType);


    //发送完奖励后，重置活动状态
    if(championCupUserData.id){//存在则更新
        var updateChallengeCupData = {
            userId: championCupUserData.userId,
            isOpen: 0,
            startTime: new Date().toFormat("YYYY-MM-DD HH24:MI:SS"),
            championUserId: championCupUserData.userId,
            worship: championCupUserData.worship,
            worshipCount:championCupUserData.worshipCount,
            buffOpenNum:championCupUserData.buffOpenNum,
            buffOpenTime:championCupUserData.buffOpenTime
        };
        challengeCupDao.update(uwClient, updateChallengeCupData, {id: championCupUserData.id}, function (err) {console.log(err)});
    }else {//不存在则插入
        var challengeCupData = {
            userId: championCupUserData.userId,
            startTime: new Datae().toFormat("YYYY-MM-DD HH24:MI:SS"),
            exData: g_challengCup.getUserDic(),
            isOpen: 0,
            startTime: new Date(),
            championUserId: championCupUserData.userId
        }
        challengeCupDao.insert(uwClient,challengeCupData, function(){});
    }
    //活动结束，重置内存数据
    //g_challengCup.reset();
    var myGuildId = g_data.getGuildId(championCupUserData.userId);
    var myGuild = g_guild.getGuild(myGuildId);
    var guildName = "";
    if (myGuild) {
        guildName = myGuild.name;
    }
    chatBiz.addSysData(50, [guildName,championData.nickName]);
    chatBiz.addSysData(57, [guildName,championData.nickName]);
    g_challengCup.setChampionCupUserData(championCupUserData);
    g_challengCup.setOpen(false);
};

/**
 *
 * @param championCupUserId  擂主userId
 * @param mailType 擂主通知邮件类型
 * @private
 */

var _sendRewardMail = function(championCupUserId, mailType) {
    var max = 1000;//
    var groupList = [];
    var tempCount = 0;
    var tempList = [];
    //发送擂主邮件
    var mailEntity = mailBiz.createEntityByType(championCupUserId, mailType, [], {});
    mailEntity.addTime = new Date();
    tempList.push(mailEntity);
    tempCount++;
    //发勋章
    var medalItems = commonUtils.strToObj(c_game.challengeCupCfg[18]);     //{"10040":1};
    var mailEntity = mailBiz.createEntityByType(championCupUserId, c_prop.mailTypeKey.kingMedal, [], medalItems);
    mailEntity.addTime = new Date();
    tempList.push(mailEntity);
    tempCount++;

    //发送排行奖励邮件
    var rankList = g_challengCup.getRankUserList();
    if(rankList.length <= 0)
        return;
    for (var i =0; i < rankList.length-1; i++) {
        var locRankData = rankList[i];
        var items = _getRewardData(i+1);

        var mailEntity = mailBiz.createEntityByType(locRankData.userId, c_prop.mailTypeKey.championsRank, [i+1], items);
        mailEntity.addTime = new Date();
        tempList.push(mailEntity);
        if(tempCount>=max){
            tempCount = 0;
            groupList.push(tempList.concat([]));
            tempList.length =0;
        }
        tempCount++;

    }

    //发送参与奖邮件
    var userDic = g_challengCup.getUserDic();
    var itemsJoin = {};//参与奖奖励
    var reString = c_game.challengeCupCfg[4];
    var rewardData = reString.split(",");
    for(var i=0; i < rewardData.length; i+=2){
        itemsJoin[rewardData[i]] = rewardData[i+1];
    }
    for (var userId in userDic) {
        var mailEntity = mailBiz.createEntityByType(userId, c_prop.mailTypeKey.chaampionsJoin, [], itemsJoin);
        mailEntity.addTime = new Date();
        tempList.push(mailEntity);
        if(tempCount>=max){
            tempCount = 0;
            groupList.push(tempList.concat([]));
            tempList.length =0;
        }
        tempCount++;
    }

    if(tempList.length >0){
        groupList.push(tempList.concat([]));
    }

    async.map(groupList, function (group, cb1) {
        mailBiz.addMailByList(uwClient,group,cb1);
    }, function(){});
}

/**
 *取得相应排名的奖励
 * @param rank
 * @private
 */
var _getRewardData = function(rank) {
    var items = {};
    var curData  = null;
    for(var i=1; i <= 10; i++) {
        var locData = c_challengeCupRankReward[i];
        if (!locData) break;
        if(rank>=locData.rangeStart&&rank<=locData.rangeEnd){
            curData = locData;
            break;
        }
    }
    if (curData&&locData.reward) {
        for(var i = 0;i<locData.reward.length;i++){
            var locReward = locData.reward[i];
            var itemId = locReward[0];
            var itemNum = locReward[1];
            var locOldNum = items[itemId]||0;
            items[itemId] = locOldNum+itemNum;
        }
    }

    if(locData.gold){
        items[c_prop.spItemIdKey.gold] = locData.gold;
    }

    return items;
};

/**
 * 活动时间到， 活动结束
 */
var _activityEnded = function() {
    checkRequire();
    if (!g_challengCup.getIsOpen())
        return;
    //判断是否存在擂主

    var championCupUserData = g_challengCup.getChampionCupUserData();//当前守擂者数据
    var championUserId = championCupUserData.userId;
    if(championUserId) {//存在守擂者
        championCupUserData.userId = championUserId;
        _dealWithClearing(championCupUserData);
    }else { //不存在守擂者，则找战力第一的人
        fiveDaysTargetDao.getRankListTop(uwClient, c_prop.rankTypeKey.combatRank, 1, function(err, data){
            if(err) {
                console.log(err);
            }else {
                championCupUserData.userId = data[0].userId;
                g_challengCup.setIsFirst(true);
                _dealWithClearing(championCupUserData, data[0].userName);
            }
        })
    }
};

//重置isKing参数
var _resetIsKing = function(userId) {
    userDao.list(uwClient, {isKing: 1}, function(err, data){
        if(err) return cb(err);
        for(var i=0; i<data.length; i++){
            var updateIsKing = {
                isKing: 0
            };
            userDao.update(uwClient, updateIsKing,{id: data[i].id}, function(err){
                if (err) console.log(err);
            });
        }
        var newUpdateIsKing = {
            isKing: 1
        }
        userDao.update(uwClient, newUpdateIsKing, {id: userId}, function(err){
            if(err) console.log(err);
        })

    })
}

//具体处理函数
var _dealWithClearing = function(championCupUserData, nickName) {
    var championUserId = championCupUserData.userId;
    var firstPeriods = g_challengCup.getIsFirst();//是否是第一届
    //更新数据

    /*if(championCupUserData.championUserId !=championUserId )
    {//更新擂主
        var updateUserData = {
            isKing: 1
        }
        userDao.update(uwClient, updateUserData, {id:championUserId }, function(){});//认证擂主
        updateUserData.isKing = 0;
        userDao.update(uwClient, updateUserData, {id: championCupUserData.championUserId}, function(){});//
    }*/
    //重置isKing
    _resetIsKing(championUserId);
    championCupUserData.championUserId = championUserId;
    championCupUserData.worship = 0;
    championCupUserData.worshipCount = 0;
    championCupUserData.buffOpenNum = 0;
    championCupUserData.buffOpenTime = null;

    var championData = g_challengCup.getChampionData(championCupUserData.userId) || {};
    championData.endTime = new Date();
    g_challengCup.setChampionData(championCupUserData.userId, championData);
    var updateChampionData = {
        endTime: championData.endTime.toFormat("YYYY-MM-DD HH24:MI:SS"),
        maxTime: championData.maxTime
    };
    if(championData.endTime - championData.startTime > championData.maxTime){
        championData.maxTime = championData.endTime - championData.startTime;
        updateChampionData.maxTime = championData.maxTime;
    }
    challengeCupRankDao.update(uwClient, updateChampionData, {id: championData.id}, function() {});

    //除了战力第一外，邮件类型都一致
    var mailType = c_prop.mailTypeKey.champions;
    if(nickName){
        mailType = c_prop.mailTypeKey.continueChampions;
    }
    //发送奖励
    _sendRewardMail(championUserId, mailType);
    //g_challengCup.reset();
    var myGuildId = g_data.getGuildId(championCupUserData.userId);
    var myGuild = g_guild.getGuild(myGuildId);
    var guildName = "";
    if (myGuild) {
        guildName = myGuild.name;
    }
    var name = nickName || championData.nickName
    chatBiz.addSysData(50, [guildName,name]);
    chatBiz.addSysData(57, [guildName,name]);
    g_challengCup.setOpen(false);

    //发送完奖励后，重置活动状态

    if(championCupUserData.id){//存在则更新
        var updateChallengeCupData = {
            userId: championCupUserData.userId,
            isOpen: 0,
            startTime: new Date().toFormat("YYYY-MM-DD HH24:MI:SS"),
            championUserId: championCupUserData.userId,
            worship: championCupUserData.worship,
            worshipCount:championCupUserData.worshipCount,
            buffOpenNum:championCupUserData.buffOpenNum,
            buffOpenTime:championCupUserData.buffOpenTime
        };
        challengeCupDao.update(uwClient, updateChallengeCupData, {id: championCupUserData.id}, function (err) {console.log(err)});
    }else {//不存在则插入
        var challengeCupData = {
            userId: championCupUserData.userId,
            startTime: new Datae().toFormat("YYYY-MM-DD HH24:MI:SS"),
            exData: g_challengCup.getUserDic(),
            isOpen: 0,
            startTime: new Date(),
            championUserId: championCupUserData.userId
        }
        challengeCupDao.insert(uwClient,challengeCupData, function(){});
    }
}



/**
 * 计算是否在活动周期内
 * @param day
 * @return true 在活动期内, false 不在活动期内
 */
var _isActivity = function(day) {
    var now = new Date();
    var T = c_game.challengeCupCfg[6];
    var diffDay = day%T;
    if (diffDay){
        return false;
    }
    var startHour  = c_game.challengeCupCfg[7];
    var endHour = c_game.challengeCupCfg[8];
    var hours = now.getHours();
    if (hours < startHour || hours > endHour) {
        return false;
    }
    return true;
};

/**
 * 得到能够最快成为擂主的时间戳
 */
var _getLeftTime = function() {
    var now = new Date();
    var endTime = now.clone().setHours(c_game.challengeCupCfg[8]);
    var timeOut = now.clone().addSeconds(c_game.challengeCupCfg[1]);
    if (endTime - timeOut > 0) {
        return timeOut;
    }else {
        return endTime;
    }
}


/**
 * 获得两个时间点相差多少天
 * @param startTime
 * @param endTime
 * @return day -1 开是时间在结束时间之后, >=0 相差多少天
 */
var _getDiffDay = function(startTime, endTime) {
    if(!startTime){
        startTime = new Date();
    }
    return startTime.clone().clearTime().getDaysBetween(endTime.clone().clearTime());
};

/**
 * 设置数据库主键id
 * @param id
 */
var _setChampionId = function(id) {
    var reData = g_challengCup.getChampionCupUserData();
    reData.id = id;
    g_challengCup.setChampionCupUserData(reData);
};
