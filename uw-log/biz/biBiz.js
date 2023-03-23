/**
 * Created by Sara on 2015/12/29.
 */
var loggerWingBi = require('uw-log').getLogger("uw-bi-wing", __filename);
var loggerRealmBi = require('uw-log').getLogger("uw-bi-realm", __filename);
var loggerBossBi = require('uw-log').getLogger("uw-bi-boss", __filename);
var loggerUpStarStoneBi = require('uw-log').getLogger("uw-bi-upStarStone", __filename);
var loggerMysterShopBi = require('uw-log').getLogger("uw-bi-mysterShop", __filename);
var loggerCallBossBi = require('uw-log').getLogger("uw-bi-callBoss", __filename);
var loggerLotteryBi = require('uw-log').getLogger("uw-bi-lottery", __filename);
var loggerWingBi = require('uw-log').getLogger("uw-bi-wing", __filename);
var loggerGenuineQi = require('uw-log').getLogger("uw-bi-genuineQi", __filename);


exports.mysterShopBi = function(request,next){
    loggerMysterShopBi.info(request);
};

exports.callBossBi = function(request,next){
    loggerCallBossBi.info(request);
};

exports.lotteryBi = function(request,next){
    loggerLotteryBi.info(request);
};


exports.wingBi = function(request,next){
    loggerWingBi.info(request);
};

exports.realmBi = function(request,next){
    loggerRealmBi.info(request);
};

exports.bossBi = function(request,next){
    loggerBossBi.info(request);
};

exports.upStarStoneBi = function(request,next){
    loggerUpStarStoneBi.info(request);
};

exports.genuineQiBi = function(request,next){
    loggerGenuineQi.info(request);
};
