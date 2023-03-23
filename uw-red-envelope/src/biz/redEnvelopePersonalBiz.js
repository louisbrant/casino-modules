/**
 * Created by Administrator on 2014/5/16.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var c_lottery = uwData.c_lottery;
var c_vip = uwData.c_vip;
var c_lvl = uwData.c_lvl;
var c_guildLvl = uwData.c_guildLvl;
var c_guildFuncCfg = uwData.c_guildFuncCfg;
var t_itemLogic = uwData.t_itemLogic;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var t_item = uwData.t_item;
var c_open = uwData.c_open;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var chatBiz = require("uw-chat").chatBiz;
var formula = require("uw-formula");
var RedEnvelopeEntity = require('uw-entity').RedEnvelopeEntity;
var RedEnvelopePersonalEntity = require('uw-entity').RedEnvelopePersonalEntity;
var GuildPersonalEntity = require('uw-entity').GuildPersonalEntity;

var mailBiz = null;
var userDao = null;
var userUtils = null;
var propUtils = null;
var itemBiz = null;
var commonUtils = null;
var gameCommonBiz = null;
var g_redEnvelope = null;
var redEnvelopeDao = null;
var redEnvelopePersonalDao = null;
var guildPersonalDao = null;
var checkRequire = function(){
    mailBiz = require("uw-mail").mailBiz;
    userDao = require("uw-user").userDao;
    userUtils = require("uw-user").userUtils;
    propUtils = require("uw-utils").propUtils;
    itemBiz = require("uw-item").itemBiz;
    commonUtils = require("uw-utils").commonUtils;
    gameCommonBiz = require("uw-game-common").gameCommonBiz;
    g_redEnvelope = require("uw-global").g_redEnvelope;
    redEnvelopeDao =  require("../dao/redEnvelopeDao.js");
    redEnvelopePersonalDao = require("../dao/redEnvelopePersonalDao.js");
    guildPersonalDao  = require("uw-guild").guildPersonalDao;
};

var ds = require("uw-ds").ds;

var exports = module.exports;

/**
 * 获取个人红包数据
 * @param client
 * @param userId
 * @param cb
 */
exports.getInfo = function(client,userId,cb){
    checkRequire();
    async.parallel([
        function (cb1) {
            _getRecordData(client,userId,cb1);
        },
        function (cb1) {
            _getRecordGpData(client,userId,cb1);
        }
    ],function(err,data){
        if (err) return cb(err);
        cb(null,data);
    });
};



/*****************************************************************************************************/

//判断是否有数据，无数据插入一条
var _getRecordData = function(client,userId,cb){
    redEnvelopePersonalDao.select(client,{userId:userId},function(err,redEnvelopePersonalData) {
        if(err) return cb(err);
        if(!redEnvelopePersonalData) {        //如果不存在该用户数据则插入一条
            var redEnvelopePersonalEntity = new RedEnvelopePersonalEntity();
            redEnvelopePersonalEntity.userId = userId;
            redEnvelopePersonalEntity.addUpServer = 0;
            redEnvelopePersonalEntity.addUpGuild = 0;
            redEnvelopePersonalEntity.addUpGet = 0;
            redEnvelopePersonalEntity.sendCount = 0;
            redEnvelopePersonalEntity.lastSendTime = null;
            redEnvelopePersonalEntity.getData = [];
            redEnvelopePersonalDao.insert(client, redEnvelopePersonalEntity, function(err,data){
                if(err) return cb(err);
                redEnvelopePersonalEntity.id = data.insertId;
                cb(null,redEnvelopePersonalEntity);
            });
        }else{
            cb(null,redEnvelopePersonalData);
        }
    });
};

var _getRecordGpData = function(client,userId,cb){
    guildPersonalDao.select(client,{userId:userId},function(err,guildPersonalData) {
        if(err) return cb(err);
        if(!guildPersonalData) {        //如果不存在该用户数据则插入一条
            var guildPersonalEntity = new GuildPersonalEntity();
            guildPersonalEntity.userId = userId;
            guildPersonalEntity.guildId = 0;
            guildPersonalEntity.position = 0;
            guildPersonalEntity.viceTime = null;
            guildPersonalEntity.todayAct = 0;
            guildPersonalEntity.noticeCount = 0;
            guildPersonalEntity.exitGuildCount = 0;
            guildPersonalEntity.lotteryCount = 0;
            guildPersonalEntity.actLastTime = null;
            guildPersonalEntity.addUpAct = 0;
            guildPersonalEntity.outMsg = [];
            guildPersonalEntity.appliedMsg = [];
            guildPersonalEntity.actData = {};
            guildPersonalEntity.guildAct = 0;
            guildPersonalEntity.lastQuipGuildTime = null;
            guildPersonalEntity.ennoble = c_prop.ennobleTypeKey.civilian;
            guildPersonalDao.insert(client, guildPersonalEntity, function(err,data){
                if(err) return cb(err);
                guildPersonalEntity.id = data.insertId;
                cb(null,guildPersonalEntity);
            });
        }else{
            cb(null,guildPersonalData);
        }
    });
};




