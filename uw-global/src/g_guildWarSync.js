/**
 * Created by Administrator on 2016/4/9.
 */
var ds = require("uw-ds").ds;
var c_game = require("uw-data").c_game;
var project = require("uw-config").project;

var __syncGroupObjDic = {};//{groupId:{serverId:SyncObj,..},groupId:{serverId:SyncObj,..},..}


var SyncObj = function(){
    this.serverId = null;//服务器id
    this.guildWarObj = null;//对象
    this.syncId = 0;//同步id
    this.conError = 0;//连续失败次数，连续失败10次，则清空一次
    this.serverHost = null;//主机
    this.serverPort = null;//端口
    this.groupId = null;//分组id
    this.isSync = 0;//是否同步
};

//主要数据
var __mainWarData = {
    stopTime:null//停止时间
};

//判断是否开启
exports.getMainWarData = function(){
    return __mainWarData;
};


exports.getGroupObj = function(groupId){
    var groupData = __syncGroupObjDic[groupId]||{};
    return groupData;
};


exports.setObj = function(groupId,serverId,guildWarObj){
    var syncObj = exports.getObj(groupId,serverId);
    syncObj.guildWarObj = guildWarObj;
};

exports.getObj = function(groupId,serverId){
    var groupData = __syncGroupObjDic[groupId]||{};
    var syncObj = groupData[serverId];
    if(syncObj) return syncObj;
    syncObj = new SyncObj();
    syncObj.serverId = serverId;
    groupData[serverId] = syncObj;
    __syncGroupObjDic[groupId] = groupData;
    return syncObj;
};

exports.delObj = function(groupId,serverId){
    var groupData = __syncGroupObjDic[groupId]||{};
    if(groupData[serverId]) delete groupData[serverId];
};

exports.getSyncGroupObjDic = function(){
   return __syncGroupObjDic;
};
