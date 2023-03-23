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

exports.pushMyGuildDynamicData = function(cb){
    if(!g_guildWar.isSync()) return cb(null);
    //每次都更新所有的
    var pushKey = _getSaveGuildWarDynamicKey();
    var obj = g_guildWar.getMyObj();
    var guildWarData = obj.getGuildWarDic();
    var list = [];
    for(var key in guildWarData){
        var locGuildWar = guildWarData[key];
        list.push(_getSaveDynamicGuild(locGuildWar));
    }
    redisHelper.getClient(_getClientCfg()).hset(pushKey,project.serverId,JSON.stringify(list) ,function(err,getLength){
        if(err) return cb(err);
        cb(null);
    });
};

//清除行会动态数据
exports.clearMyGuildDynamicData = function(cb){
    checkRequire();
    guildGroupBiz.initRedisId(function(){
        var pushKey = _getSaveGuildWarDynamicKey();
        redisHelper.getClient(_getClientCfg()).hdel(pushKey,project.serverId,function(err,getLength){
            if(err) return cb(err);
            cb(null);
        });
    });
};

exports.pushMyGuildStaticData = function(cb){
    if(!g_guildWar.isSync()) return cb(null);
    //如果没有，则push
    var pushKey = _getSaveGuildWarStaticKey();
    redisHelper.getClient(_getClientCfg()).hexists(pushKey,project.serverId,function(err,hasValue){
        if(err) return cb(err);
        if(hasValue) return cb(null);
        var obj = g_guildWar.getMyObj();
        var guildWarData = obj.getGuildWarDic();

        var list = [];
        for(var key in guildWarData){
            var locGuildWar = guildWarData[key];
            list.push(_getSaveStaticGuild(locGuildWar));
        }

        redisHelper.getClient(_getClientCfg()).hset(pushKey,[project.serverId,JSON.stringify(list)],function(err,getLength){
            if(err) return cb(err);

            cb(null);
        });
    });
};

//清除行会静态数据
exports.clearMyGuildStaticData = function(cb){
    checkRequire();
    guildGroupBiz.initRedisId(function(){
        var pushKey = _getSaveGuildWarStaticKey();
        redisHelper.getClient(_getClientCfg()).hdel(pushKey,project.serverId,function(err,getLength){
            if(err) return cb(err);
            cb(null);
        });
    });
};

//获取行会静态数据
exports.getMyGuildStaticData = function(cb){
    var pushKey = _getSaveGuildWarStaticKey();
    redisHelper.getClient(_getClientCfg()).hget(pushKey,project.serverId,function(err,data){
        if(err) return cb(err);
        cb(null,data);
    });
};

exports.syncOtherGuildDynamicData = function(cb){
    if(!g_guildWar.isSync()) return cb(null);
    //其他动态数据
    //其他静态数据
    var g_serverData = g_guildWar.getServerData();
    var groupArr = _arrToGroupArr(g_serverData.otherServerArr,10);

    async.mapLimit(groupArr,1,function(locServerArr,cb1){
        _syncOtherGuildDynamicData(locServerArr,function(err,data){
            cb1();
        });
    },function(err,data){
        cb();
    });
};

exports.syncOtherGuildStaticData = function(cb){
    if(!g_guildWar.isSync()) return cb(null);
    //其他静态数据
    var g_serverData = g_guildWar.getServerData();
    var groupArr = _arrToGroupArr(g_serverData.otherServerArr,10);
    async.mapLimit(groupArr,1,function(locServerArr,cb1){
        _syncOtherGuildStaticData(locServerArr,function(err,data){
             cb1();
        });
    },function(err,data){
        cb();
    });
};


var _syncOtherGuildStaticData = function(serverArr,cb){
    if(serverArr.length<=0) return cb();
    var curServerArr = [];
    for(var i = 0;i<serverArr.length;i++){
        var locServerId = serverArr[i];
        if(!g_guildWar.isStaticSync(locServerId)){
            curServerArr.push(locServerId);
        }
    }
    if(curServerArr.length<=0) return cb();
    var pushKey = _getSaveGuildWarStaticKey();
    redisHelper.getClient(_getClientCfg()).hmget(pushKey,curServerArr,function(err,saveServerDataList){
        if(err) return cb(err);
        for(var i = 0 ;i<saveServerDataList.length;i++){
            var locSaveGuildList = saveServerDataList[i];
            if(!locSaveGuildList) continue;
            locSaveGuildList = JSON.parse(locSaveGuildList);
            for(var j = 0;j<locSaveGuildList.length;j++){
                var locSaveGuild = locSaveGuildList[j];
                if(!locSaveGuild) continue;
                var locObj = _unSaveStaticGuild(locSaveGuild);
                var locGuildWarObj = g_guildWar.getObj(locObj.serverId);
                var locGuildWarData = locGuildWarObj.getGuildWarData(locObj.guildId);
                if(!locGuildWarData){
                    locGuildWarData = locGuildWarObj.createGuildWarData(locObj);
                    locGuildWarObj.pushGuildWarData(locObj.groupId,locGuildWarData);
                }
                _copyValueToObj(locGuildWarData,locObj);
                g_guildWar.setStaticSync(locObj.serverId);
            }
            //_unSaveStaticGuild
        }
        cb(null);
    });
};

