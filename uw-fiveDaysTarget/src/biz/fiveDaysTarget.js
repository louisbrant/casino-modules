/**
 * Created by Administrator on 2015/12/15.
 */
var uwData = require("uw-data");
var c_task = uwData.c_task;
var async = require("async");
var mailBiz = require("uw-mail").mailBiz;
var taskBiz = require("uw-task").taskBiz;
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var taskDao = null;
var fiveDaysTargetDao = null;



var userDao = null;
var userBiz = null;

var activityDao = null;

var fiveDaysTargetTask = {0:"3100004",1:"3100002",2:"3100003",3:"3100005",4:"0"};
var fiveDaysTargetRankType = {
    0:c_prop.rankTypeKey.combatRank,
    1:c_prop.rankTypeKey.wingRank,
    2:c_prop.rankTypeKey.arenaRank,
    3:c_prop.rankTypeKey.guildRank,
    4:c_prop.rankTypeKey.dsRank};

var checkRequire = function () {
    userDao = userDao || require("uw-user").userDao;
    userBiz = userBiz || require("uw-user").userBiz;
    activityDao = activityDao || require("uw-activity").activityDao;
    taskDao = taskDao || require("uw-task").taskDao;
    fiveDaysTargetDao =  fiveDaysTargetDao || require("../dao/fiveDaysTargetDao");
};
/**
 * 定时发送五日目标奖励
 * @param client
 * @param cb
 */
exports.sendRankAward = function(client, cb) {
    //todo
    checkRequire();
        async.parallel([
            function (cb1) {
                activityDao.select(client, {type: c_prop.activityTypeKey.fiveDaysTarget, isOpen: 1}, cb1);
            }
        ], function(err, data){
        var day = -1;
        var activityData = data[0];
            if (!activityData) {
                return cb("活动未开启");
            }

        day = _getCurDay(activityData);
        if (day <1 || day > 4) { //第五天活动未开放，开放是需改
             return cb("日期不對");
        }
        var rankType = fiveDaysTargetRankType[day-1];

        var top = 3;
        fiveDaysTargetDao.getRankListTopBak(client, rankType, top,function(err, rankList) {
                if (err) return cb(err);
                var max = 1000;//
                var groupList = [];
                var tempCount = 0;
                var tempList = [];
                //得到五日目标历史数据
                var rankArr = [];
                for (var i =0; i < rankList.length; i++){
                    var loc = {};
                    loc.userId = rankList[i].userId;
                    loc.userName = rankList[i].userName;
                    loc.iconId = rankList[i].iconId;
                    loc.userLvl = rankList[i].userLvl;
                    loc.pkWinCount = rankList[i].pkWinCount;
                    loc.combat = rankList[i].combat;
                    loc.rankType = rankList[i].rankType;
                    loc.rankValue = rankList[i].rankValue;
                    rankArr.push(loc);
                }
                fiveDaysTargetDao.insertList(client, rankArr, function(){});
                for (var i = 0; i < rankList.length &&i < top; i++) {
                    var locRankData = rankList[i];
                    var items = {};
                    //var locPKLvl = userUtils.getPKLvl({pkWinCount:locRankData.pkWinCount});
                    //var pkLvlData = c_pkLvl[locPKLvl];
                    //items[c_prop.spItemIdKey.diamond] = pkLvlData.rewardPerDay;
                    var index = (day-1)*3+i;
                    var reString  = c_game.targetRank[index]
                    var strs = reString.split(",");
                    if(!strs || strs.length < 2) continue;
                    for (var j =0; j < strs.length; j += 2) {
                        items[strs[j]] = strs[j+1];
                    }
                    var mailEntity = mailBiz.createEntityByType(locRankData.userId, c_prop.mailTypeKey.temp1, [0, i+1], items);
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
                    mailBiz.addMailByList(client,group,cb1);
                }, cb);
            }
        );
    });
};

//复制竞技场表数据
exports.sqlTargetBak = function(client,cb){
    checkRequire();
    activityDao.select(client, {type: c_prop.activityTypeKey.fiveDaysTarget, isOpen: 1}, function(err, activityData){
        var day = _getCurDay(activityData);
        if (day < 0) {
            cb("日期有误");
        }else {
            fiveDaysTargetDao.sqlTargetBak(client, day, cb);
        }
    });
};


/**
 * 得到五日目标信息
 * @param client
 * @param cb
 */
exports.getInfo = function(client, userId, cb) {
    checkRequire();
    //得到五日目标信息
    async.parallel([
        function (cb1) {
            activityDao.select(client, {type: c_prop.activityTypeKey.fiveDaysTarget, isOpen: 1}, cb1);
        }
    ], function(err, data) {
        if (err) return cb(err);
        var day = -1;
        var activityData = data[0];

        day = _getCurDay(activityData);

        if (day < 0) {
            return cb("日期有误");
        }

        async.parallel([
            function(cb1) {
                //得到战斗力数据
                // rankBiz.getRankListTop(client, rankType, 3, cb1);
                fiveDaysTargetDao.getRankListTop(client, fiveDaysTargetRankType[day], 3, cb1);
            },
            function (cb1) {
                //得到五日目标排行榜数据
               fiveDaysTargetDao.list(client, "",[], cb1);
            },
            function(cb1) {
                //得到工会确定数值
                fiveDaysTargetDao.getCurTaskValue(client, userId, c_prop.cTaskTypeKey.guild, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            var relRankData =  data[0];//实时数据
            var rankData = data[1];
            var guildData = data[2];

            var reData = {};
            reData.day = day;

            reData.items = [];
            var value = 0;
            for(var i=0; i<=day; i++) {
                if (i == 3) {
                    if (!guildData[0].count) {
                        value  = 0;
                    }else {
                        value = guildData[0].guildId;
                    }
                }
                var locData = _genDailyData( i, rankData, value, activityData);
                locData.value = value;
                if (i == day) {
                    locData.rank = relRankData;
                }
                reData.items.push(locData);
            }
            cb(null, reData);

        });
    });
};

/**
 * 得到每一天的数据
 * @param usrData
 * @param day
 * @param rankData
 */
var _genDailyData = function(day, rankData, value, activityData) {
    //玩家活动数据
    var locData = {};
    locData.value = 0;


    locData.rank = [];
    if (rankData) {
        for (var i = 0; i < rankData.length; i++) {
            if (rankData[i].rankType == fiveDaysTargetRankType[day]) {
                locData.rank.push(rankData[i])
            }
        }
    }
    return locData;
}


/**
 * 获得当前活动到第几天
 * @param activityData
 * @return day
 */
exports.getCurDay = function(activityData) {
    return _getCurDay(activityData);
}
/**
 * 获得当前活动到第几天
 * @param activityData
 * @return day
 */
var _getCurDay = function(activityData){
    var today = new Date();
    if (!activityData || today.isAfter(activityData.endTime) || activityData.startTime.isAfter(today)) {
        return -1;
    }
    var startTemp = new Date();
    startTemp.setFullYear(activityData.startTime.getFullYear(), activityData.startTime.getMonth(), activityData.startTime.getDate());
    startTemp.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    var diff =  today - startTemp;
    return  Math.floor((diff)/1000  /  60  /  60  /24);
}
