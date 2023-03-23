/**
 * Created by Administrator on 2015/7/10.
 * 小伙伴sdk
 */

var util = require("util");
var BaseSDK = require("../BaseSDK.js");
var sdkUtils = require("../sdkUtils.js");
var project = require("uw-config").project;
var c_recharge = require("uw-data").c_recharge;
var commonUtils = require("uw-utils").commonUtils;
var httpUtils = require("uw-utils").httpUtils;
var logger = require('uw-log').getLogger("uw-logger", __filename);
var querystring = require('querystring');

function HGameBiz(){
    BaseSDK.call(this);
    this.name = "小伙伴sdk";
    this.gameId = "100220";
    this.appId= "50f9bc36643e738e";//游戏标识
    this.appKey = "99152789b618a898fe5f8382ea9fa020";//秘钥
    this.host = "gc.hgame.com";
    this.port = 80;
    this.notify_url = project.notify_url;
    //http://gc.hgame.com/user/getticketuserinfo
    /**
     * 登陆
     * @param data
     * @param cb
     */
    this.login = function (data, cb) {
        var login_ticket = data[0];
        var login_type = data[1];
        //参数说明:
        //game_key ： 这⾥里是游戏中⼼心提供的game_key（required）
        //timestamp ： 游戏⽅方⽣生成的时间戳（required）
        //nonce ： 游戏⽅方⽣生成的随机字符串（required）
        //login_type： 始终为1，表⽰示ticket认证（required）
        //login_ticket ： 注意：与获取时ticket参数名称不同，认证票据，⽤用于获取平台唯⼀一⽤用户，只能使⽤用⼀一次（required）。值就是上⼀一步⾥里⾯面获取的ticket
        //signature : 签名（required）
        var nonce = commonUtils.getRandomLetter(6);
        var params = {
            game_key: this.appId,
            login_ticket: login_ticket,
            login_type: login_type,
            nonce: nonce,
            timestamp: Date.now()
        };

        this.apiPath = "/user/getticketuserinfo";
        params = sdkUtils.getSha1Params(this.appKey,params);
        var options = this.getOptions(params);
        sdkUtils.requestData2(options,function(err,data){
            if(err) return cb(err);
            data.id = data.open_id;
            cb(null,data);
        });
    };

    this.checkPay = function (orderData, cb) {
        //game_key ： 这⾥里是平台提供的game_key（required）
        //game_orderno ： 游戏⽅方⽣生成的唯⼀一订单号（required）
        //orderno ： 平台⽣生成的唯⼀一订单号（required）
        //subject ： 游戏道具名称（required）
        //description ： 游戏道具描述（option）
        //total_fee : 商品价格（required）
        //signature : 签名（required）
        var params = {
            description: orderData.description,
            game_key: orderData.game_key,
            game_orderno: orderData.game_orderno,
            orderno: orderData.orderno,
            subject: orderData.subject,
            total_fee: orderData.total_fee
        };
        var sign = sdkUtils.getSha1Sign(this.appKey,params);
        if(sign==orderData.signature){
            cb(null);
        }else{
            cb("验证失败");
        }
    };

    /**
     * 数据上报
     * @param data [id,score]
     * @param cb
     */
    this.setAchievement = function (data, cb) {

        var roleId = data[0];
        var serverId = data[1];
        var roleLvl = data[2];
        var open_id = data[3];
        var nickname = data[4];
        //参数说明:
        //baseData
        /*
         var baseData = {
         "game_key":     '1234567890',   //游戏平台提供的game_key
         "open_id":      '1111111111'        //游戏平台提供的用户ID
         "role": 'xhb',            //游戏角色的唯一ID
         "nickname": '我的昵称',    //游戏中角色的昵称，没有昵称的可以传空字符串
         "area": '1区'    ,           //游戏区标志
         "group": '1服'           //游戏服务器标志
         }
         */
        var baseData = {
            "game_key":     this.appId,   //游戏平台提供的game_key
            "open_id":     open_id,        //游戏平台提供的用户ID
            "role": roleId,            //游戏角色的唯一ID
            "nickname": nickname,    //游戏中角色的昵称，没有昵称的可以传空字符串
            "area": '1'    ,           //游戏区标志
            "group": serverId           //游戏服务器标志
        };

/*
        var baseData = {
            "timestamp":Date.now(),
            "role":roleId,
            "server":serverId,
            "game_key":this.appId,
            "open_id":open_id
        };
*/

        var extendData = {
            "level":roleLvl
        };
        var params = {
            action: "levelUpgrade",
            baseData:JSON.stringify(baseData),
            extendData: JSON.stringify(extendData)
        };

        this.apiPath = "/gameReport/data";

        var strPram = "";
        for (var key in params) {
            strPram += "&" + key + "=" + params[key];
        }
        strPram = strPram.substr(1, strPram.length - 1);

        var options = this.getOptions(strPram);

        httpUtils.requestHttp(options, "", function (err, result) {
            if(err) {
                logger.error("setAchievement requestHttp options:",options);
                logger.error("setAchievement requestHttp err:",err);
            }
        });
    };

    //获取发起支付数据
    this.getPayData = function(data){
        //game_key ： 这⾥里是游戏中⼼心提供的game_key（required）
        //open_id ： ⼩小伙伴游戏平台提供的⽤用户id（required）
        //total_fee ： 道具⽀支付⾦金额（单位元，精确到⼩小数点后两位，（required）
        //game_orderno ： 游戏⽣生成的订单号（required，唯⼀一）
        //subject ： 游戏道具名称（required）
        //description ： 游戏道具描述（option）
        //notify_url ： ⽀支付完成后通知URL（required）
        //timestamp ： 时间戳（required）
        //nonce ： 随机字符串（required）
        //game_area： ⽤用户所在的游戏区（option）
        //game_group: ⽤用户所在的游戏服（option）
        //game_level: ⽤用户在游戏中的等级（option）
        //game_role_id: ⽤用户的⾓角⾊色Id（option）
        //signature : 签名（required）
        var rechargeId = data[0];
        var open_id = data[1];
        var game_orderno = data[2];
        var lvl = data[3];

       var rechargeData =  c_recharge[rechargeId];
        var total_fee = rechargeData.cost.toFixed(2);
        var subject = rechargeData.name;

        var nonce = commonUtils.getRandomLetter(6);

        var payData = {
            game_area: project.serverId,
            game_key: this.appId,
            game_level: lvl,
            game_orderno: game_orderno,
            nonce: nonce,
            notify_url: this.notify_url,
            open_id: open_id,
            subject: subject,
            timestamp: Date.now(),
            total_fee: total_fee
        };
        payData.signature = sdkUtils.getSha1Sign(this.appKey,payData);
        return payData;
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
        //验证价格，如果对不上则，按照价格来发钻石,默认取公用渠道10003
        var curRechargeId = sdkUtils.getRechargeIdByMoney(orderData.total_fee,channelId);
        if(!curRechargeId) return cb("价格不一致!orderData:" + JSON.stringify(orderData) + ",uw_recharge_request id:" + rechargeRequestData.id + ")");
        rechargeId = curRechargeId;//矫正充值项
        cb(null,rechargeId);
    };

    /*
     http://d.hgame.com/hdpt/qqbrowser/gameid/100220/icustom
     支持GET POST 推荐使用POST
     recv_openid : 接收消息的用户的openid,多个用户之间用','分隔
     send_openid : 互动类消息中发送方openid
     templateid  : 模板Id
     mkvinfo : 根据模板传入不同的参数,json字符串
     templateid为 tplt_op 时传入 {"showtext":"hello"}
     templateid为 tplt123574 时传入 {"nickname":"烈马","bosstype":"行会","bossname":"脱缰"}
     */
    this.sendQQBrowserPushMsg = function(templateId, sendOpenId, recvOpenIds, msgData, cb) {
        var host = 'd.hgame.com';
        var apiPath = '/hdpt/qqbrowser/gameid/100220/icustom'
        var options = {
            host: host,
            port: 80,
            path: apiPath,
            method: 'post',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        var data = querystring.stringify({
            'send_openid': sendOpenId,
            'recv_openid': recvOpenIds,
            'templateid': templateId,
            'mkvinfo': JSON.stringify(msgData)
        });
        options.headers['Content-Length'] = data.length;
        httpUtils.requestHttp(options, data, function(err, data) {
            if (data == "SUCCESS")
                return cb(null);
            else
                return cb('发送失败');
        });
    };


    this.getBindPhoneUrl = function (openId,cb){
        //参数说明:
        //openid ： 用户openid
        //gameid:   游戏id
        //timestamp ： 游戏⽅方⽣生成的时间戳（required）
        //signature : 签名（required）
        var params = {
            gameid:this.gameId,
            openid: openId,
            timestamp: Date.now()
        };

        this.apiPath = "/public/oidbindlink";
        var params = sdkUtils.getSha1Params(this.appKey,params);
        var options = this.getOptions(params);
        sdkUtils.requestData2(options,function(err,data){
            if(err) return cb(err);
            //data.id = data.open_id;
            cb(null,data);
        });
    };
};

util.inherits(HGameBiz,BaseSDK);
module.exports = new HGameBiz();


/*if(require.main == module){
    module.exports.getBindPhoneUrl("56e3ed903399c68510", function(err, data){
        console.log(data);
    })
}*/
