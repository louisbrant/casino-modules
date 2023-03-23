/**
 * Created by Administrator on 2016/1/6.
 */
var  __timeOutId = null; //活动结束的定时器
var  __timeOutId2 = null; //玩家守擂倒计时的定时器
var  __championUserData = {}; //当前守擂者信息
var __isOpen = false; //活动是否开启
var __isFirst = false;
var __usrDic = {}; //参加活动的玩家列表 key: userId  value: startFightTime 开始战斗时间  endFightTime 结束战斗的时间 opNum围观操作次数
var __championDic = {}; //守擂玩家信息 key: usertId value: challengeCupRankEntity
var __rankRefreshTime = null;//排行榜刷新时间
var __rankUserList = [];//排行榜数据
var __challengerUserId = null; //当前挑战者id
var __isUpdating = false;
var __isUpdate = false;
var __weiguanData = {up:0,down:0};//围观数据
var challengeCupDao = null;
var challengeCupBiz = null;
var challengeCupRankDao =null;

var async = require("async");
var uwData = require("uw-data");
var c_prop = uwData.c_prop;
var uwClient = require("uw-db").uwClient;

var checkRequire = function(){
    challengeCupDao = require("uw-challenge-cup").challengeCupDao;
    challengeCupRankDao = require("uw-challenge-cup").challengeRankCupDao;
    challengeCupBiz = require("uw-challenge-cup").challengeCupBiz;
};
exports.init = function (client, cb) {
    checkRequire();
    exports.reset();

    //初始化守擂信息
    async.parallel([
        function(cb1){
            challengeCupRankDao.list(client, {}, function (err, data) {
                for (var i = 0; i < data.length; i++) {
                    var locData = {};
                    locData.id = data[i].id;
                    locData.userId = data[i].userId;
                    locData.startTime = data[i].startTime;
                    locData.endTime = data[i].endTime;
                    locData.iconId = data[i].iconId;
                    locData.nickName = data[i].nickName;
                    locData.maxTime = data[i].maxTime; //历史最长守擂时间
                    locData.lvl = data[i].lvl;
                    locData.vip = data[i].vip;
                    __championDic[locData.userId] = locData;
                }
                cb1(null);
            });
        },
        function(cb1){
            challengeCupDao.list(client, {}, function (err, data){
                var locData = data[0] || {};
                var exData = locData.exData || {};
                for(var userId in exData) {
                    var userData = __usrDic[userId]|{};
                    userData.startFightTime = new Date(exData[userId].startFightTime);
                    userData.endFightTime = new Date(exData[userId].endFightTime);
                    __usrDic[userId] = userData;
                }

                for(var key in locData){
                    if(key == "exData") continue;
                    __championUserData[key] = locData[key];
                }
                cb1(null);
            })
        }], function(err, data){
        if (err) return cb(err);
        challengeCupBiz.openChallengeCup(client,function(){cb(null)});
        //cb(null)
    });
}

exports.getWeiguanData = function(){
    return __weiguanData;
};

exports.reset = function(){
    __championUserData = {};
    __isOpen = false;
    __usrDic = {};
    __championDic = {};
    __rankRefreshTime = null;
    __rankUserList = [];
    __isFirst = false;
    __challengerUserId = null;
    __isUpdating = false;
    __isUpdate = false;

    __weiguanData.up = 0;
    __weiguanData.down = 0;

    if(__timeOutId){
        clearTimeout(__timeOutId);
        __timeOutId = null;
    }
    if(__timeOutId2){
        clearTimeout(__timeOutId2);
        __timeOutId2 = null;
    }
};

exports.exitFight = function(userId) {
    if (userId != __challengerUserId){
        return;
    }
    __challengerUserId = 0;
    var userData = __usrDic[userId];
    if(userData)
        userData.endFightTime = new Date();
}

exports.getIsFirst = function(){
    return __isFirst;
}

exports.setIsFirst = function(value) {
    return __isFirst = value;
}

exports.getIsChallenged = function() {//守擂者是否在挑战中
  if (__challengerUserId){
      return true;
  }else {
      return false;
  }
};

exports.getChallengerUserId = function() {
    return __challengerUserId;
}

exports.setChallengerUserId = function(userId) {
    __challengerUserId = userId;
}


exports.getChampionCupUserData = function() {
    return __championUserData;
};

exports.setChampionCupUserData = function(data) {
    __championUserData = data;
    __isUpdate = true;
}

