/**
 * Created by John on 2016/4/14.
 */
//缓存
var incognito = {};
var treasure = {};
var treasureMap = {}; //{"id":treasureEntity}
var kickTimeMap = {};
var uwData = require("uw-data");
var c_game = uwData.c_game;
var t_treasure = uwData.t_treasure;
var async = require("async");
var uwClient = require("uw-db").uwClient;
var incognitoDao = null;
var treasureDao = null;
var treasureBiz = null;
/**
 * 初始化
 */
var checkRequire = function() {
    incognitoDao = incognitoDao || require("uw-pkOut").incognitoDao;
    treasureDao = treasureDao || require("uw-treasure").treasureDao;
    treasureBiz = treasureBiz || require("uw-treasure").treasureBiz;
};
exports.init = function (cb) {
    checkRequire();
    var now = new Date();
    var cd = c_game.treasure[1];
    async.parallel([
        function(cb1){
            incognitoDao.list(uwClient,"openTime > ?",[now.clone().addSeconds(-cd)],cb1);
        },
        function(cb1){
            treasureDao.list(uwClient, "isDelete is null or (isDelete <> 1)",[], cb1);
        }
    ],function(err, data){
        if(err) return cb(err);
        var incofnitoList = data[0];
        var treasureList = data[1];
        for(var i = 0;i<incofnitoList.length;i++){
            var locIncofnito = incofnitoList[i];
            incognito[locIncofnito.userId] = locIncofnito.openTime;
        }
        for(var i=0; i<treasureList.length; i++){
            var loctreasure = treasureList[i];
            treasureMap[loctreasure.id] = loctreasure;
            if(loctreasure.isOpen == 0){
                continue;
            }
            var openTime;
            if(!loctreasure.openTime){
                openTime = new Date();
                loctreasure.openTime = openTime;
            }else {
                openTime = new Date(loctreasure.openTime);
            }
            var temp = t_treasure[loctreasure.treasureId];
            if(!temp){
                continue;
            }
            var cd = temp.guardTime;
            var leftActivityTime = now.getSecondsBetween(openTime.clone().addSeconds(cd));
            //设置老擂主
            exports.dealWithTreasureTimeOut(loctreasure.id, leftActivityTime);
        }
        cb(null);
    })
};

exports.setTreasureOpenTimeOut = function (loctreasure){
    var now = new Date();
    var temp = t_treasure[loctreasure.treasureId];
    if(!temp){
        return;
    }
    var cd = temp.guardTime;
    var leftActivityTime = now.getSecondsBetween(loctreasure.openTime.clone().addSeconds(cd));
    //设置老擂主
    exports.dealWithTreasureTimeOut(loctreasure.id, leftActivityTime);
}

exports.dealWithTreasureTimeOut= function(id, leftActivityTime){
    exports.openTreasureTimeOut(id, leftActivityTime, function(){
        treasureBiz.dealTreasur(id);
    });
};

exports.getKickTime = function(userId){
    return kickTimeMap[userId];
};


exports.setKickTime = function(userId, kickDate){
    kickTimeMap[userId] = kickDate;
};

exports.getTreasureInfoById = function(id,cb) {
    if(cb) {
        return cb(null, treasureMap[id]);
    }else {
        return treasureMap[id];
    }

};

exports.getTreasureCash = function(){
    return treasureMap;
}



exports.setTreasureInfoById = function(id, data){
    treasureMap[id] = data;
}

exports.getTreasureListByUserId = function(userId,cb) {
    var treasureList = [];
    for(var id in  treasureMap){
        if(treasureMap[id] && treasureMap[id].userId == userId){
            treasureList.push(treasureMap[id]);
        }
    }
    cb(null, treasureList);
};

exports.getOpenTreasureListByUserId = function(userId){
    var openTreasureList = [];
    for(var id in  treasureMap){
        if(treasureMap[id] && treasureMap[id].userId == userId && treasureMap[id].isOpen == 0){
            openTreasureList.push(treasureMap[id]);
        }
    }
    return openTreasureList;
};

exports.getOpenTreasureListByUserIdAndItemId = function(userId, itemId){
    var openTreasureList = [];
    for(var id in  treasureMap){
        if(treasureMap[id] && treasureMap[id].userId == userId && treasureMap[id].isOpen == 0 && treasureMap[id].treasureId == itemId){
            openTreasureList.push(treasureMap[id]);
        }
    }
    return openTreasureList;
};

exports.getLootId = function(userId){
    var lootId = 0;
    var MaxLootId = 0;
    var openTime = new Date();
    for (var id in treasureMap){
        if(treasureMap[id] && treasureMap[id].userId == userId ) {
            lootId = id;
            if (treasureMap[id].openTime && treasureMap[id].openTime < openTime) {
                openTime = treasureMap[id].openTime;
                MaxLootId = id;
            }
        }
    }
    if(MaxLootId){
        lootId = MaxLootId;
    }
    return lootId;
}

exports.listTreasur = function(ignoreIds, cb){
    var treasureList = [];
    for(var id in treasureMap) {
        if(treasureMap[id] && ignoreIds.indexOf(treasureMap[id].userId) == -1){
            treasureList.push(treasureMap[id]);
        }
    }
    cb(null, treasureList);
};

exports.getListTreasur = function(ignoreIds){
    var treasureList = [];
    for(var id in treasureMap) {
        if(treasureMap[id] && ignoreIds.indexOf(treasureMap[id].userId) == -1){
            treasureList.push(treasureMap[id]);
        }
    }
    return treasureList;
};

exports.setOpenTime = function(userId, openTime){
    incognito[userId] = openTime;
};

exports.getOpenTime = function(userId){
    return incognito[userId];
};

exports.getIncognitoIds = function() {
    var incognitoIds = [];
    var cd = c_game.treasure[1];
    var now = new Date();
    for(var key in incognito){
        if(incognito[key].clone().addSeconds(cd).isAfter(now)){
            var rand = Math.random() * 100;
            var randMax = c_game.treasure[2] || 100;
            if(rand < randMax)
                incognitoIds.push(parseInt(key));
        }
    }
    return incognitoIds;
};



//开始秘宝倒计时
exports.openTreasureTimeOut = function(id,timeOut, cb) {
    var __timeOutId = treasure[id];
    if (__timeOutId) {
        clearTimeout(__timeOutId);
        __timeOutId = null;
    }
    __timeOutId = setTimeout(cb, timeOut*1000);
    treasure[id] = __timeOutId;
}

//停止秘宝倒计时
exports.clearTreasureTimeOut = function(id){
    var __timeOutId = treasure[id];
    if (__timeOutId) {
        clearTimeout(__timeOutId);
        __timeOutId = null;
    }
}