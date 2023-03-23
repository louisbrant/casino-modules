/**
 * Created by Administrator on 2015/3/10.
 */
var coffersBiz = require("uw-coffers").coffersBiz;
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var exports = module.exports;

exports.run = function(cfg){
    coffersBiz.sendAward(uwClient, function(err){
        if(err) return logger.error(err);
        console.log("发奖成功！");
    });
};

exports.runOnce = function(){

};
