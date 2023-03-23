/**
 * Created by Administrator on 2016/4/24.
 */

var g_guildWarSync = require("uw-global").g_guildWarSync;
var async = require("async");
var logger = require('uw-log').getLogger("uw-logger", __filename);
var serverUtils = require("uw-utils").serverUtils;
var iface = require("uw-data").iface;

exports.init = function(cb){
    setInterval(_timeSync,3000);
    cb(null);
};

var _timeSync = function(){
    var mainData = g_guildWarSync.getMainWarData();
    //if(!mainData.stopTime) return;
    //if((new Date()).isAfter(mainData.stopTime)) return;
    _syncServerGuildWar();
};

exports.addSyncServer = function(serverGroupId,serverId,serverHost,serverPort,cb){
    var mainData = g_guildWarSync.getMainWarData();
    //mainData.stopTime = (new Date()).addMinutes(30);
   var syncObj =  g_guildWarSync.getObj(serverGroupId,serverId);
    syncObj.serverHost = serverHost;
    syncObj.serverPort = serverPort;
    syncObj.isSync = 1;
    cb(null);
};

exports.getOtherServerData = function(serverGroupId,serverId,serverHost,serverPort,cb){
    //预防主服务器重启
    exports.addSyncServer(serverGroupId,serverId,serverHost,serverPort,function(){});

    var groupObj = g_guildWarSync.getGroupObj(serverGroupId);
    var otherServerSyncObj = {};
    for(var key in groupObj){
        var locSyncObj = groupObj[key];
        if(locSyncObj.serverId == serverId) continue;
        otherServerSyncObj[locSyncObj.serverId] = locSyncObj;
    }
    cb(null,otherServerSyncObj);
};

var _syncServerGuildWar = function(){
    var syncObjDic = g_guildWarSync.getSyncGroupObjDic();
    var objList = [];
    for(var key in syncObjDic){
        var locGroupData = syncObjDic[key];
        for(var gKey in locGroupData){
            var locObj = locGroupData[gKey];
            objList.push(locObj);
        }
    }
    var intervalTime = 2000/objList.length+1;

    for(var i = 0;i<objList.length;i++){
        _timeSyncServerGuildWar(objList[i],i*intervalTime);
    }
};

var _timeSyncServerGuildWar = function(syncObj,time){
    setTimeout(function(){
        _syncOneServerGuildWar(syncObj,function(err,data){
            if(err) {
                logger.error("同步数据错误err：",err);
            }
        });
    },time);
};

var _syncOneServerGuildWar = function(syncObj,cb){

    if(!syncObj.isSync) return cb();
    _requestGetServerGuildWarObj(syncObj.serverHost,syncObj.serverPort,function(err,data){
        if(err||!data){
            syncObj.conError++;
            if(syncObj.conError>=5){
                syncObj.conError = 0;
                syncObj.guildWarObj = null;
                syncObj.isSync = 0;
            }
            cb(err);
        }else{
            syncObj.conError = 0;
            _syncGuildWarObj(syncObj,data.syncId,data.guildWarObj);
            cb(null);
        }
    });
};

var _syncGuildWarObj = function(syncObj,serverSyncId,guildWarObj){
    syncObj.syncId = serverSyncId;
    syncObj.guildWarObj = guildWarObj;
    if(guildWarObj){
        delete guildWarObj._guildWarGroupDic;
        delete guildWarObj._guildWarUserGroupDic;
        delete guildWarObj._guildWarDefenceRecordDic;


        //if(guildWarObj._guildWarDic) delete guildWarObj._guildWarDic;
        for(var key in guildWarObj._guildWarDic){
            var locGuildWar = guildWarObj._guildWarDic[key];
            if(!locGuildWar) continue;
            delete locGuildWar.fightRecordArr;
            delete locGuildWar.refreshId;
        }
        //if(guildWarObj._guildWarUserDic) delete guildWarObj._guildWarUserDic;
        for(var key in guildWarObj._guildWarUserDic){
            var locUserWar = guildWarObj._guildWarUserDic[key];
            if(!locUserWar) continue;
            delete locUserWar.nextFightTime;//下一次可以战斗的时间
            delete locUserWar.inspireEndTime;//鼓舞结束时间
            delete locUserWar.guildPosition;//行会职务
            delete locUserWar.nextUpTime;//下一次上阵时间
        }

        //攻击数据只推20条
        //if(guildWarObj._guildWarAttackRecordDic) delete guildWarObj._guildWarAttackRecordDic;
        for(var key in guildWarObj._guildWarAttackRecordDic){
           var locList = guildWarObj._guildWarAttackRecordDic[key];
            var locTempList = [];
            for(var i = 0;i<20;i++){
                var locData =locList[i];
                if(locData) locTempList.push(locData);
            }
            guildWarObj._guildWarAttackRecordDic[key] = locTempList;
        }
    }
};

/**
 * 请求服务器数据
 * @param serverHost
 * @param serverPort
 * @param cb
 * @private
 */
var _requestGetServerGuildWarObj = function(serverHost,serverPort,cb){
    var args = {};
    serverUtils.requestServer(iface.admin_guildWar_getCurServerGuildWarObj,args,serverHost,serverPort,cb);
};