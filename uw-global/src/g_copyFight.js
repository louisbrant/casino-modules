/**
 * Created by Administrator on 2015/9/18.
 */
var commonUtils = require("uw-utils").commonUtils;

//缓存
var fightCache = {};

/**
 * 新增
 * @param userId
 * @param lootUid
 */
exports.newData =  function(userId,lootUid){
    var randomKey = commonUtils.getRandomLetter(6);
    fightCache[userId] = [lootUid,randomKey];
};

/**
 * 获取
 * @param userId
 * @returns {*}
 */
exports.getData = function(userId){
    return fightCache[userId];
};

/**
 * 删除
 * @param userId
 */
exports.delData =  function(userId){
    if(!fightCache[userId]) return;
    delete fightCache[userId];
};
