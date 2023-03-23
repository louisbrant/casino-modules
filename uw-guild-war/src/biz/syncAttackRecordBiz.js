/**
 * Created by Administrator on 2016/5/4.
 */

var g_guildWar = require("uw-global").g_guildWar;
var g_gameConfig = require("uw-global").g_gameConfig;
var redisHelper = require("uw-db").redisHelper;
var project = require("uw-config").project;
var async = require("async");

var guildGroupBiz = null;
var guildWarUtils = null;
var checkRequire = function(){
    guildGroupBiz = guildGroupBiz || require("./guildGroupBiz");
    guildWarUtils = guildWarUtils || require("./guildWarUtils");
};

//开启时，初始化数据

exports.pushMyRecordDynamicData = function(cb){
    if(!g_guildWar.isSync()) return cb(null);
    //每次都更新所有的
    var pushKey = _getSaveAttackRecordDynamicKey();
    var obj = g_guildWar.getMyObj();
    var attackRecordDic = obj.getGuildWarAttackRecordDic();
    var saveObj = {};
    for(var key in attackRecordDic){
        var locArr = attackRecordDic[key]||[];
        var locTempArr = [];
        var locSyncNum = 0;
        for(var i = locArr.length-1;i>=0;i--){
            var locData = locArr[i];
            locSyncNum ++;
            if(!locData) continue;
            locTempArr.push(_getSaveDynamicRecord(locData));
            if(locSyncNum>=10) break;
        }
        saveObj[key] = locTempArr;
    }
    redisHelper.getClient(_getClientCfg()).hset(pushKey,[project.serverId,JSON.stringify(saveObj)] ,function(err,getLength){
        if(err) return cb(err);
        cb(null);
    });
};

//清除行会动态数据
exports.clearMyRecordDynamicData = function(cb){
    checkRequire();
    guildGroupBiz.initRedisId(function(){
        var pushKey = _getSaveAttackRecordDynamicKey();
        redisHelper.getClient(_getClientCfg()).hdel(pushKey,project.serverId,function(err,getLength){
            if(err) return cb(err);
            cb(null);
        });
    });
};


exports.syncOtherRecordDynamicData = function(cb){
    if(!g_guildWar.isSync()) return cb(null);
    //其他动态数据
    //其他静态数据
    var g_serverData = g_guildWar.getServerData();
    var groupArr = _arrToGroupArr(g_serverData.otherServerArr,10);

    async.mapLimit(groupArr,1,function(locServerArr,cb1){
        _syncOtherRecordDynamicData(locServerArr,function(err,data){
            cb1();
        });
    },function(err,data){
        cb();
    });
};


var _syncOtherRecordDynamicData = function(serverArr,cb){
    //过滤不需要同步的服务器
    if(serverArr.length<=0) return cb();
    var pushKey = _getSaveAttackRecordDynamicKey();
    redisHelper.getClient(_getClientCfg()).hmget(pushKey,serverArr,function(err,saveServerDataList){
        if(err) return cb(err);

        for(var i = 0 ;i<saveServerDataList.length;i++){
            var locSaveObj = saveServerDataList[i];
            if(!locSaveObj) continue;
            var locServerId = serverArr[i];
            locSaveObj = JSON.parse(locSaveObj);

            var locGuildWarObj = g_guildWar.getObj(locServerId);
            var locAttackRecordDic = locGuildWarObj.getGuildWarAttackRecordDic();
            for(var key in locSaveObj){
                var locArr = locSaveObj[key]||[];
                if(locArr.length<=0) continue;
                var locTempArr = [];
                for(var j = 0;j<locArr.length;j++){
                    var locData = locArr[j];
                    var locUnData = _untSaveDynamicRecord(locData);
                    locTempArr.push(locUnData);
                }
                locAttackRecordDic[key] = locTempArr;
            }
        }
        cb(null);
    });
};


var _getSaveAttackRecordDynamicKey = function(){
    return "guildWar-attackRecord-dynamic";
};


var _getClientCfg = function(){
    checkRequire();
    return guildWarUtils.getClientCfg();
};

var _getSaveDynamicRecord = function(recordData){
    var ret = [];
    ret.push(recordData.aServerId);//攻击者服务器id
    ret.push(recordData.aServerName);//攻击者服务器名
    ret.push(recordData.aUserName);//攻击者名称
    ret.push(recordData.aGuildName);//攻击者行会
    ret.push(recordData.dServerId);//防守者服务器id
    ret.push(recordData.dServerName );//防守者服务器名
    ret.push(recordData.dUserName);//防守者名称
    ret.push(recordData.dGuildName );//防守者行会
    ret.push(recordData.isBreak );//是否击破
    ret.push(recordData.door);//门
    ret.push(recordData.time);//时间

    return ret;
};

var _untSaveDynamicRecord = function(saveRecordData){
    var obj = {};
    obj.aServerId =saveRecordData[0];
    obj.aServerName =saveRecordData[1];
    obj.aUserName = saveRecordData[2];
    obj.aGuildName = saveRecordData[3];
    obj.dServerId =saveRecordData[4];
    obj.dServerName = saveRecordData[5];
    obj.dUserName = saveRecordData[6];
    obj.dGuildName = saveRecordData[7];
    obj.isBreak =saveRecordData[8];
    obj.door = saveRecordData[9];
    obj.time = saveRecordData[10];
    return obj;
};


var _copyValueToObj = function(obj1,obj2){
    for(var key in obj2){
        if(obj1.hasOwnProperty(key)){
            obj1[key] = obj2[key];
        }
    }
};

var _arrToGroupArr = function(arr,maxNum){
    var groupArr = [];
    var tempNum = [];
    var tempArr = [];
    for(var i = 0;i<arr.length;i++){
        tempNum++;
        var locServerId = arr[i];
        tempArr.push(locServerId);
        if(tempNum>=maxNum){
            groupArr.push(tempArr.concat([]));
            tempArr.length = 0;
            tempNum = 0;
        }
    }
    if(tempArr.length >0){
        groupArr.push(tempArr.concat([]));
    }
    return groupArr;
};