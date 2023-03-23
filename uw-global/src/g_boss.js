/**
 * Created by Administrator on 2016/3/2.
 */


var BossObj = null;
var checkRequire = function(){
    BossObj = require("uw-boss").BossObj;
};


var __bossCache = {};

var __userObjDic = {};

var UserObj = function(){
    this.lastExitTime = null;//上一次退出战斗时间
};

//获取boss开启状态
exports.getOpenBossIds = function(){
    var reIds = [];
    for(var key in __bossCache){
        var locBossId = parseInt(key);
        var locBossObj = __bossCache[key];
        if(locBossObj.isOpen()){
            var bossData = locBossObj.getBossData();
            if(!bossData.isOver)
                reIds.push(locBossId);
        }
    }
    return reIds;
};

//获取boss实例
exports.getBossObj = function(bossId){
    checkRequire();
    var bossObj = __bossCache[bossId];
    if(!bossObj) {
        bossObj = new BossObj();
        bossObj.initBossId(bossId);
    }
    __bossCache[bossId] = bossObj;
    return bossObj;
};

//获取boss缓存
exports.getBossCache = function(){
    return __bossCache;
};

//获取用户数据
exports.getUserObj = function (userId) {
    var userObj = __userObjDic[userId];
    if (!userObj) {
        userObj = new UserObj();
        __userObjDic[userId] = userObj;
    }
    return userObj;
};

//获取用户数据
exports.setUserObj = function (userId,userObj) {
    __userObjDic[userId] = userObj;
};