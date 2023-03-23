/**
 * Created by Administrator on 2016/4/8.
 */

var uwData = require("uw-data");
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var c_lottery = uwData.c_lottery;
var c_vip = uwData.c_vip;
var c_lvl = uwData.c_lvl;
var c_guildLvl = uwData.c_guildLvl;
var c_guildFuncCfg = uwData.c_guildFuncCfg;
var t_itemLogic = uwData.t_itemLogic;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var t_item = uwData.t_item;
var c_open = uwData.c_open;
var guildPersonalDao = require("uw-guild").guildPersonalDao;
var guildDao = require("uw-guild").guildDao;
var guildGroupDao = require("../dao/guildGroupDao.js");
var guildWarSignDao = require("../dao/guildWarSignDao.js");
var guildWarUtils = require("./guildWarUtils");
var mainClient = require("uw-db").mainClient;
var loginClient = require("uw-db").loginClient;
var project = require("uw-config").project;
var g_guildWar = require("uw-global").g_guildWar;
var userDao = require("uw-user").userDao;
var iface = require("uw-data").iface;
var g_gameConfig = require("uw-global").g_gameConfig;
var async = require("async");
var logger = require('uw-log').getLogger("uw-logger", __filename);
var serverUtils = require("uw-utils").serverUtils;

var exports = module.exports;


var guildWarBiz = null;
var guildWarRecordBiz = null;
var serverInfoDao = null;

var checkRequire = function(){
    guildWarBiz = guildWarBiz || require("./guildWarBiz");
    guildWarRecordBiz = guildWarRecordBiz || require("./guildWarRecordBiz");
    serverInfoDao = serverInfoDao || require("uw-server-info").serverInfoDao;
};


//初始化本服报名的行会
exports.init = function(client,cb){
    checkRequire();
    guildWarSignDao.list(mainClient," serverId = ? ",[project.serverId],function(err,signList){
        if(err) return cb(err);
        async.mapLimit(signList,10,function(signData,cb1){
            exports.initSignData(client,signData,cb1);
        },function(err,data){
            if(err) return cb(err);
            guildWarBiz.initDoorData(client, function(err,data){
                if(err) return cb(err);
                exports.addServerToSync(function(err,data){
                    if(err) return cb(err);
                    _initRecord(client,function(){
                        if(err) return cb(err);
                        cb(null);
                    });
                });
            });
        });
    });
};

var _initRecord = function(client,cb){
    guildWarRecordBiz.getTodayRecord(client,function(err,guildWarRecordData){
        if(err) return cb(err);
        var recordObj = null;
        if(guildWarRecordData){
            recordObj = guildWarRecordData.recordData[project.serverId];
        }
        if(recordObj&&Object.keys(recordObj).length>0){
            guildWarUtils.syncGuildWarObj(project.serverId,recordObj);
        }
        cb(null);
    });
};

exports.addServerToSync = function(cb){
    checkRequire();
    async.parallel([
        function(cb1){
            guildGroupDao.list(mainClient,{},cb1);
        },
        function(cb1){
            serverInfoDao.select(loginClient,{serverId:project.serverId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var guildGroupList = data[0];
        var serverData = data[1];


        var curGroupId = 0;
        var curRedisId = 0;
        var serverArr = [];
        for(var i = 0;i<guildGroupList.length;i++){
            var locGroup = guildGroupList[i];
            if(locGroup.serverArr.indexOf(parseInt(project.serverId) )>-1){
                serverArr = locGroup.serverArr;
                curGroupId = locGroup.id;
                curRedisId = locGroup.redisId;
                break;
            }
        }

        var g_serverData = g_guildWar.getServerData();
        g_serverData.serverGroupId = curGroupId;
        g_serverData.serverHost = serverData.host;
        g_serverData.serverPort = serverData.port;
        g_serverData.redisId = curRedisId;

        //剔除自己
        for (var i = 0, l = serverArr.length; i < l; i++) {
            if (serverArr[i] == project.serverId) {
                serverArr.splice(i, 1);
                break;
            }
        }
        g_serverData.otherServerArr = serverArr;
        cb(null);
    });
};


exports.initSignData = function(client,signData,cb){
    async.parallel([
        function(cb1){
            serverInfoDao.select(loginClient,{serverId:signData.serverId},cb1);
        },
        function(cb1){
            guildDao.select(client,{id:signData.guildId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var serverData = data[0];
        var guildData = data[1];
        if(!serverData||!guildData) return cb(null);
        userDao.selectCols(client,"id,nickName,iconId,vip"," id = ?",[guildData.chairmanId],function(err,chairUserData){
            if(err) return cb(err);
            var opt = {
                serverName : _getServerName(serverData),//服务器名
                serverId : serverData.serverId,//服务器id
                serverHost : serverData.host,//服务器host
                serverPort : serverData.port,//服务器port
                guildId : guildData.id,//行会id
                guildName : guildData.name,//行会名
                guildLvl : guildData.lvl,//行会等级
                groupId : signData.groupId,//组别id
                chairmanData : [chairUserData.id, chairUserData.nickName, chairUserData.vip, chairUserData.iconId] //会长数据 [会长id,会长名称，会长vip,会长头像]
            };
            var severData = g_guildWar.getMyObj().createGuildWarData(opt);
            g_guildWar.getMyObj().pushGuildWarData(signData.groupId,severData);
            cb(null);
        });
    });
};

exports.getGroupServerIds = function(client,cb){
    guildGroupDao.list(client,{},function(err,guildGroupList){
        if(err) return cb(err);
        var serverArr = [];
        for(var i = 0;i<guildGroupList.length;i++){
            var locCoffers = guildGroupList[i];
            if(locCoffers.serverArr.indexOf(parseInt(project.serverId) )>-1){
                serverArr = locCoffers.serverArr;
                break;
            }
        }
        cb(null,serverArr);
    })
};

exports.getCurGroupId = function(client,cb){
    guildGroupDao.list(client,{},function(err,guildGroupList){
        if(err) return cb(err);
        var curGroupId = 0;
        for(var i = 0;i<guildGroupList.length;i++){
            var locGroup = guildGroupList[i];
            if(locGroup.serverArr.indexOf(parseInt(project.serverId) )>-1){
                curGroupId = locGroup.id;
                break;
            }
        }
        cb(null,curGroupId);
    })
};

exports.initRedisId = function(cb){
    var g_serverData = g_guildWar.getServerData();
    if(g_serverData.redisId<0) return cb();
    guildGroupDao.list(mainClient,{},function(err,guildGroupList){
        if(err) return cb(err);
        for(var i = 0;i<guildGroupList.length;i++){
            var locGroup = guildGroupList[i];
            if(locGroup.serverArr.indexOf(parseInt(project.serverId) )>-1){
                g_serverData.redisId = locGroup.redisId;
                break;
            }
        }
        cb();
    });
};

var _getServerName = function(serverData){
    return serverData.mergerName?serverData.mergerName:(serverData.name+"-"+serverData.area);
};

/**
 * 请求添加服务器
 * @param curServerData
 * @param host
 * @param port
 * @param cb
 * @private
 */
var _requestAddSyncServer = function(curServerData,host,port,cb){
    var args = {};
    var argsKeys = iface.admin_guildWarSync_addSyncServer_args;
    args[argsKeys.curServerData] = curServerData;
    serverUtils.requestServer(iface.admin_guildWarSync_addSyncServer,args,host,port,cb);
};
