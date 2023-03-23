/**
 * Created by Sara on 2015/12/24.
 */
var exports = module.exports;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var arenaBiz = require("uw-arena").arenaBiz;
exports.run = function(cfg){
    arenaBiz.sqlArenaBak(uwClient, function(err){
        if(err) return console.log(err);
    })
};

exports.runOnce = function(){

};