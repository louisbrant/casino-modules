/**
 * Created by Administrator on 2014/5/9.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var c_prop = uwData.c_prop;
var project = require('uw-config').project;
var AccountEntity = require('uw-entity').AccountEntity;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var commonUtils = require("uw-utils").commonUtils;
var userUtils = require("uw-user").userUtils;
var accountDao = require("./../dao/accountDao");
var userDao = require("uw-user").userDao;
var UserEntity = require('uw-entity').UserEntity;
var sdkBiz = require('uw-sdk').sdkBiz;
var rechargeBiz = require('uw-recharge').rechargeBiz;
var arenaRecordBiz = require('uw-arena-record').arenaRecordBiz;
var arenaDao = require('uw-arena').arenaDao;
var copyProgressDao = require('uw-copy').copyProgressDao;
var copyBiz = require('uw-copy').copyBiz;
var heroDao = require('uw-hero').heroDao;
var heroPropHelper = require('uw-hero').heroPropHelper;
var pkOutDao = require('uw-pkOut').pkOutDao;
var rankBiz = require('uw-rank').rankBiz;
var shopBiz = require("uw-shop").shopBiz;
var mailBiz = require("uw-mail").mailBiz;
var gameRecordBiz = require("uw-game-record").gameRecordBiz;
var gameRecordSerial = require("uw-serial").gameRecordSerial;
var loginClient = require("uw-db").loginClient;
var mainClient = require("uw-db").mainClient;
var exports = module.exports;

var AUTO_NAME_KEY = "w";

/**
 * 根据常规登录
 * @param client
 * @param name
 * @param pwd
 * @param channelId
 * @param cb
 * @returns accountData
 */
exports.login = function(client,name,pwd,channelId,cb){
    accountDao.select(loginClient,{name:name,channelId:channelId},function(err,accountData){
        if(err) return cb(err);
        if(!accountData) return cb(getMsg(c_msgCode.loginNoUser));
        if(accountData.pwd != pwd)  return cb(getMsg(c_msgCode.loginWordWrong));
        _newLoginKey(client,accountData,null,function(err,data){
            if(err) return cb(err);
            cb(null,data);
        });
    });
};

/**
 * 根据sdk登陆
 * @param client
 * @param channelId
 * @param deviceId
 * @param clientSdkData
 * @param cb
 * @returns serverData
 */
exports.loginBySdk = function(client, channelId, deviceId, clientSdkData,cb){
    sdkBiz.login(channelId, clientSdkData,function(err,sdkData){
        if(err) return cb(err);
        var id = sdkData.id;
        _getAccountData(loginClient, id,channelId, deviceId, sdkData,function(err,accountData){
            if(err) return cb(err);
            _newLoginKey(client,accountData,sdkData,function(err,data){
                if(err) return cb(err);
                cb(null,data);
            });
        });
    });
};

/**
 * 注册
 * @param client
 * @param name
 * @param pwd
 * @param channelId
 * @param deviceId
 * @param cb
 * @returns [accountData,userData]
 */
exports.register = function(client,name,pwd,channelId,deviceId,cb){
    accountDao.select(loginClient,{name:name},function(err,accountData){
        if(err) return cb(err);
        if(accountData) return cb(getMsg(c_msgCode.regHasUser));
        //如果不存在则创建一个账号
        _createNewAccount(loginClient,name,pwd,deviceId,channelId,null,function(err,accountData){
            if(err) return cb(err);
            _newLoginKey(client,accountData,null,function(err,data){
                if(err) return cb(err);
                cb(null,data);
            });
        });
    });
};

/**
 * 上报数据
 * @param client
 * @param accountId
 * @param combat
 * @param cb
 */
exports.setAchievement = function(client,accountId,combat,cb){
    accountDao.selectCols(loginClient,"channelId,name",{id:accountId},function(err,accountData){
        if(err) return cb(err);
        sdkBiz.setAchievement(accountData.channelId,[accountData.name,combat],function(err,data){
            if(err) return cb(err);
            cb(null);
        });
    });
};

