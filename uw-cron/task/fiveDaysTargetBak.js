/**
 * Created by Administrator on 2015/12/28.
 */
var exports = module.exports;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var fiveDaysTargetBiz = require("uw-fiveDaysTarget").fiveDaysTargetBiz;
exports.run = function(cfg){
    fiveDaysTargetBiz.sqlTargetBak(uwClient, function(err){
        if(err) return console.log(err);
    })
};

exports.runOnce = function(){

};