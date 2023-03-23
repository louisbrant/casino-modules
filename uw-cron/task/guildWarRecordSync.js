/**
 * Created by Administrator on 2015/3/10.
 */
var guildWarBiz = require("uw-guild-war").guildWarBiz;
var syncAttackRecordBiz = require("uw-guild-war").syncAttackRecordBiz;
var g_guildWar = require("uw-global").g_guildWar;
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var exports = module.exports;

var __nextRunTime1 = new Date();
var __nextRunTime2 = new Date();

exports.run = function(){

    run1();
    run2();
};

var run1 = function(){
    if(__nextRunTime1.isAfter(new Date())) return;
    __nextRunTime1 = (new Date()).addSeconds(15);
    syncAttackRecordBiz.pushMyRecordDynamicData(function(err){
        if(err)  logger.error(err);
        __nextRunTime1 = new Date();
    });
};

var run2 = function(){

    if(__nextRunTime2.isAfter(new Date())) return;
    __nextRunTime2 = (new Date()).addSeconds(15);
    syncAttackRecordBiz.syncOtherRecordDynamicData(function(err){
        if(err)  logger.error(err);
        __nextRunTime2 = new Date();

    });

};



exports.runOnce = function(){

};