/**
 * Created by Administrator on 2015/3/24.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
var uwData = require("uw-data");
var c_game = uwData.c_game;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var AccountEntity = require('uw-entity').AccountEntity;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var httpUtils = require("uw-utils").httpUtils;
var md5Utils = require("uw-utils").md5Utils;
var hashesUtils = require("uw-utils").hashesUtils
var ds = require("uw-ds").ds;
var exports = module.exports;

var sha1 = new hashesUtils.SHA1();

var g_config = {
    appId: "2882303761517334065",
    appKey: "5571733425065",
    appSecret: "T/B/rIFZZZ+asdasdasfgasasd=="
};

//登陆
exports.login = function (clientSdkData, cb) {
    var uid = clientSdkData[0];//登录凭证 用于获取用户信息
    var session = clientSdkData[1];//登录凭证 用于获取用户信息
    var params = _getLoginParams(session, uid);
    var options = _getOptions(params);
    logger.debug("login requestHttp options:",options);
    //console.log(options);
    httpUtils.requestHttp(options, "", function (err, result) {
        if (err){
            logger.error("request egret sdk error:%s result:%s options:%j",JSON.stringify(err),result,options);
            return cb("请求失败1");
        }
        try {
            //console.log(result);
            if (typeof result == "string") {
                result = JSON.parse(result);
            }
            if (result.errcode == 200) {
                cb(null, {"id":uid});
            } else {
                logger.error("request egret sdk error:%s result:%j options:%j",JSON.stringify(err),result,options);
                return cb("请求失败2");
            }
        } catch (e) {
            logger.error("convert egret sdk data error:%s result:%s options:%j",JSON.stringify(e),result,options);
            cb("请求失败3");
        }
    });
};

//支付
exports.checkPay = function (orderData, cb) {
    var sign = _getPaySign(orderData);
    if(sign==orderData.sign){
        cb(null);
    }else{
        cb("验证失败");
    }
};

var _getOptions = function (params) {
    var options = {
        host: 'mis.migc.xiaomi.com',
        port: 80,
        path: "/api/biz/service/verifySession.do?" + params,
        method: 'get',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    /*    var options = {
     host: '127.0.0.1',
     port: 5100,
     path: "/?"+params,
     method: 'POST'
     };*/
    return options;
};

var _getPaySign = function (orderData) {
    //按照key升序后，key1=value1key2=value2key3…拼接成的字符串+appkey,最后做md5
    var params = {
        ext: orderData.ext,
        goodsId: orderData.goodsId,
        goodsNumber: orderData.goodsNumber,
        id: orderData.id,
        money: orderData.money,
        orderId: orderData.orderId,
        serverId: orderData.serverId,
        time: orderData.time
    };
    var sign = "";
    var strPram = "";
    for (var key in params) {
        sign += key + "=" + params[key];
        strPram += "&" + key + "=" + params[key];
    }
    sign = md5Utils.md5(sign + g_config.appKey);
    return sign;
};

var _getLoginParams = function (session, uid) {
    var params = {
        appId: g_config.appId, //user.getInfo 获取用户信息模块
        session: session,//由客户端提供
        uid: uid//由客户端提供
    };
    return _md5Sign(params);
};

var _md5Sign = function(params){
    //按照key升序后，key1=value1key2=value2key3…拼接成的字符串+appkey,最后做md5
    var sign = "";
    var strPram = "";
    for (var key in params) {
        strPram += "&" + key + "=" + params[key];
    }
    strPram = strPram.substr(1, strPram.length - 1);
    sign = sha1.hex_hmac( g_config.appSecret,strPram);
    strPram += "&signature=" + sign;
    return strPram;
};

//console.log(_getLoginParams(1,2));
