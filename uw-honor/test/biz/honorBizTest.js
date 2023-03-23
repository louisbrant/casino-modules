/**
 * Created by Administrator on 2015/6/29.
 */
var honorBiz = require("../../src/biz/honorBiz.js");
var uwClient = require("uw-db").uwClient;

var bugAlter = function(){
    honorBiz.bugAlter(uwClient,function(){});
};

/*************************************************************/
bugAlter();