/**
 * Created by Administrator on 2014/6/7.
 */
var exports = module.exports;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var arenaBiz = require("uw-arena").arenaBiz;
exports.run = function(cfg){
    arenaBiz.sendAward(uwClient, function(err){
        if(err) return console.log(err);
    })
};

exports.runOnce = function(){

};
