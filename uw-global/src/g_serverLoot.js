/**
 * Created by Administrator on 14-9-25.
 */
var t_serverLoot = require("uw-data").t_serverLoot;
var commonUtils = require("uw-utils").commonUtils;

//整个服务器掉落的缓存
var serverLootCache = {};

//缓存对象
var CacheItem = function (id, nextResetTime) {
    this.id = id;//掉落配置id
    this.times = 0;//已经掉落的次数
    this.nextResetTime = nextResetTime;//下一次重置掉落次数时间
};

/**
 * 初始化
 */
exports.init = function () {
    for (var id = 1; id < 1000; id++) {
        var locLootData = t_serverLoot[id];
        if (!locLootData) break;
        var now = new Date();
        var nextResetTime = now.addHours(locLootData.resetInterval);
        serverLootCache[id] = new CacheItem(id, nextResetTime);
    }
};

/**
 * 获取副本掉落
 * @param serverLootId
 * @returns {*} 物品id
 */
exports.getLootItemId = function (serverLootId) {
    var cacheItem = serverLootCache[serverLootId];
    if(!cacheItem) return null;
    var lootData = t_serverLoot[cacheItem.id];

    //判断次数限制
    var times = getTimes(serverLootId);
    if(times>=lootData.times) return null;
    //概率
    var random = Math.random()*10000;
    if(random > lootData.rate) return null;

    //获取物品id
    var itemId = commonUtils.getRandomOne(lootData.itemIds);
    cacheItem.times++;
    console.log("服务器掉落itemId:%d",itemId);
    return itemId;
};

/**
 * 获取今日掉落次数
 * @param serverLootId
 * returns {Number}
 */
var getTimes = function(serverLootId){
    var cacheItem = serverLootCache[serverLootId];
    var lootData = t_serverLoot[cacheItem.id];
    var now = new Date();
    if(now.isAfter(cacheItem.nextResetTime)){
        //重置掉落
        cacheItem.times = 0;
        cacheItem.nextResetTime = now.addHours(lootData.resetInterval);
    }
    return cacheItem.times;
};

var test = function(){
    require("date-utils");
    exports.init();
    for(var i = 0;i<20;i++){
        console.log(exports.getLootItemId(1));
        console.log(JSON.stringify(serverLootCache));
    }
};

//test();