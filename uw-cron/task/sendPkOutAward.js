/**
 * Created by Administrator on 2014/6/7.
 */
var exports = module.exports;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var pkOutBiz = require("uw-pkOut").pkOutBiz;
exports.run = function(cfg){
    pkOutBiz.sendPkOutAward(uwClient, function(err){
        if(err) return console.log(err);
    })
};

exports.runOnce = function(){

};