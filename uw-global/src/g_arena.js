/**
 * Created by Administrator on 2015/3/21.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
require("date-utils");

//整个服务器竞技场挑战排行的缓存
var arenaRankCache = {};
var expireDate = 5;//2分钟
var lowestRank = 0;

//缓存对象
var CacheItem = function (arenaId, rank, fightTime,beFightTime) {
    this.arenaId = arenaId;
    this.rank = rank;//排名
    this.fightTime = fightTime;//发起时间
    this.beFightTime = beFightTime;//被挑战时间
    this.fightIds = [];//挑战他的人id
};

/**
 * 获取排名
 * @param arenaId
 */
exports.getFightRank = function(arenaId){
    var cacheData = arenaRankCache[arenaId];
    if(!cacheData){
        return 0;
    }else{
        return cacheData.rank;
    }
};

/**
 * 新添一个挑战记录
 * @param arenaId
 * @param beFightArenaId
 * @param rank
 * @param beRank
 */
exports.addFight = function(arenaId, beFightArenaId, rank, beRank){
    var cacheData = arenaRankCache[arenaId];
    if(!cacheData){
        cacheData = new CacheItem(arenaId,rank,new Date());
        arenaRankCache[arenaId] = cacheData;
    }else{
        //存在则不更改排名
        cacheData.fightTime = new Date();
    }

    var beFightData = arenaRankCache[beFightArenaId];
    if(!beFightData){
        beFightData = new CacheItem(beFightArenaId,beRank,null,new Date());
        arenaRankCache[beFightArenaId] = beFightData;
    }else{
        //存在则不更改排名
        beFightData.beFightTime = new Date();
    }
    if(beFightData.fightIds.indexOf(arenaId)==-1){
        beFightData.fightIds.push(arenaId);
    }
    logger.debug("新添一个挑战记录 cacheData：%s beFightData:%s", JSON.stringify(cacheData) , JSON.stringify(beFightData));
};

/**
 * 移除挑战记录
 * @param arenaId
 * @param beFightArenaId
 */
exports.removeFight = function(arenaId, beFightArenaId){
    //移除挑战者
    var cacheData = arenaRankCache[arenaId];
    if(!cacheData) return;
    if(cacheData.fightIds.length<=0){
        delete arenaRankCache[arenaId];
    }

    //移除被挑战者
    var beFightData = arenaRankCache[beFightArenaId];
    if(!beFightData) return;
    for (var i = 0, l = beFightData.fightIds.length; i < l; i++) {
        if (beFightData.fightIds[i] == arenaId) {
            beFightData.fightIds.splice(i, 1);
            break;
        }
    }
    if(beFightData.fightIds.length<=0){
        delete arenaRankCache[beFightArenaId];
    }

    logger.debug("移除挑战记录 cacheData：%s beFightData:%s", JSON.stringify(arenaRankCache[arenaId]) , JSON.stringify(arenaRankCache[beFightArenaId]));
};


/**
 * 更换排名
 * @param arenaId1
 * @param arenaId2
 */
exports.changeRank = function(arenaId1, arenaId2){
    var cacheData1 = arenaRankCache[arenaId1];
    var cacheData2 = arenaRankCache[arenaId2];
    var tempRank1 = cacheData1.rank;
    var tempRank2 = cacheData2.rank;
    cacheData1.rank = tempRank2;
    cacheData2.rank = tempRank1;
};

/**
 * 判断是否某人是否在战斗中
 * @param arenaId
 * @returns {boolean}
 */
exports.isFighting = function(arenaId){
    var cacheData = arenaRankCache[arenaId];
    if(!cacheData) return false;
    var fightTime = cacheData.fightTime;
    //超过2分钟则认为过期
    if((new Date()).addMinutes(expireDate*-1).isAfter(fightTime) ){
        delete arenaRankCache[arenaId];
        return false;
    }
    var beFightTime = cacheData.beFightTime;
    //超过2分钟则认为过期
    if((new Date()).addMinutes(expireDate*-1).isAfter(beFightTime) ){
        delete arenaRankCache[arenaId];
        return false;
    }
    return true;
};

/*
exports.getFightRank(1,1,false);
exports.getFightRank(2,2,true);
console.log(exports.isFighting(1));
console.log(exports.isFighting(2));
*/


//获得最低排名
exports.getLowestRank = function(){
    return lowestRank;
};

//设置最低排名
exports.setLowestRank = function(rank){
    if(rank && rank >0) lowestRank = rank;
};

//清除缓存
exports.clearCache = function(){
    if(arenaRankCache.length > 0){
        arenaRankCache = {};
    }
}
