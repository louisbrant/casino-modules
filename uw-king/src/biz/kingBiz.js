/**
 * Created by Administrator on 2014/5/16.
 */

var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var challengeCupDao = require("uw-challenge-cup").challengeCupDao;
var userDao = require("uw-user").userDao;
var userUtils = require("uw-user").userUtils;
var guildDao = require("uw-guild").guildDao;
var guildPersonalDao = require("uw-guild").guildPersonalDao;
var heroBiz = require("uw-hero").heroBiz;
var ds = require("uw-ds").ds;
var consts = require("uw-data").consts;
var c_prop = require("uw-data").c_prop;
var c_game = require("uw-data").c_game;
var c_msgCode = require("uw-data").c_msgCode;
var t_otherBuff = require("uw-data").t_otherBuff;
var propUtils = require("uw-utils").propUtils;
var commonUtils = require("uw-utils").commonUtils;
var g_challengCup = require("uw-global").g_challengCup;
var chatBiz = require("uw-chat").chatBiz;
var clusterBiz = require("uw-cluster").clusterBiz;
var g_buff = require("uw-global").g_buff;

var exports = module.exports;


/**
 * 获取数据
 * @param client
 * @param userId
 * @param cb
 */
exports.getInfo = function (client, userId, cb) {
    var challengeCupData = g_challengCup.getChampionCupUserData();
    if (!challengeCupData || !challengeCupData.championUserId) return cb(null, null);
    async.parallel([
        function (cb1) {
            guildPersonalDao.listCols(client, "guildId,userId", " userId in (?)", [[userId, challengeCupData.championUserId]], cb1);
        },
        function (cb1) {
            userDao.selectCols(client, "id,vip,nickName,lvl,equipBag,robotId,isKing,rebirthLvl,medalData,propertyData", " id = ?", [challengeCupData.championUserId], cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var guildPersonalList = data[0], kingUser = data[1];
        var myGuildPerson = _getGuildPersonData(userId, guildPersonalList), kingGuildPerson = _getGuildPersonData(challengeCupData.championUserId, guildPersonalList);
        var guildIds = _getGuildIds(guildPersonalList);
        async.parallel([
            function (cb1) {
                _getGuildData(client, guildIds, cb1);
            },
            function (cb1) {
                heroBiz.getMainHeroDisplayByUserData(client, kingUser, cb1);
            }
        ], function (err, data1) {
            if (err) return cb(err);
            var guildData = data1[0], heroDisplay = data1[1];
            var myGuild = null, kingGuild = null;
            if (myGuildPerson && myGuildPerson.guildId) {
                myGuild = guildData[myGuildPerson.guildId];
            }
            if (kingGuildPerson && kingGuildPerson.guildId) {
                kingGuild = guildData[kingGuildPerson.guildId];
            }

            if (challengeCupData.buffOpenTime && !(new Date()).equalsDay(challengeCupData.buffOpenTime)) {
                challengeCupData.buffOpenTime = new Date();
                challengeCupData.buffOpenNum = 0;
            }

            var k = new ds.King();
            k.myGuildId = myGuild == null ? "" : myGuild.id;//自己行会id
            k.myGuildName = myGuild == null ? "" : myGuild.name;//自己行会名
            k.kingGuildId = kingGuild == null ? "" : kingGuild.id;//霸主行会id
            k.kingGuildName = kingGuild == null ? "" : kingGuild.name;//霸主行会名
            k.kingGuildLvl = kingGuild == null ? "" : kingGuild.lvl;//霸主行会等级
            k.kingId = kingUser.id;//霸主id
            k.kingName = kingUser.nickName;//霸主名字
            k.kingVip = kingUser.vip;//霸主vip
            k.kingLvl = kingUser.lvl;//霸主等级
            k.kingHeroDisplay = heroDisplay;//霸主外观
            k.beWorshipNum = challengeCupData.worship;//被膜拜的次数
            k.beWorshipCount = challengeCupData.worshipCount;//被膜拜的总次数
            k.buffOpenNum = challengeCupData.buffOpenNum;//buff开启次数
            k.buffOpenTime = challengeCupData.buffOpenTime;//最后一次开启时间
            k.buffEndTime = challengeCupData.buffEndTime;//buff结束时间
            cb(null, k);
        });
    });
};

//膜拜
exports.worship = function (client, userId, cb) {
    async.parallel([
        function (cb1) {
            userDao.selectCols(client, "id,diamond,buyDiamond,giveDiamond,gold,bag,counts,countsRefreshTime", " id = ?", [userId], cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0];
        var challengeCupData = g_challengCup.getChampionCupUserData();
        var worshipCount = userUtils.getTodayCount(userData, c_prop.userRefreshCountKey.worShip);
        if (worshipCount > 0) return cb("每天只能膜拜一次");
        userUtils.addTodayCount(userData, c_prop.userRefreshCountKey.worShip, 1);

        var items = commonUtils.strToArrInArr(c_game.king[0]);
        items = commonUtils.arrayToProp(items);

        //获得物品
        var itemsArr = userUtils.saveItems(userData, items);
        var bagItems = itemsArr[0];
        //更新膜拜
        challengeCupData.worship += 1;
        challengeCupData.worshipCount += 1;

        var updateUser = {
            counts: userData.counts,
            countsRefreshTime: userData.countsRefreshTime,
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag
        };
        var updateChallengeCup = {
            worship: challengeCupData.worship,
            worshipCount: challengeCupData.worshipCount
        };
        g_challengCup.setChampionCupUserData(challengeCupData);
        async.parallel([
            function (cb1) {
                userDao.update(client, updateUser, {id: userId}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            delete updateUser.bag;
            cb(null, [updateUser, bagItems, updateChallengeCup]);
        });
    });
};


//领取福利
exports.receiveWelfare = function (client, userId, cb) {
    userDao.selectCols(client, "id,diamond,buyDiamond,giveDiamond,gold,bag,counts,countsRefreshTime", " id = ?", [userId], function (err, userData) {
        if (err) return cb(err);

        var worshipCount = userUtils.getTodayCount(userData, c_prop.userRefreshCountKey.getKingWelfare);
        if (worshipCount > 0) return cb("每天只能领取一次福利");
        userUtils.addTodayCount(userData, c_prop.userRefreshCountKey.getKingWelfare, 1);

        var items = commonUtils.strToArrInArr(c_game.king[2]);
        items = commonUtils.arrayToProp(items);

        //获得物品
        var itemsArr = userUtils.saveItems(userData, items);
        var bagItems = itemsArr[0];
        var getDiamond = items[c_prop.spItemIdKey.diamond];
        var updateUser = {
            counts: userData.counts,
            countsRefreshTime: userData.countsRefreshTime,
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag
        };
        userDao.update(client, updateUser, {id: userId}, function (err, data) {
            if (err) return cb(err);
            delete updateUser.bag;
            cb(null, [updateUser, bagItems, getDiamond]);
        });
    });
};


//开启buff
exports.openBuff = function (client, userId, cb) {
    userDao.selectCols(client,"id,nickName","id = ? ",[userId],function(err,userData){
        if(err) return cb(err);
        var challengeCupData = g_challengCup.getChampionCupUserData();
        //判断是否霸主
        if (challengeCupData.championUserId != userId) return cb("只有霸主才有权限开启");
        //判断条件
        var needWorshipNum = c_game.king[1];
        if (challengeCupData.worship < needWorshipNum) return cb(getMsg(c_msgCode.noBuffTimes));
        challengeCupData.worship -= needWorshipNum;
        //判断限制
        var canOpenNum = c_game.king[3];
        if (challengeCupData.buffOpenTime && !(new Date()).equalsDay(challengeCupData.buffOpenTime)) {
            challengeCupData.buffOpenTime = new Date();
            challengeCupData.buffOpenNum = 0;
        }
        challengeCupData.buffOpenTime = new Date();

        if (challengeCupData.buffOpenNum >= canOpenNum)  return cb("已经达到每日最高开启次数");
        challengeCupData.buffOpenNum++;

        //加buff时间
        var buffData = t_otherBuff[c_prop.otherBuffIdKey.king];
        if (!challengeCupData.buffEndTime||challengeCupData.buffEndTime.isBefore(new Date())) {
            challengeCupData.buffEndTime = new Date();
        }
        challengeCupData.buffEndTime.addSeconds(buffData.conTime)

        var updateChallengeCup = {
            buffOpenTime: challengeCupData.buffOpenTime,
            buffOpenNum: challengeCupData.buffOpenNum,
            buffEndTime: challengeCupData.buffEndTime,
            worship: challengeCupData.worship
        }
        g_challengCup.setChampionCupUserData(challengeCupData);

        //消息
        chatBiz.addSysData(52,[userData.nickName,buffData.name]);

        //buff
        var g_buffData = g_buff.getBuffData(c_prop.otherBuffIdKey.king);
        g_buffData.endTime =  challengeCupData.buffEndTime;
        //g_buffData.endTime
        g_buff.setBuffData(c_prop.otherBuffIdKey.king,g_buffData);
        var sendData = {
            id:c_prop.otherBuffIdKey.king,
            buffData:g_buffData
        };
        clusterBiz.setMsgToWorks("a.buffRemote.updateBuff",sendData);
        cb(null, updateChallengeCup);
    });
};

exports.initBuff = function(client,cb){
    challengeCupDao.selectCols(client," buffEndTime "," 1 =1 ",[],function(err,challengeCupData){
        if(err) return cb(err);
        if(!challengeCupData) return cb(null);
        if(!challengeCupData.buffEndTime)  return cb(null);
        //延迟1分钟启动
        setTimeout(function(){
            //buff
            var g_buffData = g_buff.getBuffData(c_prop.otherBuffIdKey.king);
            g_buffData.endTime =  challengeCupData.buffEndTime;
            //g_buffData.endTime
            g_buff.setBuffData(c_prop.otherBuffIdKey.king,g_buffData);
            var sendData = {
                id:c_prop.otherBuffIdKey.king,
                buffData:g_buffData
            };
            clusterBiz.setMsgToWorks("a.buffRemote.updateBuff",sendData);
        },60*1000);

        cb(null);
    });

};

var _getGuildPersonData = function (userId, guildPersonalList) {
    for (var i = 0; i < guildPersonalList.length; i++) {
        var locData = guildPersonalList[i];
        if (userId == locData.userId) {
            return locData;
        }
    }
    return null;
};

var _getGuildIds = function (guildPersonalList) {
    var reGuildIds = [];
    for (var i = 0; i < guildPersonalList.length; i++) {
        var locData = guildPersonalList[i];
        if (locData.guildId) reGuildIds.push(locData.guildId);
    }
    return reGuildIds;
};


var _getGuildData = function (client, guildIds, cb) {
    var reDic = {};
    if (guildIds.length <= 0) return cb(null, reDic);
    guildDao.listCols(client, "id,name,lvl", "id in (?)", [guildIds], function (err, dataList) {
        if (err) return cb(err);
        for (var i = 0; i < dataList.length; i++) {
            var locData = dataList[i];
            reDic[locData.id] = locData;
        }
        return cb(null, reDic);
    });
};