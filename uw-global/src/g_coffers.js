/**
 * Created by Administrator on 14-9-25.
 */
var uwClient = require("uw-db").uwClient;
var async = require('async');
var logger = require('uw-log').getLogger("uw-logger", __filename);
var coffersDao;
var checkRequire = function(){
    coffersDao = coffersDao || require("uw-coffers").coffersDao;
};

//公会缓存
var __coffersCache = {};

var __isUpdatingKey = "1";
var __updateDirtyKey = "2";

var __isUpdating = false;
var __updateIdDic = {};
var __updateIdAdd = 0;
//初始化国库
exports.init = function(data){
    for(var key in data){
        __coffersCache[key] = data[key];
    }
};

//获取国库
exports.getCoffers = function(){
    return __coffersCache;
};

//设置国库数据
exports.setCoffers = function(data){
    for(var key in data){
        __coffersCache[key] = data[key];
    }

    if(__updateIdAdd>100000000) __updateIdAdd = 0;
    __updateIdAdd++;
    __updateIdDic[__updateIdAdd] = 1;

};

//如果有数据更新，则同步
exports.coffersSys = function(){
    checkRequire();

    if(__isUpdating) return;
    __isUpdating = true;

    var isUpdateDirty = false;

    for(var key in __updateIdDic){
        isUpdateDirty = true;
        delete __updateIdDic[key];
    }

    if(isUpdateDirty){
        var updateData = {};
        for(var key in __coffersCache){
            if(key == "buffBase") continue;
            updateData[key] = __coffersCache[key];
        }
        coffersDao.update(uwClient,updateData,{id:__coffersCache.id},function(err,data){
            if(err) {
                logger.error("国库同步数据失败！");
                logger.error(err);
            }
            __isUpdating = false;
        });
    }else{
        __isUpdating = false;
    }
};

/****************************************************************/