var _syncOtherGuildDynamicData = function(serverArr,cb){
    //过滤不需要同步的服务器
    if(serverArr.length<=0) return cb();
    var pushKey = _getSaveGuildWarDynamicKey();
    redisHelper.getClient(_getClientCfg()).hmget(pushKey,serverArr,function(err,saveServerDataList){
        if(err) return cb(err);

        for(var i = 0 ;i<saveServerDataList.length;i++){
            var locSaveGuildList = saveServerDataList[i];
            if(!locSaveGuildList) continue;
            locSaveGuildList = JSON.parse(locSaveGuildList);
            for(var j = 0;j<locSaveGuildList.length;j++){
                var locSaveGuild = locSaveGuildList[j];
                if(!locSaveGuild) continue;
                var locObj = _untSaveDynamicGuild(locSaveGuild);

                var locGuildWarObj = g_guildWar.getObj(locObj.serverId);
                var locGuildWarData = locGuildWarObj.getGuildWarData(locObj.guildId);
                if(locGuildWarData){
                    _copyValueToObj(locGuildWarData,locObj);
                }
            }
        }
        cb(null);
    });
};



var _getSaveGuildWarStaticKey = function(){
    return "guildWar-guild-static";
};

var _getSaveGuildWarDynamicKey = function(){
    return "guildWar-guild-dynamic";
};

var _getSaveGuildUserStaticKey = function(){
    return "guildWar-user-static";
};

var _getSaveGuildUserDynamicKey = function(){
    return "guildWar-user-dynamic";
};


var _getClientCfg = function(){
    checkRequire();
    return guildWarUtils.getClientCfg();
};

var _getSaveStaticGuild = function(guildWarData){
    var ret = [];
    ret.push(guildWarData.serverName);//服务器名(静)
    ret.push(guildWarData.serverId );//服务器id
    ret.push(guildWarData.serverHost );//服务器host(静)
    ret.push(guildWarData.serverPort);//服务器port(静)
    ret.push(guildWarData.guildId);//行会id(静)
    ret.push(guildWarData.guildName);//行会名(静)
    ret.push(guildWarData.guildLvl);//行会等级(静)
    ret.push(guildWarData.groupId);//分组id(静)
    ret.push(JSON.stringify(guildWarData.chairmanData));//会长数据 [会长id,会长名称，会长vip,会长头像](静)
    return ret;
};

var _unSaveStaticGuild = function(saveGuildWarData){
    var obj = {};
    if(!saveGuildWarData) return obj;
    obj.serverName = saveGuildWarData[0];
    obj.serverId = saveGuildWarData[1];
    obj.serverHost = saveGuildWarData[2];
    obj.serverPort = saveGuildWarData[3];
    obj.guildId = saveGuildWarData[4];
    obj.guildName = saveGuildWarData[5];
    obj.guildLvl = saveGuildWarData[6];
    obj.groupId = saveGuildWarData[7];
    obj.chairmanData = JSON.parse( saveGuildWarData[8]);
    return obj;
};

var _getSaveDynamicGuild = function(guildWarData){
    var ret = [];
    ret.push(guildWarData.serverId);//服务器id
    ret.push(guildWarData.guildId);//行会id
    ret.push(guildWarData.doorLives );//守卫存活数(同步)
    ret.push(guildWarData.points );//积分(同步)
    ret.push(guildWarData.lastLootTime);//(同步)
    //东南西北4个门
    var saveDoorData = {};
    saveDoorData[0] = _getSaveDynamicDoor(guildWarData.doorData[0]||{});
    saveDoorData[1] = _getSaveDynamicDoor(guildWarData.doorData[1]||{});
    saveDoorData[2] = _getSaveDynamicDoor(guildWarData.doorData[2]||{});
    saveDoorData[3] = _getSaveDynamicDoor(guildWarData.doorData[3]||{});

    ret.push(JSON.stringify(saveDoorData));//守卫门口信息
    return ret;
};

var _untSaveDynamicGuild = function(saveGuildWarData){
    var obj = {};
    obj.serverId = saveGuildWarData[0];
    obj.guildId = saveGuildWarData[1];
    obj.doorLives = saveGuildWarData[2];
    obj.points = saveGuildWarData[3];
    obj.lastLootTime = saveGuildWarData[4];
    var saveDoorData = saveGuildWarData[5];
    saveDoorData = JSON.parse(saveDoorData);
    obj.doorData = {};
    obj.doorData[0] = _unSaveDynamicDoor(saveDoorData[0]);
    obj.doorData[1] = _unSaveDynamicDoor(saveDoorData[1]);
    obj.doorData[2] = _unSaveDynamicDoor(saveDoorData[2]);
    obj.doorData[3] = _unSaveDynamicDoor(saveDoorData[3]);
    return obj;
};

var _getSaveDynamicDoor = function(doorData){
    var ret = [];
    ret.push(doorData.door );//门口，东南西北 0,1,2,3
    ret.push(doorData.hp );//生命值 (同步)B
    ret.push(doorData.userId );///守门人id
    ret.push(doorData.userName );///守门人名字
    ret.push(doorData.userIcon );///守门人头像
    ret.push(doorData.lastUserId );///最后的守门人id
    ret.push(doorData.lastUserName  );///最后的守门人名字
    ret.push(doorData.lastUserIcon  );///最后的守门人头像
    ret.push(doorData.isBreak  );///是否击破 (同步)
    ret.push(doorData.lastDownTime );///最后下阵时间(同步)
    return ret;
};

var _unSaveDynamicDoor = function(saveDoorData){
    var obj = {};
    obj.door = saveDoorData[0];
    obj.hp = saveDoorData[1];
    obj.userId = saveDoorData[2];
    obj.userName = saveDoorData[3];
    obj.userIcon = saveDoorData[4];
    obj.lastUserId = saveDoorData[5];
    obj.lastUserName = saveDoorData[6];
    obj.lastUserIcon = saveDoorData[7];
    obj.isBreak = saveDoorData[8];
    obj.lastDownTime = saveDoorData[9];
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