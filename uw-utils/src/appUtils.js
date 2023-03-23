/**
 * Created by Administrator on 14-9-29.
 */
var exports = module.exports;
var createDirUtils =require("./createDirUtils");
var logger = require('uw-log');
var log4jsCfg = require("uw-config").log4js;
var log4js_serverCfg = require('uw-config').log4js_server;
var moCron = require('uw-cron');
var g_guild = require('uw-global').g_guild;
var g_redEnvelope = require('uw-global').g_redEnvelope;
var g_challengCup = require("uw-global").g_challengCup;
var g_incognito = require("uw-global").g_incognito;
var async = require('async');
var robotUtils = require('./robotUtils');
var uwClient = require('uw-db').uwClient;
var mainClient = require('uw-db').mainClient;

var bossBiz;
var clusterBiz;
var kingBiz;
var coffersBiz;
var guildGroupBiz;
var guildWarBiz;
var gameConfigBiz;
var guildWarSyncBiz;
var lootConfigBiz;
var checkRequire = function(){
    bossBiz = bossBiz || require("uw-boss").bossBiz;
    clusterBiz = clusterBiz || require('uw-cluster').clusterBiz;
    kingBiz = kingBiz || require("uw-king").kingBiz;
    coffersBiz = coffersBiz || require("uw-coffers").coffersBiz;
    guildGroupBiz = guildGroupBiz || require("uw-guild-war").guildGroupBiz;
    guildWarBiz = guildWarBiz || require("uw-guild-war").guildWarBiz;
    gameConfigBiz = gameConfigBiz || require("uw-game-config").gameConfigBiz;
    guildWarSyncBiz = guildWarSyncBiz || require("uw-guild-war-sync").guildWarSyncBiz;
    lootConfigBiz = lootConfigBiz || require("uw-loot-config").lootConfigBiz;
};


exports.before = function(){
    checkRequire();
    var str_log4js_serverCfg = JSON.stringify(log4js_serverCfg);
    var workerId = clusterBiz.getWorkerId();
    str_log4js_serverCfg = str_log4js_serverCfg.replace(/workId/g,workerId);
    var new_log4js_serverCfg = JSON.parse(str_log4js_serverCfg);
    //创建log日志目录
    createDirUtils.createLogDir([new_log4js_serverCfg.appenders]);
    logger.configure(new_log4js_serverCfg);
};

/**
 * 服务器启动初始化
 */
exports.initServer = function(cb){
    checkRequire();
    async.series([
        function(cb1){
            gameConfigBiz.init(mainClient,cb1);
        },
        function(cb1){
            lootConfigBiz.init(cb1);
        },
        function(cb1){
            g_guild.init(cb1);
        },
        function(cb1){
            g_redEnvelope.init(cb1);
        },
        function(cb1){
            robotUtils.checkRobot(cb1);
        },
        function(cb1){
            bossBiz.checkBossList(uwClient,cb1);
        },
        function(cb1){
            g_challengCup.init(uwClient, cb1);
        },
        function(cb1){
            kingBiz.initBuff(uwClient, cb1);
        },
        function(cb1){
            coffersBiz.init(uwClient, cb1);
        },
        function(cb1){
            guildWarBiz.checkOpen(uwClient, cb1);
        },
        function(cb1){
            g_incognito.init(cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        //定时器
        moCron.runJobs();//定时器
        cb();
    });
};

exports.initGuildWar = function(cb){
    checkRequire();
    async.series([
        function(cb1){
            guildWarSyncBiz.init(cb1);
        }
     ],function(err,data){
        if (err) return cb(err);
        cb();
    })
};