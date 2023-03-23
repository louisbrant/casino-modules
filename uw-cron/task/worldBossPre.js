/**
 * Created by Administrator on 2015/3/10.
 */
var bossBiz = require("uw-boss").bossBiz;
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var exports = module.exports;

exports.run = function(bossId,minutes){
    bossBiz.preWorldMsg(bossId,minutes);
};

exports.runOnce = function(){

};