/**
 * Created by Administrator on 2014/6/10.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var c_prop = uwData.c_prop;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var serverInfoDao = require("./../dao/serverInfoDao");
var mainClient = require("uw-db").mainClient;
var loginClient = require("uw-db").loginClient;
var dbHelper =  require("uw-db").dbHelper;
var propUtils = require('uw-utils').propUtils;

var ds = require("uw-ds").ds;
var exports = module.exports;
var dbCfgDic = {};

var accountDao = null;
var checkRequire = function(){
    accountDao = accountDao || require("uw-account").accountDao;
};

//获取列表
exports.getList = function(client,isTest,cb){
    if(isTest){
        serverInfoDao.list(loginClient," 1=1 order by sort asc",[],cb);
    }else{
        serverInfoDao.list(loginClient," status <> ? order by sort asc",[consts.serverStatus.notOpen],cb);
    }
};

/**
 * 获取拥有角色的服务器
 * @param client
 * @param accountId
 * @param cb
 */
exports.getUserServers = function(client,accountId,cb){
    checkRequire();
    accountDao.select(loginClient,{id:accountId},function(err,accountData){
        if(err) return cb(err);
        //没创建账号，返回
        if(!accountData) return cb(null,[]);
        var ids = accountData.userServers||[];
        //没有数据，返回
        if(ids.length<=0) return cb(null, []);

        serverInfoDao.list(loginClient," id in (?) ",[ids],function(err,serverList){
            if(err) return cb(err);
            cb(null,serverList);
        });
    });
};

//清空服务器数据库配置
exports.clearServerDbCfg = function(){
    dbCfgDic = {};
};

//获取服务器数据库配置
exports.getServerDbCfg = function(serverId,cb){
    if(dbCfgDic[serverId])
        return cb(null,dbCfgDic[serverId]);
    serverInfoDao.select(loginClient,{serverId:serverId},function(err,serverData){
        if(err) return cb(err);
        if(!serverData) return cb(null,null);
        //server=192.168.1.126;database=chuanqi;uid=root;pwd=123456;charset=utf8
        var cfg ={
            "name": "uwCnn"+serverId,
            "dbModule": "mysql",
            "host": _getDbKeyValue(serverData.dbLink,"server"),
            "port": _getDbKeyValue(serverData.dbLink,"port"),
            "user": _getDbKeyValue(serverData.dbLink,"uid"),
            "password": _getDbKeyValue(serverData.dbLink,"pwd"),
            "database": _getDbKeyValue(serverData.dbLink,"database"),
            "debug": [ "ComQueryPacket" ]
        };
        dbCfgDic[serverId] = cfg;
        return cb(null,cfg);
    });
};

//获取服务器数据库配置
exports.getServerClient = function(serverId,cb){
    exports.getServerDbCfg(serverId,function(err,serverCfg) {
        if (err) return cb(err);
        if (!serverCfg) return cb(null, null);
        var sClient = dbHelper.getClient(serverCfg);
        cb(null,sClient) ;
    });
};


//根据appId获取列表
exports.getListByAppId = function(client,isTest,appId,cb){
    if(isTest){
        serverInfoDao.list(client," appId =? order by sort asc",[appId],cb);
    }else{
        serverInfoDao.list(client," status <> ? and appId =? order by sort asc",[consts.serverStatus.notOpen, appId],cb);
    }
};

/**
 * 得到账户相关服务器信息
 * @param client
 * @param openId
 * @param appId 渠道名
 * @param isTest
 * @param cb
 */
exports.getAccountServers = function(client, openId, appId, isTest, cb){
    checkRequire();
    async.parallel([
        function(cb1){
            exports.getListByAppId(loginClient, isTest,appId ,cb1);
        },
        function(cb1){
            accountDao.select(loginClient, {name:openId}, cb1)
        }
    ],function(err, data){
        if(err) return cb(err);
        var serverList = data[0];
        var accountData = data[1];
        var myServerArr = [];
        var serverArr = [];
        var lastServer;
        for (var i = 0; i < serverList.length; i++) {
            var server = serverList[i];
            propUtils.delProp(server, ["dbLink"]);
            if(server.appId == appId) {
                serverArr.push(server);
                if(accountData){
                    if(accountData.userServers && accountData.userServers.indexOf(server.serverId+"") >= 0) //筛选创角服务器
                        myServerArr.push(server);
                    if(accountData.exData ){
                        var lastLoginServerId = accountData.exData[c_prop.accountExDataKey.lastLoginServer];
                        if(lastLoginServerId && server.serverId == lastLoginServerId){
                            lastServer = server;
                        }
                    }
                }
            }
        }
        cb(null, [myServerArr, serverArr, lastServer]);
    });
};
/*************************************************************private**************************************************************************/

var _getDbKeyValue = function(dbLink,key){
    var dbDataArr = dbLink.split(";");
    var value = "";
    for(var i = 0;i<dbDataArr.length;i++){
        var locDbData = dbDataArr[i];
        locDbData = locDbData.split("=");
        var locKey = locDbData[0];
        var locValue =  locDbData[1];
        if(locKey == key){
            value = locValue;
            value = locValue;
            break;
        }
    }
    return value;
};