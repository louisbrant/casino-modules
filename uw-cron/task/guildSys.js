/**
 * Created by Administrator on 2015/3/10.
 */
var g_guild = require("uw-global").g_guild;
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;

var exports = module.exports;

exports.run = function(cfg){
    g_guild.guildSys();
};

exports.runOnce = function(){

};