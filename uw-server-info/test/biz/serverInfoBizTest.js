/**
 * Created by Administrator on 2014/5/6.
 */

var core4Test = require("uw-test").core4Test;
var serverInfoBiz = require("../../src/biz/serverInfoBiz");
var cb = core4Test.cb4Test;
var trans = core4Test.trans;
var mainClient = core4Test.mainClient;

function checkStatus(cb){
    serverInfoBiz.checkStatus(0,true,cb);
};
//++++++++++++++++++++++++Run Test+++++++++++++++++++++++

checkStatus(cb);
