/**
 * Created by Administrator on 2016/1/6.
 */
var exports = module.exports;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var challengeCupBiz = require("uw-challenge-cup").challengeCupBiz;
exports.run = function(cfg){
    challengeCupBiz.openChallengeCup(uwClient, function(err){
        if(err) return console.log(err);
    });
};

exports.runOnce = function(){

};