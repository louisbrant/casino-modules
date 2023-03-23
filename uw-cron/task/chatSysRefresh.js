/**
 * Created by Administrator on 2015/3/10.
 */
var g_chat = require("uw-global").g_chat;
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;

var exports = module.exports;

exports.run = function(cfg){
    g_chat.calIntervalData();
};


exports.runOnce = function(){
    g_chat.calIntervalData();
};