/**
 * Created by Administrator on 2015/5/23.
 * 路由初始化中间件，包括模拟session
 */


var c_msgCode = require("uw-data").c_msgCode;
var consts = require("uw-data").consts;
var url = require('url');
var path = require('path');
var querystring = require('querystring');
var wrapResult = require('uw-utils').wrapResultFunc(__filename);
var cryptUtils = require('uw-utils').cryptUtils;
var sessionManager = require('uw-route').sessionManager;
var logger = require('uw-log').getLogger("uw-route", __filename);
var cryptCfg = require("uw-config").crypt;

var getMsg = require("uw-utils").msgFunc(__filename);

var PARAM_ROUTE_KEY = "r";//url参数:路由key
var PARAM_ARGS_KEY = "a";//url参数:数据key
var PARAM_SESSIONID_KEY = "s";//url参数:数据key
var PARAM_CRYPT_KEY = "c";//加密的参数
var PARAM_ADMIN_KEY = "ak";//加密的参数

var reqId = 0;

module.exports = function(option){
    option = option ||{};
    return function(req, res, next){
        initRoute(req);
        if(option.isSession){
            initSession(req);
        }
        next();
    };
};


//console.log(cryptUtils.deCharCode(cryptCfg.cryptKey, "[14,72,7,72,7,87]"))

var initRoute = function(req){
    reqId = reqId>9999999999?0:reqId;
    reqId++;
    var requeryObj;
    var uwRoute = new UWRoute();

    if(req.isSocket){
        requeryObj = req.query;
    }else{
        var srvUrl = url.parse(req.url);
        requeryObj = querystring.parse(srvUrl.query);
    }
    var isCrypt = requeryObj[PARAM_CRYPT_KEY];//参数
    var sessionId = requeryObj[PARAM_SESSIONID_KEY];//参数
    var route = requeryObj[PARAM_ROUTE_KEY]||"";//路由
    var args = requeryObj[PARAM_ARGS_KEY]||{};//参数
    var adminKey = requeryObj[PARAM_ADMIN_KEY]||"";//参数

    if(isCrypt==1||isCrypt=="1"){
        route = cryptUtils.deCharCode(cryptCfg.cryptKey, requeryObj[PARAM_ROUTE_KEY])||"";//路由
        args = cryptUtils.deCharCode(cryptCfg.cryptKey,requeryObj[PARAM_ARGS_KEY])||{};//参数
    }

    logger.debug("request requestId:%s, route:%s,args:%s,sessionId:%s,isCrypt:%s",reqId,route,args,sessionId,isCrypt);

    try{
        args = JSON.parse(args);
    }catch(e){
        args = {};
    }

    uwRoute.id = reqId;
    uwRoute.route = route;
    uwRoute.args = args;
    uwRoute.sessionId = sessionId;
    uwRoute.startTime = Date.now();
    uwRoute.adminKey = adminKey;

    req.uwRoute = uwRoute;
};

var UWRoute = function(){
    this.id = null;
    this.route = null;
    this.args = null;
    this.sessionId = null;
    this.session = null;
    this.serialTask = null;
    this.startTime = null;
    this.adminKey = null;
};

var initSession = function(req){
    sessionManager = require('uw-route').sessionManager;
    var session = sessionManager.getSession(req.uwRoute.sessionId);
    if(!session){
        session = sessionManager.createSession();
    }
    req.uwRoute.session = session;

    sessionManager.resetExpireTime(session.id);
};