/**
 * Created by Administrator on 2015/7/10.
 */

var util = require("util");
var BaseSDK = require("../BaseSDK.js");

function EgretBiz(){
    BaseSDK.call(this);
    this.name = "egret常规sdk";
    this.appId= "249";
    this.appKey = "weasdasdasd";
    this.host = "api.egret-labs.org";
    this.port = 80;
    this.apiPath = "/games/api.php";
};

util.inherits(EgretBiz,BaseSDK);
module.exports = new EgretBiz();