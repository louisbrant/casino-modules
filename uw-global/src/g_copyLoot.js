/**
 * Created by Administrator on 2015/9/18.
 */


/*
 数据结构说明
lootCache = {
    userId1:{
        copyId1:{id1:[[物品id,数量],isBoss,isIgnore],id2:[[物品id,数量],..]}
         ...
    },
    ...
}
*/

//整个服务器掉落的缓存
var lootCache = {};
var userUidCache = {};//{userId:uid,..}

exports.getLootCache = function(){
    return  lootCache;
};

/**
 * 获得一次物品
 * @param userId
 * @param copyId
 * @param items [[物品id,数量],..]
 * @param isBoss
 * @param isIgnore
 * @returns {Number} 唯一id
 */
exports.newOneItems =  function(userId, copyId, items,isBoss,isIgnore){
    var  locUid = _getUserUid(userId);
    var copyObj = _getCopyObj(userId,copyId);
    copyObj[locUid] = [items,isBoss,isIgnore];

    //检查过期数据
    _checkExpire(userId,locUid);
    return locUid;
};

//获取一次物品
exports.getItemsByUid = function(userId, copyId, uid){
    var copyObj = _getCopyObj(userId,copyId);
    return copyObj[uid];
};

//删除数据
exports.delByUserId = function(userId){
    var userObj = lootCache[userId];
    if(!userObj) return;
    delete lootCache[userId];
};

//删除数据
exports.delByCopyId = function(userId, copyId){
    var userObj =  _getUserObj(userId);
    var copyObj = userObj[copyId];
    if(!copyObj) return;
    delete userObj[copyId];
};

//删除某个物品组
exports.delByUid = function(userId, copyId, uid){
    var copyObj =  _getCopyObj(userId, copyId);
    var items = copyObj[uid];
    if(!items) return;
    delete copyObj[uid];
};

//是否存在掉落
exports.hasUid = function(userId,copyId,uid) {
    var cacheObj = _getUserObj(userId);
    var copyObj = cacheObj[copyId];
    if(!copyObj) return false;
    var items = copyObj[uid];
    if(!items) return false;
    return true;
};

var _getUserObj = function(userId){
    var cacheObj = lootCache[userId];
    if(!cacheObj) {
        cacheObj = {};
        lootCache[userId] = cacheObj;
    }
    return cacheObj;
};

var _getCopyObj = function(userId,copyId){
    var cacheObj =  _getUserObj(userId);
    var obj = cacheObj[copyId];
    if(!obj) {
        obj = {};
        cacheObj[copyId] = obj;
    }
    return obj;
};

var _getUserUid = function(userId){
    var locUid =  userUidCache[userId]||0;
    if(locUid>999999999) locUid = 0;
    locUid++;
    userUidCache[userId] = locUid;
    return locUid;
};

var _checkExpire = function(userId,curUid){
    var cacheObj =  _getUserObj(userId);
    for(var locCopyId in cacheObj){
        var locCopyObj = cacheObj[locCopyId]||{};
        for(var locUId in locCopyObj){
            locUId = parseInt(locUId);
            if((curUid-locUId)>10){
                delete locCopyObj[locUId];
            }
        }
        if(Object.keys(locCopyObj).length<=0){
            delete cacheObj[locCopyId];
        }
    }
};
