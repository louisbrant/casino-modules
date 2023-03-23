/**
 * Created by Administrator on 2015/7/10.
 */

var util = require("util");
var BaseSDK = require("../BaseSDK.js");
var sdkUtils = require("../sdkUtils.js");
var project = require("uw-config").project;

function WanBaSDK(){
    BaseSDK.call(this);
    this.name = "玩吧sdk";
    this.appId= "249";
    this.appKey = "weeaadasdasgggaa";
    this.host = "api.gz.1251278653.clb.myqcloud.com";
    this.port = 80;
    this.apiPath = "/games/api.php";

    /**
     * 数据上报
     * @param data [id,score]
     * @param cb
     */
    this.setAchievement = function (data, cb) {
        var userId = data[0];
        var score = data[1];
        var params = {
            action: "user.setAchievement", //user.setAchievement 数据上报
            appId: this.appId,//由 Egret 分配
            id:userId,
            score:score,//积分
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
};

util.inherits(WanBaSDK,BaseSDK);
module.exports = new WanBaSDK();