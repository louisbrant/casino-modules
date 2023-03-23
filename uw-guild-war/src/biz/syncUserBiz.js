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

exports.pushMyUserDynamicData = function(cb){
    if(!g_guildWar.isSync()) return cb(null);
    //每次都更新所有的
    var pushKey = _getSaveUserDynamicKey();
    var obj = g_guildWar.getMyObj();
    var guildUserDic = obj.getGuildWarUserDic();
    var list = [];
    for(var key in guildUserDic){
        var locUserWar = guildUserDic[key];
        list.push(_getSaveDynamicUser(locUserWar));
    }
    redisHelper.getClient(_getClientCfg()).hset(pushKey,[project.serverId,JSON.stringify(list)] ,function(err,getLength){
        if(err) return cb(err);
        cb(null);
    });
};

//清除行会动态数据
exports.clearMyUserDynamicData = function(cb){
    checkRequire();
    guildGroupBiz.initRedisId(function(){
        var pushKey = _getSaveUserDynamicKey();
        redisHelper.getClient(_getClientCfg()).hdel(pushKey,project.serverId,function(err,getLength){
            if(err) return cb(err);
            cb(null);
        });
    });
};

exports.pushMyUserStaticData = function(cb){
    if(!g_guildWar.isSync()) return cb(null);
    //如果没有，则push
    var pushKey = _getSaveUserStaticKey();
    var myGuildObj = g_guildWar.getMyObj();

    redisHelper.getClient(_getClientCfg()).hkeys(pushKey+project.serverId,function(err,saveKeys){
        if(err) return cb(err);
        var notSaveObj = {};
        var hasNotSave = 0;
        var guildUserDic = myGuildObj.getGuildWarUserDic();
        for(var key in guildUserDic){
            var locUserWar = guildUserDic[key];
            if(saveKeys.indexOf(locUserWar.userId.toString())<=-1){
                notSaveObj[locUserWar.userId] = JSON.stringify(_getSaveStaticUser(locUserWar));
                hasNotSave = 1;
            }
        }
        if(!hasNotSave) return cb();

        redisHelper.getClient(_getClientCfg()).hmset(pushKey+project.serverId,notSaveObj ,function(err,saveKeys){
            if(err) return cb(err);
            cb(null);
        });
    });
};

//清除行会静态数据
exports.clearMyUserStaticData = function(cb){
    checkRequire();
    guildGroupBiz.initRedisId(function(){
        var pushKey = _getSaveUserStaticKey();
        redisHelper.getClient(_getClientCfg()).del(pushKey+project.serverId,function(err,getLength){
            if(err) return cb(err);
            cb(null);
        });
    });
};

exports.syncOtherUserDynamicData = function(cb){
    if(!g_guildWar.isSync()) return cb(null);
    //其他动态数据
    //其他静态数据
    var g_serverData = g_guildWar.getServerData();
    var groupArr = _arrToGroupArr(g_serverData.otherServerArr,10);

    async.mapLimit(groupArr,1,function(locServerArr,cb1){
        _syncOtherUserDynamicData(locServerArr,function(err,data){
            cb1();
        });
    },function(err,data){
        cb();
    });
};

exports.syncOtherUserStaticData = function(cb){
    if(!g_guildWar.isSync()) return cb(null);
    //其他静态数据
    var g_serverData = g_guildWar.getServerData();
    var groupArr = _arrToGroupArr(g_serverData.otherServerArr,10);
    async.mapLimit(groupArr,1,function(locServerArr,cb1){
        async.map(locServerArr,function(locServerId,cb2){
            _syncOtherUserStaticData(locServerId,function(err,data){
                cb2();
            });
        },function(){
            cb1();
        });
    },function(err,data){
        cb();
    });
};


