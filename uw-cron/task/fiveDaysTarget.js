/**
 * Created by Administrator on 2015/12/15.
 */
var exports = module.exports;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var fiveDaysTargetBiz = require("uw-fiveDaysTarget").fiveDaysTargetBiz;
exports.run = function(cfg){
    fiveDaysTargetBiz.sendRankAward(uwClient, function(err){
        if(err) return logger.error(err);
    });
};

exports.runOnce = function(){

};