//开启守擂倒计时
exports.openChampionTimeout = function(timeOut, activityOver) {
    if (__timeOutId2) {
        clearTimeout(__timeOutId2);
        __timeOutId2 = null;
    }
    __timeOutId2 =  setTimeout(activityOver,timeOut*1000);
}

//开始活动倒计时
exports.openActivityTimeOut = function(timeOut, activityOver) {
    if (__timeOutId) {
        clearTimeout(__timeOutId);
        __timeOutId = null;
    }
    __timeOutId = setTimeout(activityOver, timeOut*1000);
}

//开启活动
exports.setOpen = function(value) {
    __isOpen = value;
}

//获取活动状态
exports.getIsOpen = function() {
    return __isOpen;
}

//获取参与活动的用户信息
exports.getUserDic = function() {
    return __usrDic;
}

exports.getUserData = function(userId) {
    return __usrDic[userId];
}

exports.clearUserData = function() {
    __usrDic = {};
}

exports.setUserData = function(userId, data) {
    __usrDic[userId] = data;
}

exports.getChampionDic = function() {
    return __championDic;
}

exports.setChampionDic = function(data) {
    return __championDic = data;
}

exports.getChampionData = function(userId) {
    return __championDic[userId];
}

exports.setChampionData = function(userId, data){
    __championDic[userId] = data;
}


//获取守擂时长排行数据
exports.getRankUserList = function(userId){
    if(!__rankRefreshTime){
        __rankRefreshTime = new Date();
    }
    exports.calChampionRank(userId);
    if(__rankUserList.length<=0) exports.calChampionRank(userId);

    return __rankUserList;
};

//获取守擂时间排行
exports.calChampionRank = function(myUserId) {
    var list = [];
    for(var key in __championDic){
        var userData = __championDic[key];
        var endTime = userData.endTime;
        if(!endTime){
            endTime = new Date();
        }
        if(!userData.startTime){
            userData.startTime = new Date();
        }
        var durationTime = endTime - userData.startTime;
        if(!userData.maxTime){
            userData.maxTime = 0;
        }
        if (durationTime > userData.maxTime)
            userData.maxTime = durationTime;
        else {
            durationTime = userData.maxTime;
        }
        if(durationTime<=0) continue;
        list.push([userData.userId,durationTime]);
    }
    list = sortList(list);
    var rank = 0;
    var returnArr = [];
    var myData = null;
    for(var i=0;i<list.length;i++){
        rank ++;
        var userId = list[i][0];
        __championDic[userId].rank = rank;
        if(userId == myUserId){
            myData = __championDic[userId];
        }
        if(returnArr.length<20) returnArr.push(__championDic[userId]);
    }
    returnArr.push(myData);
    __rankUserList = returnArr;
}

//获取活动数据
exports.getActivityData = function() {
    var reActivity = {};
    var activityData = {};
    activityData.type = c_prop.activityTypeKey.challengeCup;
    activityData.isOpen = __isOpen;
    reActivity.activity = activityData;
    return reActivity;
}

//排序
var sortList = function(list){
    //数据结构：[id,守擂时间]
    var sortIdx = [1,0]; //排序规则：守擂时间＞id
    var sortType = [-1,1]; //id升序，守擂降序
    list.sort(function (a, b) {
        for (var i = 0; i < 2; i++) {
            var type = sortType[i];
            if (a[sortIdx[i]] > b[sortIdx[i]]) {
                return type <= 0 ? -1 : 1;
            }
            else if (a[sortIdx[i]] < b[sortIdx[i]]) {
                return type <= 0 ? 1 : -1;
            }
        }
        return 0;
    });
    return list;
};


//如果有擂主数据更新，则同步
exports.challengeCupSys = function(){
    if(__isUpdating) return;
    __isUpdating = true;
    if(!__isUpdate){ __isUpdating = false; return;}
    var updateChampionUserData = {};
    updateChampionUserData.worship = __championUserData.worship;
    updateChampionUserData.worshipCount = __championUserData.worshipCount;
    updateChampionUserData.buffOpenNum = __championUserData.buffOpenNum;
    updateChampionUserData.buffOpenTime = __championUserData.buffOpenTime;
    updateChampionUserData.buffEndTime = __championUserData.buffEndTime;
    challengeCupDao.update(uwClient, updateChampionUserData, {id: __championUserData.id}
    ,function(err,data){
        if(err) {
            logger.error("擂台同步数据失败！");
            logger.error(err);
        }
        __isUpdating = false;
        __isUpdate = false;
    });
};