/**
 * Created by Administrator on 2016/4/9.
 */
var ds = require("uw-ds").ds;
var c_game = require("uw-data").c_game;
var GuildWarObj = require("./GuildWarObj.js");
var project = require("uw-config").project;

var __guildWarObjDic = {};

var __otherServerSyncObj = {};
//主要数据
var __mainWarData = {
    isOpen :0,//活动是否开启
    startTime :null,//开始时间
    endTime :null, //结束时间
    msgTimeArr:[]// 播放过的时间点消息
};

var __serverData = {
    serverGroupId: 0,//服务器组别
    serverSyncId: 0,//服务器同步id
    redisId: -1,//redis序号
    serverHost: "",//服务器主机
    serverPort: 0,//服务器端口
    errNum:0,//报错次数
    isStarting:0,//是否启动中
    isSync:0, //是否同步，活动开启时才同步，活动结束后一段时间结束同步
    otherServerArr:[], //其他服务器组
    staticSyncDic:{}, //静态数据同步完成
    syncStatus:{} //同步状态
};

exports.resetServerData = function(){
    __serverData.serverGroupId = 0;
    __serverData.serverSyncId= 0;//服务器同步id
    __serverData.redisId= -1;//redis序号
    __serverData.serverHost= "";//服务器主机
    __serverData.serverPort= 0;//服务器端口
    __serverData.errNum=0;//报错次数
    __serverData.isStarting=0;//是否启动中
    __serverData.isSync=0; //是否同步，活动开启时才同步，活动结束后一段时间结束同步
    __serverData.otherServerArr=[]; //其他服务器组
    __serverData.staticSyncDic={}; //静态数据同步完成
    __serverData.syncStatus={} //同步状态
};

exports.setSyncStatus = function(key,status){
    __serverData.syncStatus[key] = status;
};

exports.getSyncStatus = function(key){
    return __serverData.syncStatus[key];
};

exports.setStaticSync = function(serverId){
    __serverData.staticSyncDic[serverId] = 1;
};

exports.isStaticSync = function(serverId){
    return __serverData.staticSyncDic[serverId];
};

exports.setIsSync = function(isSync){
    __serverData.isSync = isSync;
};

exports.isSync = function(){
    return __serverData.isSync;
};

exports.setOtherServerSyncObj = function(serverId,obj){
    __otherServerSyncObj[serverId] = obj;
};

exports.getOtherServerSyncObj = function(serverId){
    return __otherServerSyncObj[serverId];
};

exports.clear = function(){
    for(var key in  __guildWarObjDic){
        var locObj = __guildWarObjDic[key];
        locObj.clear();
    }
    __guildWarObjDic = {};
    __mainWarData = {
        isOpen :0,//活动是否开启
        startTime :null,//开始时间
        endTime :null, //结束时间
        msgTimeArr:[]// 播放过的时间点消息
    };
};

exports.getServerData = function(){
    return __serverData;
};

exports.setServerGroupId = function(serverGroupId){
    __serverData.serverGroupId = serverGroupId;
};

exports.getServerGroupId = function(){
    return __serverData.serverGroupId;
};

exports.getServerSyncId = function(){
    return __serverData.serverSyncId;
};

exports.addServerSyncId = function(){
    __serverData.serverSyncId++;
};

exports.getGuildWarObjDic = function(){
    return __guildWarObjDic;
};

//获取所有对象
exports.getAllObj = function(){
    var list = [];
    for(var key in __guildWarObjDic){
        var locObj = __guildWarObjDic[key];
        list.push(locObj);
    }
    return list;
};

//获取obj
exports.getObj = function(serverId){
    var obj = __guildWarObjDic[serverId];
    if(obj) return obj;
    obj = new GuildWarObj();
    __guildWarObjDic[serverId] = obj;
    return obj;
};

//获取obj
exports.getMyObj = function(){
    return  exports.getObj(project.serverId);
};

//删除obj
exports.delObj = function(serverId){
    if(__guildWarObjDic[serverId]){
        delete __guildWarObjDic[serverId];
    }
};

//删除其他obj
exports.delOtherObj = function(){
    for(var key in __guildWarObjDic){
        if(key == project.serverId) continue;
        delete __guildWarObjDic[key];
    }
};


//获取主要数据
exports.getMainWarData = function(){
    return __mainWarData;
};

//判断是否开启
exports.isOpen = function(){
    return __mainWarData.isOpen;
};

//判断是否开启
exports.open = function(){
    __mainWarData.isOpen = 1;
};

//结束
exports.over = function(){
    __mainWarData.isOpen = 0;
    __mainWarData.msgTimeArr = [];
};

//是否启动中
exports.isStarting = function(){
    return __serverData.isStarting;
};

//设置启动值
exports.setIsStarting = function(isStarting){
    __serverData.isStarting = isStarting;
};

