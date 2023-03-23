/**
 * Created by Administrator on 2015/6/29.
 */
var gameRecordBiz = require("../../src/biz/gameRecordBiz.js");
var uwClient = require("uw-db").uwClient;

//记录用户每日登录次数
var setLoginCount = function(){
    gameRecordBiz.setLoginCount(uwClient,6,function(){});
};

//记录用户每日挑战副本次数
var setCopyCount = function(){
    gameRecordBiz.setCopyCount(uwClient,6,function(){});
};

//记录用户每日刷野次数
var setWipeCount = function(){
    gameRecordBiz.setWipeCount(uwClient,6,function(){});
};

//记录用户每日pk次数
var setPkCount = function(){
    gameRecordBiz.setPkCount(uwClient,6,function(){});
};

//记录用户每日充值记录
//@param userId
//@param rechargeId
//@param payMoney
var setRecharge = function(){
    gameRecordBiz.setRecharge(uwClient,6,2,30,function(){});
};

//记录用户每日商店记录
//@param userId
//@param shopId
//@param sum
var setShopRecord = function(){
    gameRecordBiz.setShopRecord(uwClient,6,2,30,function(){});
};

//记录用户每日消耗金币记录
//@param userId
//@param costGoldId
//@param costGoldCount
var setCostGoldRecord = function(){
    gameRecordBiz.setCostGoldRecord(uwClient,6,2,30,function(){});
};

//记录用户每日消耗钻石记录
//@param userId
//@param costDiamondId
//@param costDiamondCount
var setCostDiamondRecord = function(){
    gameRecordBiz.setCostDiamondRecord(uwClient,6,2,30,function(){});
};

//记录用户每日获取钻石记录
//@param userId
//@param getDiamondId
//@param getDiamondCount
var setDiamondRecord = function(){
    gameRecordBiz.setDiamondRecord(uwClient,6,2,30,function(){});
};

/*************************************************************/
setLoginCount();
setCopyCount();
setWipeCount();
setPkCount();
setRecharge();
setShopRecord();
setCostGoldRecord();
setCostDiamondRecord();
setDiamondRecord();