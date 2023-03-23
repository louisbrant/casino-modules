/**
 * Created by Sara on 2016/6/13.
 */
var guildBiz = require("uw-guild").guildBiz;
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var exports = module.exports;

exports.run = function(cfg){
    guildBiz.chairmanImpeach(uwClient, function(err){
        if(err) return logger.error(err);
        console.log("执行成功！");
    });
};

exports.runOnce = function(){

};
