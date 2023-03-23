/**
 * Created by Administrator on 2015/3/24.
 */
var mainClient = require("uw-db").mainClient;
var sdkUtils = require("./sdkUtils.js");
var loginClient = require('uw-db').loginClient;
var accountDao;
var rechargeRequestDao;
var channelBizDic;

var checkRequire = function(){
    accountDao = require('uw-account').accountDao;
    rechargeRequestDao = require('uw-recharge').rechargeRequestDao;

    if(!channelBizDic){
        channelBizDic = {
            "10001":require("../biz/egret/egretBiz"),
            "10002":require("../biz/wanba/wanbaBiz"),
            "10003":require("../biz/egret/egretBiz"),
            "10004":require("../biz/wanba/wanbaBiz"),
            "10005":require("../biz/hgame/hgameBiz"),
            "99999":require("../biz/egret/egretBiz")
        };
    }
};

var exports = module.exports;

/**
 * 登陆获取数据
 * @param channelId
 * @param data [token]
 * @param cb
 */
exports.login = function(channelId,data,cb){
    _callFun(channelId,"login" ,data,cb);
};

/** 获取登录账户SDK数据
* @param accountId
* @param cb
*/
exports.getSdkData = function(accountId,cb){
    accountDao = require('uw-account').accountDao;
    accountDao.selectCols(loginClient,"id,sdkData",{id:accountId},function(err,accountData){
        if(err) return cb(err);
        cb(null,accountData);
    });
};

/**
 * 获取登录账户SDK数据
 * @param accountId
 * @param cb
 */
exports.getSdkData = function(accountId,cb){
    accountDao = require('uw-account').accountDao;
    accountDao.selectCols(loginClient,"id,sdkData",{id:accountId},function(err,accountData){
        if(err) return cb(err);
        cb(null,accountData);
    });
};

/**
 * 获取好友列表
 * @param channelId
 * @param data  [id]
 * @param cb
 */
exports.getFriendList = function(channelId,data,cb){
    _callFun(channelId,"getFriendList" ,data,cb);
};

/**
 * 获取vip信息
 * @param channelId
 * @param data  [id]
 * @param cb
 */
exports.getVip = function(channelId,data,cb){
    _callFun(channelId,"getVip" ,data,cb);
};

/**
 * 上报数据
 * @param channelId
 * @param data [id,score]
 * @param cb
 */
exports.setAchievement = function(channelId,data,cb){
    _callFun(channelId,"setAchievement" ,data,cb);
};

/**
 * 获取支付发送信息
 * @param channelId
 * @param data [rechargeId,openId,orderId,lvl]
 * @param cb
 */
exports.getPayData = function(channelId,data){
   return _callFun(channelId,"getPayData" ,data);
};

/**
 * 校验支付
 * @param orderData
 * @param cb
 */
exports.checkPay = function(orderData,cb){
    checkRequire();

    var reId = _getReId(orderData);
    rechargeRequestDao.select(mainClient,{orderNo:reId},function(err,rechargeRequestData){
        if(err) return cb(err);
        if(!rechargeRequestData) return cb("没有该记录rechargeRequestData");
        accountDao.select(loginClient,{id:rechargeRequestData.accountId},function(err,accountData){
            if(err) return cb(err);
            if(!accountData) return cb("没有该记录accountData");
            //检验合法
            _callFun(accountData.channelId,"checkPay",orderData,function(err,data){
                if(err) return cb(err);
                //检验合法
                _callFun(accountData.channelId,"checkRechargeId",[rechargeRequestData,orderData,accountData.channelId],function(err,rechargeId){
                    if(err) return cb(err);
                    rechargeRequestData.rechargeId = rechargeId;
                    //更新数据
                    if(rechargeRequestData.status>0) return cb(null);
                    rechargeRequestDao.update(mainClient,{status:1,transId:orderData.orderId,rechargeId:rechargeRequestData.rechargeId},{id:rechargeRequestData.id},function(err,data){
                        if(err) return cb(err);
                        cb(null,accountData.channelId);
                    });
                });
            });
        });
    });
};

var _getReId = function(orderData){
    var reId = 0;
    if(orderData.ext){
        reId = orderData.ext;
    }else if(orderData.game_orderno) {
        reId = orderData.game_orderno;
    }
    return reId;
};

var _callFun = function(channelId,funName ,data,cb){
    checkRequire();
    var curBiz = channelBizDic[channelId];
    var fun = curBiz[funName];
    return fun.call(curBiz,data,cb);
};