//增加服务器
exports.addUserServer = function(client,accountId,serverId,userId,mailClient,cb){
    accountDao.selectCols(loginClient,"userServers,name,rechargeCom",{id:accountId},function(err,accountData){
        if(err) return cb(err);
        if(accountData.userServers.indexOf(serverId)<0){
            accountData.userServers.push(serverId);
        }
        var rechargeCom = accountData.rechargeCom||[];
        var isRechargeCom = rechargeCom[0]||0;
        var rechargeComObj = {"606305789":20,"688895869":20,"1867069209":20,"2571439965":20,"56345c82bd99278668":20,"55dec4e6cd33262323":240,"5620aa299982d17771":1300,"562a0ac7507cd89466":120,"561f95053e62c74962":20,"55ef9308e22d427721":20,"55ee74b9c238826021":20,"5636fdd46336a21647":620,"563722959125614600":20,"5638db2700ecd26730":20,"56398c1022c9e25791":20,"563a021aafa0023885":20,"563a02b9e1a8a33415":120,"563b022d3a5a525044":20,"563c4d974b37389209":20,"563c790d065c475672":20,"55f59e5ce121020244":300};        //todo   {账号名：充值金额}
        if(rechargeComObj[accountData.name] && isRechargeCom != 1){
            var newMail = {},diamond = rechargeComObj[accountData.name];
            newMail[c_prop.spItemIdKey.diamond] = diamond*2;
            accountData.rechargeCom[0] = 1;
            mailBiz.addByType(mailClient, userId, c_prop.mailTypeKey.rechargeCom,[diamond], newMail, function(err,data){
                if(err) console.log(err);
                gameRecordSerial.add(userId,function(cb1){
                    gameRecordBiz.setDiamondRecord(mailClient,userId,c_prop.diamondGetType.rechargeCom,diamond*2,cb1);
                });
            });
        }
        accountDao.update(loginClient,{userServers:accountData.userServers,rechargeCom:accountData.rechargeCom},{id:accountId},cb);
    });
};

/*******************************************************************private**************************************************************/

//获取账号和用户数据，不能存在则创建
var _getAccountData = function(client, accountName,channelId, deviceId, sdkData,cb){
    accountDao.select(loginClient,{name:accountName,channelId:channelId},function(err,accountData){
        if(err) return cb(err);
        if(accountData) return cb(null,accountData);
        //如果不存在则创建一个账号
        _createNewAccount(client,accountName,null,deviceId,channelId,sdkData,cb);
    });
};

//创建登录key
var _newLoginKey = function(client,accountData,sdkData,cb){
    var loginKey = commonUtils.getRandomLetter(16);
    accountData.loginKey.push(loginKey);
    if(accountData.loginKey.length>3){
        accountData.loginKey.shift();
    }
    var loginCount = accountData.loginCount||0;
    accountData.loginCount = loginCount + 1;
    if(sdkData){
        accountData.sdkData = sdkData;
    }
    accountDao.update(loginClient,{loginKey:accountData.loginKey,loginCount:accountData.loginCount,sdkData:accountData.sdkData},{id:accountData.id},function(err,data){
        if(err) return cb(err);
        cb(null,[accountData,loginKey]);
    })
};

var _createNewAccount = function(client,name,pwd,deviceId,channelId,sdkData,cb){
    sdkData = sdkData||{};
    //如果不存在则创建一个账号
    var accountEntity = new AccountEntity();
    accountEntity.name = name;//name可能是重复的
    accountEntity.pwd = pwd;
    accountEntity.deviceId = deviceId;
    accountEntity.channelId = channelId;
    accountEntity.sdkData = sdkData;
    accountEntity.createTime = new Date();
    accountEntity.lastUpdateTime = new Date();
    accountEntity.loginCount = 0;
    accountEntity.exData = {};
    accountEntity.userServers = [];
    accountEntity.loginKey = [];
    accountEntity.sdkChannelId = sdkData["channelid"];


    //插入新的账号信息
    accountDao.insert(loginClient, accountEntity, function(err, newAccount){
        if (err) return cb(err);
        accountEntity.id = newAccount.insertId;
        cb(null,accountEntity);
    });
};

//console.log(getReZero(10,6));