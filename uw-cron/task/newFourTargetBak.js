/**
 * Created by Sara on 2016/6/23.
 */
var exports = module.exports;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var newFourDaysBiz = require("uw-fiveDaysTarget").newFourDaysBiz;
exports.run = function(cfg){
    newFourDaysBiz.sqlTargetBak(uwClient, function(err){
        if(err) return console.log(err);
    })
};

exports.runOnce = function(){

};