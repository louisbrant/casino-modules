/**
 * Created by Administrator on 2015/6/29.
 */
var eventBiz = require("../../src/biz/eventBiz.js");
var uwClient = require("uw-db").uwClient;

//随机事件
var randomEvent = function(){
    eventBiz.randomEvent(uwClient,1,30,1,function(err,data){console.log(err,data)});
};

//随机事件购买
var eventBuy = function(){
    eventBiz.eventBuy(uwClient,1,10003,function(err,data){
        console.log(err,data);
    });
};

/*************************************************************/
randomEvent();
//eventBuy();