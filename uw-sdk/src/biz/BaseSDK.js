/**
 * Created by Administrator on 2015/7/10.
 */
var mainClient = require("uw-db").mainClient;
var sdkUtils = require("./sdkUtils.js");
var c_channel = require("uw-data").c_channel;
var c_payInfo = require("uw-data").c_payInfo;
var project = require("uw-config").project;

var accountDao;
var rechargeRequestDao;

var checkRequire = function() {
    accountDao = require('uw-account').accountDao;
    rechargeRequestDao = require('uw-recharge').rechargeRequestDao;
};
/**
 * 支付基础类
 * @constructor
 */
var BaseSDK = function(){
    this.name = "sdk基础类";
    this.appId= "249";
    this.appKey = "FKSxROQCr3VnmP5ydXbuk";
    this.host = "api.egret-labs.org";
    this.port = 80;
    this.apiPath = "/games/api.php";

    /**
     * 登陆
     * @param data
     * @param cb
     */
    this.login = function (data, cb) {
        var token = data[0];
        var params = {
            action: "user.getInfo", //user.getInfo 获取用户信息模块
            appId: this.appId,//由 Egret 分配
            serverId: project.serverId,//如果不分服，请设置为1
            time: Date.now(),//时间戳 1420855806 请求的时间
            token: token//登录凭证 用于获取用户信息
        };

        params = sdkUtils.getMd5Params(this.appKey,params);
        var options = this.getOptions(params);
        sdkUtils.requestData(options,function(err,data){
            if(err) return cb(err);
            cb(null,data);
        });
    };

    /**
     * 获取好友列表
     * @param data [id]
     * @param cb
     */
    this.getFriendList = function (data, cb) {
        var id = data[0];
        var params = {
            action: "friend.getList", //friend.getList 获取用户信息模块
            appId: this.appId,//由 Egret 分配
            id:id,
            time: Date.now()//时间戳 1420855806 请求的时间
        };

        params = sdkUtils.getMd5Params(this.appKey,params);
        var options = this.getOptions(params);
        sdkUtils.requestData(options,function(err,data){
            if(err) return cb(err);
            cb(null,data);
        });
    };

    /**
     * 获取vip
     * @param data [id]
     * @param cb
     */
    this.getVip = function (data, cb) {
        var userId = data[0];
        var params = {
            action: "user.getVipInfo", //user.getVipInfo 获取用户vip信息
            appId: this.appId,//由 Egret 分配
            id:userId,
            serverId: project.serverId,//如果不分服，请设置为1
            time: Date.now()//时间戳 1420855806 请求的时间
        };

        params = sdkUtils.getMd5Params(this.appKey,params);
        var options = this.getOptions(params);
        sdkUtils.requestData(options,function(err,data){
            if(err) return cb(err);
            cb(null,data);
        });
    };

    /**
     * 数据上报
     * @param data [id,score]
     * @param cb
     */
    this.setAchievement = function (data, cb) {
        cb(null);
    };

    //获取发起支付数据
    this.getPayData = function(data){
        var payData = "";
        return payData;
    };

    this.checkPay = function (orderData, cb) {
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
        var sign = sdkUtils.getMd5Sign(this.appKey,params);
        if(sign==orderData.sign){
            cb(null);
        }else{
            cb("验证失败");
        }
    };

    /**
     * 获取选项
     * @param params
     */
    this.getOptions = function (params) {
        var options = {
            host: this.host,
            port: this.port,
            path: this.apiPath + "?" + params,
            method: 'get',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        return options;
    };

    /**
     * 判断充值项
     * @param data [rechargeRequestData,orderData,channelId]
     * @param cb
     * @returns {*}
     */
    this.checkRechargeId = function(data ,cb){
        var rechargeRequestData = data[0];
        var orderData = data[1];
        var channelId = data[2];
        var rechargeId = rechargeRequestData.rechargeId;
        //检验和发出的类型是否一样
        if (!rechargeRequestData.goodsId) return cb("数据[" + rechargeRequestData.id + "]没有goodsId");
        if (rechargeRequestData.goodsId.toString() != orderData.goodsId.toString()) {
            return cb("道具不一致!orderData:" + JSON.stringify(orderData) + ",uw_recharge_request id:" + rechargeRequestData.id + ")");
        }else{
            //验证价格，如果对不上则，按照价格来发钻石,默认取公用渠道10003
            var curRechargeId = sdkUtils.getRechargeIdByMoney(orderData.money,channelId);
            if(!curRechargeId) return cb("价格不一致!orderData:" + JSON.stringify(orderData) + ",uw_recharge_request id:" + rechargeRequestData.id + ")");

            rechargeId = curRechargeId;//矫正充值项
        }
        cb(null,rechargeId);
    }
};
module.exports = BaseSDK;