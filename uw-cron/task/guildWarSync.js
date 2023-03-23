/**
 * Created by Administrator on 2015/3/10.
 */
var guildWarBiz = require("uw-guild-war").guildWarBiz;
var syncGuildBiz = require("uw-guild-war").syncGuildBiz;
var syncUserBiz = require("uw-guild-war").syncUserBiz;
var g_guildWar = require("uw-global").g_guildWar;
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var exports = module.exports;

var __nextRunTime1 = new Date();
var __nextRunTime2 = new Date();
var __nextRunTime3 = new Date();
var __nextRunTime4 = new Date();

exports.run = function(){
    guildWarBiz.checkOpen(uwClient,function(err){
        if(err)  logger.error(err);
    });

    run1();
    run2();
    run3();
    run4();
};

var run1 = function(){
    if(__nextRunTime1.isAfter(new Date())) return;
    __nextRunTime1 = (new Date()).addSeconds(15);
    syncGuildBiz.pushMyGuildDynamicData(function(err){
        if(err)  logger.error(err);
        __nextRunTime1 = new Date();
    });
};

var run2 = function(){

    if(__nextRunTime2.isAfter(new Date())) return;
    __nextRunTime2 = (new Date()).addSeconds(15);
    syncGuildBiz.syncOtherGuildDynamicData(function(err){
        if(err)  logger.error(err);
        __nextRunTime2 = new Date();

    });

};


var run3 = function(){

    if(__nextRunTime3.isAfter(new Date())) return;
    __nextRunTime3 = (new Date()).addSeconds(15);
    syncUserBiz.pushMyUserDynamicData(function(err){
        if(err)  logger.error(err);
        __nextRunTime3 = new Date();

    });

};


var run4 = function(){

    if(__nextRunTime4.isAfter(new Date())) return;
    __nextRunTime4 = (new Date()).addSeconds(15);
    syncUserBiz.syncOtherUserDynamicData(function(err){
        if(err)  logger.error(err);
        __nextRunTime4 = new Date();

    });
};


exports.runOnce = function(){

};