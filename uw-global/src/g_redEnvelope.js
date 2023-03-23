/**
 * Created by Sara on 2016/1/4.
 */
var uwClient = require("uw-db").uwClient;
var async = require('async');
var logger = require('uw-log').getLogger("uw-logger", __filename);
var redEnvelopeDao;
var userDao;
var checkRequire = function(){
    redEnvelopeDao = require("uw-red-envelope").redEnvelopeDao;
    userDao = require("uw-user").userDao;
};

//红包缓存
var __redEnvelopeCache = {};
var __nameCache = {};
var __updateIdList = [];
var __isUpdating = false;
var rid = 0;

var RedEnvelopeData = function(){
    this.redEnvelope = null;//红包数据
    this.name = null;//发红包名字
};

/**
 * 初始化
 */
exports.init = function (cb) {
    checkRequire();
    redEnvelopeDao.list(uwClient, " isDelete = ? order by id desc",[0], function (err, redEnvelopeList) {
        if (err) return cb(err);
        var ids = [];
        //筛选过期的
        var index = 0;
        for (var i = 0; i < redEnvelopeList.length; i++) {
            index ++;
            var locRedData = redEnvelopeList[i];
            if(!_isNeedToDel(locRedData)){
                if(ids.indexOf(locRedData.userId)<0) ids.push(locRedData.userId);
                __redEnvelopeCache[locRedData.id] = locRedData;
                if(index <=1) rid = locRedData.id;
            }
        }
        if(ids.length <= 0) return cb();
        userDao.listCols(uwClient," id,nickName "," id in (?) ",[ids],function(err,userList) {
            if (err) return cb(err);
            for (var j = 0; j < userList.length; j++){
                __nameCache[userList[j].id] = userList[j].nickName||"";
            }
            __nameCache[0] = "系统";
            cb();
        });
    });
};

/**
 * 获取当前的uid
 * @returns {number}
 */
exports.getCurUID = function(){
    return rid;
};

/**
 * 获取列表
 * @returns
 */
exports.getList = function(){
    var obj = {};
    for(var key in __redEnvelopeCache){
        var redEnvelopeData = __redEnvelopeCache[key];
        if(_isNeedToDel(redEnvelopeData)){
            delete __redEnvelopeCache[key];
        }else{
            obj[redEnvelopeData.userId] = __nameCache[redEnvelopeData.userId];
        }
    }
    __nameCache = obj;
    return [__redEnvelopeCache,__nameCache];
};

//获得红包
exports.getRedEnvelope = function(redEnvelopeId){
    var data = __redEnvelopeCache[redEnvelopeId];
    if(!data) return null;
    var name = __nameCache[__redEnvelopeCache[redEnvelopeId].userId]||"";
    return [data,name];
};

//设置红包
exports.setRedEnvelope = function(redEnvelopeId,redEnvelope,name){
    __redEnvelopeCache[redEnvelopeId] = redEnvelope;
    __nameCache[redEnvelope.userId] = name;

    if(__updateIdList.indexOf(redEnvelopeId)<0){
        __updateIdList.push(redEnvelopeId);
    }
};

//如果有红包数据更新，则同步
exports.redEnvelopeSys = function(){
    if(__isUpdating) return;
    __isUpdating = true;
    var updateRedEnvelopeList = [];
    for(var i = 0;i<__updateIdList.length;i++){
        var locId = __updateIdList[i];
        var locRedEnvelope = exports.getRedEnvelope(locId)[0];
        if(!locRedEnvelope) continue;
        rid = locId;
        updateRedEnvelopeList.push(locRedEnvelope);
    }
    __updateIdList.length = 0;
    async.map(updateRedEnvelopeList,function(RedEnvelopeData,cb1){
        redEnvelopeDao.update(uwClient,RedEnvelopeData,{id:RedEnvelopeData.id},cb1);
    },function(err,data){
        if(err) {
            logger.error("红包同步数据失败！");
            logger.error(err);
        }
        __isUpdating = false;
    });
};

/****************************************************************/

/**
 * 是否需要删除
 * @param redEnvelopeData
 * @returns {boolean}
 * @private
 */
var _isNeedToDel = function (redEnvelopeData) {
    var expireTime = redEnvelopeData.expireTime;
    var nowTime = new Date();
    //判断是否已经过期
    if (expireTime.isBefore(nowTime) || expireTime.equals(nowTime)) {
        return true;
    }
    return false;
};