var _syncOtherUserStaticData = function(serverId,cb){
    var pushKey = _getSaveUserStaticKey();
    var locGuildWarObj = g_guildWar.getObj(serverId);
    redisHelper.getClient(_getClientCfg()).hkeys(pushKey+serverId,function(err,saveKeys){
        if(err) return cb(err);
        if(saveKeys.length<=0) return cb();

        var getKeys = [];
        for(var i = 0;i<saveKeys.length;i++){
            var locKey = saveKeys[i];
            if(!locGuildWarObj.hasGuildWarUser(locKey)){
                getKeys.push(locKey);
            }
        }
        if(getKeys.length<=0) return cb();

        redisHelper.getClient(_getClientCfg()).hmget(pushKey+serverId,getKeys,function(err,locSaveUserList){
            if(err) return cb(err);
                for(var j = 0;j<locSaveUserList.length;j++){
                    var locSaveUser = locSaveUserList[j];
                    if(!locSaveUser) continue;
                    locSaveUser = JSON.parse(locSaveUser);
                    var locObj = _unSaveStaticUser(locSaveUser);

                    var locUserWarData = locGuildWarObj.getGuildWarUser(locObj.userId);

                    if(!locUserWarData){
                        locUserWarData = locGuildWarObj.newGuildWarUser(locObj.userId);
                        locUserWarData.userName = locObj.userName;
                        locUserWarData.guildId = locObj.guildId;
                        locUserWarData.guildName = locObj.guildName;
                        locUserWarData.points = 0;//个人积分
                        locUserWarData.vip = locObj.vip;
                        locUserWarData.iconId = locObj.iconId;
                        locUserWarData.groupId = locObj.groupId;
                        locUserWarData.nextFightTime = new Date();
                        locUserWarData.inspireEndTime  = new Date();
                        locUserWarData.guildPosition = locObj.guildPosition;
                        locUserWarData.serverId = locObj.serverId;
                        locUserWarData.combat = locObj.combat;
                        locGuildWarObj.pushWarUserGroup(locObj.groupId,locUserWarData);
                    }
                    _copyValueToObj(locUserWarData,locObj);
                }
            cb(null);
        });
    });
};



var _syncOtherUserDynamicData = function(serverArr,cb){
    //过滤不需要同步的服务器
    if(serverArr.length<=0) return cb();
    var pushKey = _getSaveUserDynamicKey();
    redisHelper.getClient(_getClientCfg()).hmget(pushKey,serverArr,function(err,saveServerDataList){
        if(err) return cb(err);

        for(var i = 0 ;i<saveServerDataList.length;i++){
            var locSaveUserList = saveServerDataList[i];
            if(!locSaveUserList) continue;
            locSaveUserList = JSON.parse(locSaveUserList);
            for(var j = 0;j<locSaveUserList.length;j++){
                var locSaveUser = locSaveUserList[j];
                if(!locSaveUser) continue;
                var locObj = _untSaveDynamicUser(locSaveUser);

                var locGuildWarObj = g_guildWar.getObj(locObj.serverId);
                var locUserWarData = locGuildWarObj.getGuildWarUser(locObj.userId);
                if(locUserWarData){
                    _copyValueToObj(locUserWarData,locObj);
                }
            }
        }
        cb(null);
    });
};




var _getSaveUserStaticKey = function(){
    return "guildWar-user-static";
};

var _getSaveUserDynamicKey = function(){
    return "guildWar-user-dynamic";
};


var _getClientCfg = function(){
    checkRequire();
    return guildWarUtils.getClientCfg();
};

var _getSaveStaticUser = function(userWarData){
    var ret = [];
    ret.push(userWarData.userId );//用户id(静)
    ret.push(userWarData.userName);//用户名(静)
    ret.push(userWarData.guildId );//行会id(静)
    ret.push(userWarData.guildName );//行会名(静)
    ret.push(userWarData.vip);//vip(静)
    ret.push(userWarData.iconId);//用户头像(静)
    ret.push(userWarData.groupId);//(静)
    ret.push(userWarData.guildPosition );//行会职务(静)
    ret.push(userWarData.serverId );//服务器id(静)
    ret.push(userWarData.combat );//战力
    return ret;
};

var _unSaveStaticUser = function(saveUserWarData){
    var obj = {};
    if(!saveUserWarData) return obj;
    obj.userId = saveUserWarData[0];
    obj.userName = saveUserWarData[1];
    obj.guildId = saveUserWarData[2];
    obj.guildName = saveUserWarData[3];
    obj.vip = saveUserWarData[4];
    obj.iconId = saveUserWarData[5];
    obj.groupId = saveUserWarData[6];
    obj.guildPosition = saveUserWarData[7];
    obj.serverId = saveUserWarData[8];
    obj.combat = saveUserWarData[9];
    return obj;
};

var _getSaveDynamicUser = function(userWarData){
    var ret = [];
    ret.push(userWarData.userId);//用户id(静)
    ret.push(userWarData.points);//个人积分(同步)
    ret.push(userWarData.lastLootTime );//最后掠夺时间(同步)
    ret.push(userWarData.serverId );//服务器id(静)
    return ret;
};

var _untSaveDynamicUser = function(saveUserWarData){
    var obj = {};
    obj.userId = saveUserWarData[0];
    obj.points = saveUserWarData[1];
    obj.lastLootTime = saveUserWarData[2];
    obj.serverId = saveUserWarData[3];
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
