/**
 * Created by Administrator on 2015/3/10.
 */
var g_guild = require("uw-global").g_guild;
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;
var mainClient = require("uw-db").mainClient;
var gameConfigBiz = require("uw-game-config").gameConfigBiz;
var lootConfigBiz = require("uw-loot-config").lootConfigBiz;
var logger = require("uw-log").getLogger("uw-logger",__filename);
var async = require("async");

var exports = module.exports;

exports.run = function(cfg){
    async.series([
        function(cb1){
            gameConfigBiz.init(mainClient,function(err,data){
                if(err) logger.error(err);
                cb1();
            });
        },
        function(cb1){
            lootConfigBiz.init(function(err,data){
                if(err) logger.error(err);
                cb1();
            });
        }
    ],function(err,data){
        if(err) logger.error(err);
    });
};

exports.runOnce = function(){

};