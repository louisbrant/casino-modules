/**
 * Created by Administrator on 2015/6/29.
 */
var gameRecordBiz = require("../../src/biz/gameRecordBiz.js");
var uwClient = require("uw-db").uwClient;

//获取用户挑战副本次数
var getCopyCount = function(){
    gameRecordBiz.getCopyCount(uwClient,6,function(){});
};

//获取用户刷野次数
var getWipeCount = function(){
    gameRecordBiz.getWipeCount(uwClient,6,function(){});
};

//获取用户pk次数
var getPkCount = function(){
    gameRecordBiz.getPkCount(uwClient,6,function(){});
};

//获取用户充值记录
//@param userId
//@param rechargeId
//@param payMoney
var getRecharge = function(){
    gameRecordBiz.getRecharge(uwClient,6,2,30,function(){});
};

//获取用户商店记录
//@param userId
//@param shopId
//@param sum
var getShopRecord = function(){
    gameRecordBiz.getShopRecord(uwClient,6,2,30,function(){});
};

//获取用户消耗金币记录
//@param userId
//@param costGoldId
//@param costGoldCount
var getCostGoldRecord = function(){
    gameRecordBiz.getCostGoldRecord(uwClient,6,2,30,function(){});
};

//获取用户消耗钻石记录
//@param userId
//@param costDiamondId
//@param costDiamondCount
var getCostDiamondRecord = function(){
    gameRecordBiz.getCostDiamondRecord(uwClient,6,2,30,function(){});
};


//获取用户获取钻石记录
//@param userId
//@param getDiamondId
//@param getDiamondCount
var getDiamondRecord = function(){
    gameRecordBiz.getDiamondRecord(uwClient,6,2,30,function(){});
};

/*************************************************************/
getCopyCount();
getWipeCount();
getPkCount();
getRecharge();
getShopRecord();
getCostGoldRecord();
getCostDiamondRecord();
getDiamondRecord();