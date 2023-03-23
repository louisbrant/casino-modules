/**
 * Created by Administrator on 2015/3/10.
 */
var chatBiz = require("uw-chat").chatBiz;
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;

var exports = module.exports;

exports.run = function(cfg){
    chatBiz.refreshSysMsg();
};


exports.runOnce = function(){
    
};