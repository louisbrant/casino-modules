/**
 * Created by Administrator on 2015/7/10.
 */
var md5Utils = require("uw-utils").md5Utils;
var httpUtils = require("uw-utils").httpUtils;
var logger = require('uw-log').getLogger("uw-logger",__filename);
var uwData = require("uw-data");
var c_channel = uwData.c_channel;
var c_payInfo = uwData.c_payInfo;
var c_recharge = uwData.c_recharge;
var hashesUtils = require("uw-utils").hashesUtils
var sha1 = new hashesUtils.SHA1();
var exports = module.exports;

/**
 * md5加密
 * @param appKey
 * @param params
 * @returns {string}
 */
exports.getMd5Params = function(appKey,params){
    //按照key升序后，key1=value1key2=value2key3…拼接成的字符串+appkey,最后做md5
    var sign = "";
    var strPram = "";
    for (var key in params) {
        sign += key + "=" + params[key];
        strPram += "&" + key + "=" + params[key];
    }
    sign = md5Utils.md5(sign + appKey);
    params.sign = sign;
    strPram += "&sign=" + sign;
    strPram = strPram.substr(1, strPram.length - 1);
    return strPram;
};

/**
 * sha1加密
 * @param appKey
 * @param params
 * @returns {string}
 */
exports.getSha1Params = function(appKey,params){
    //按照key升序后，key1=value1key2=value2key3…拼接成的字符串+appkey,最后做md5
    var sign = "";
    var strPram = "";
    for (var key in params) {
        strPram += "&" + key + "=" + params[key];
    }
    strPram = strPram.substr(1, strPram.length - 1);
    sign = sha1.hex(strPram+appKey);
    strPram += "&signature=" + sign;

    return strPram;
};

/**
 * 获取md5签名
 * @param appKey
 * @param signParams
 * @returns {string}
 */
exports.getMd5Sign = function(appKey,signParams){
    var sign = "";
    for (var key in signParams) {
        sign += key + "=" + signParams[key];
    }
    sign = md5Utils.md5(sign + appKey);
    return sign;
};

/**
 * 获取sha1签名
 * @param appKey
 * @param signParams
 * @returns {string}
 */
exports.getSha1Sign = function(appKey,signParams){
    //按照key升序后，key1=value1key2=value2key3…拼接成的字符串+appkey,最后做md5
    var sign = "";
    var strPram = "";
    for (var key in signParams) {
        strPram += "&" + key + "=" + signParams[key];
    }
    strPram = strPram.substr(1, strPram.length - 1);
    sign = sha1.hex(strPram+appKey);
    return sign;
};

//如果对不上则，按照价格来发钻石
exports.getRechargeIdByMoney = function(money,channelId){
    var rechargeId = 0;
    for(var key in c_recharge){
        var locData = c_recharge[key];
        var locMoney = locData.cost;
        //玩吧打八折
        if (channelId == 10004) {
            if (parseFloat(money) == parseFloat(locMoney) * 0.8||parseInt(money) == parseInt(locMoney)) {
                rechargeId = key;
            }

        } else {
            if (parseInt(money) == parseInt(locMoney)) {
                rechargeId = key;
            }
        }
        if (rechargeId) break;
    }
    return rechargeId;
};

/**
 * 请求数据
 * @param options
 * @param cb
 */
exports.requestData = function(options,cb){
    logger.debug("login requestHttp options:",options);
    //console.log(options);
    httpUtils.requestHttp(options, "", function (err, result) {
        if (err){
            logger.error("request egret sdk error:%s result:%s options:%j",JSON.stringify(err),result,options);
            return cb("请求失败1");
        }
        logger.debug("login requestHttp result:",result);
        try {
            //console.log(result);
            if (typeof result == "string") {
                result = JSON.parse(result);
            }
        } catch (e) {
            logger.error("convert egret sdk data error:%s result:%s options:%j",JSON.stringify(e),result,options);
            return cb("请求失败3");
        }
        if (result.status == 0) {
            cb(null, result.data);
        } else {
            logger.error("request egret sdk error:%s result:%j options:%j",JSON.stringify(err),result,options);
            return cb("请求失败2");
        }
    });
};

/**
 * 请求数据方式2
 * @param options
 * @param cb
 */
exports.requestData2 = function(options,cb){
    logger.debug("login requestHttp options:",options);
    //console.log(options);
    httpUtils.requestHttp(options, "", function (err, result) {
        if (err){
            logger.error("request egret sdk error:%s result:%s options:%j",JSON.stringify(err),result,options);
            return cb("请求不到sdk数据，请稍后重试");
        }
        logger.debug("login requestHttp result:",result);
        try {
            //console.log(result);
            if (typeof result == "string") {
                result = JSON.parse(result);
            }
        } catch (e) {
            logger.error("convert egret sdk data error:%s result:%s options:%j",JSON.stringify(e),result,options);
            return cb("sdk请求数据格式错误，请稍后重试");
        }
        if (result.code == 0) {
            cb(null, result.data);
        } else {
            logger.error("request egret sdk error:%s result:%j options:%j",JSON.stringify(err),result,options);
            return cb("sdk请求状态异常，请稍后重试");
        }
    });
};