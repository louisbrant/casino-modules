var core4Test = require("uw-test").core4Test;
var xiaomiBiz = require("../../src/biz/xiaomi/xiaomiBiz");
var cb = core4Test.cb4Test;
var trans = core4Test.trans;
var client = core4Test.uwClient;

function login(){
    //{"uid":44477358,"sessionId":"CxkmW4QY66xvn6tG"}
    xiaomiBiz.login([44477358,"CxkmW4QY66xvn6tG"],cb);
    //e645e6ac4cf04254ad4a122376170587f3370313
}


/**********************************************************/
login();

