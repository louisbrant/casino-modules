/**
 * Created by Administrator on 2015/5/13.
 */
var uwData = require("uw-data");
var userUtils = require("uw-user").userUtils;
var activityUtils = require("./activityUtils.js");
var c_prop = uwData.c_prop;
var fiveDayTargetBiz = null;


var checkRequire = function(){
    fiveDayTargetBiz = fiveDayTargetBiz || require("uw-fiveDaysTarget").fiveDaysTargetBiz;
};
/**
 * 判断是否需要操作，主要是红点
 * @param userData
 * @param exActivity
 * @private
 */
exports.isNeedOp = function (userData, exActivity) {
    var activityData = exActivity.activity;
    switch (activityData.type) {
        case c_prop.activityTypeKey.firstRecharge:
            //首充
            if (!exActivity.allRecharge) return 0;
            var receiveData = userData.activity[activityData.id] || [];
            var receiveCount = receiveData[0]||0;
            if (receiveCount>0) return 0;
            return 1;
            break;
        case c_prop.activityTypeKey.sevenLogin:
            //七天登陆
            var isNeed = 0;
            var receiveArr = userData.activity[activityData.id] || [];
            if (receiveArr.length >= exActivity.activityItems.length) return 0;
            var receiveTime = receiveArr[receiveArr.length-1];
            if (receiveTime) {
                receiveTime = new Date(receiveTime);
                //当天没领取
                if (!receiveTime.equalsDay(new Date())) {
                    isNeed = 1;
                }
            } else {
                //没领取过
                isNeed = 1;
            }
            return isNeed;
            break;
        case c_prop.activityTypeKey.limitBuy:
        case c_prop.activityTypeKey.limitBuyRange:
            //限购
            return 0;
            break;
        case c_prop.activityTypeKey.dayChargeCount:
            //每日充值
            var isNeed = 0;
            for (var i = 0; i < exActivity.activityItems.length; i++) {
                var locItem = exActivity.activityItems[i];
                if (locItem.rmb <= exActivity.todayRecharge) {
                    var receiveData = userData.activity[activityData.id] || [];
                    var receiveTime = receiveData[i];
                    if (receiveTime) {
                        receiveTime = new Date(receiveTime);
                        //当天没领取
                        if (!receiveTime.equalsDay(new Date())) {
                            isNeed = 1;
                            break;
                        }
                    } else {
                        //没领取过
                        isNeed = 1;
                        break;
                    }
                }
            }
            return isNeed;
            break;
        case c_prop.activityTypeKey.allChargeCount:
            //累计充值
            var isNeed = 0;
            for (var i = 0; i < exActivity.activityItems.length; i++) {
                var locItem = exActivity.activityItems[i];
                if (locItem.rmb <= exActivity.allRecharge) {
                    var receiveData = userData.activity[activityData.id] || [];
                    var receiveCount = receiveData[i] || 0;
                    if (receiveCount <= 0) {
                        //没领取过
                        isNeed = 1;
                        break;
                    }
                }
            }
            return isNeed;
            break;
        case c_prop.activityTypeKey.dayCostCount:
            //每日消费
            var isNeed = 0;
            for (var i = 0; i < exActivity.activityItems.length; i++) {
                var locItem = exActivity.activityItems[i];
                if (locItem.diamond <= exActivity.todayCost) {
                    var receiveData = userData.activity[activityData.id] || [];
                    var receiveTime = receiveData[i];
                    if (receiveTime) {
                        receiveTime = new Date(receiveTime);
                        //当天没领取
                        if (!receiveTime.equalsDay(new Date())) {
                            isNeed = 1;
                            break;
                        }
                    } else {
                        //没领取过
                        isNeed = 1;
                        break;
                    }
                }
            }
            return isNeed;
            break;
        case c_prop.activityTypeKey.allCostCount:
            //累计消费
            var isNeed = 0;
            for (var i = 0; i < exActivity.activityItems.length; i++) {
                var locItem = exActivity.activityItems[i];
                if (locItem.diamond <= exActivity.allCost) {
                    var receiveData = userData.activity[activityData.id] || [];
                    var receiveCount = receiveData[i] || 0;
                    if (receiveCount <= 0) {
                        //没领取过
                        isNeed = 1;
                        break;
                    }
                }
            }
            return isNeed;
            break;
        case c_prop.activityTypeKey.upLvl:
            //领主升级
            var isNeed = 0;
            for (var i = 0; i < exActivity.activityItems.length; i++) {
                var locItem = exActivity.activityItems[i];
                var needLvl = locItem.userLvl || 0;
                if (userData.lvl >= needLvl) {
                    var receiveData = userData.activity[activityData.id] || [];
                    var receiveCount = receiveData[i] || 0;
                    if (receiveCount <= 0) {
                        //没领取过
                        isNeed = 1;
                        break;
                    }
                }
            }
            return isNeed;
            break;
        case c_prop.activityTypeKey.upVip:
            //vip等级
            var isNeed = 0;
            for (var i = 0; i < exActivity.activityItems.length; i++) {
                var locItem = exActivity.activityItems[i];
                var needLvl = locItem.vipLvl || 0;
                if (userData.vip >= needLvl) {
                    var receiveData = userData.activity[activityData.id] || [];
                    var receiveCount = receiveData[i] || 0;
                    if (receiveCount <= 0) {
                        //没领取过
                        isNeed = 1;
                        break;
                    }
                }
            }
            return isNeed;
            break;
        case c_prop.activityTypeKey.sign:
            //签到
            var isNeed = 0;
            //判断今日是否已经签到
            if(!activityUtils.isTodaySigned(userData.sign)){
                isNeed = 1;
            }
            return isNeed;
            break;
        case c_prop.activityTypeKey.firstRecharge:
            var day = fiveDayTargetBiz.getCurDay(activityData);
            if (day < 4){
                return 1;
            }else {
                return 0;
            }
            break;
        default:
            return 0;
            break;
    }
};

/**
 * 判断是否符合活动等级要求
 * @param userData
 * @param exActivity
 * @private
 */
exports.isNeedLvl = function (userData, exActivity) {
    var activityData = exActivity.activity;
    var exData = activityData.exData;
    var minLvl = exData[c_prop.activityExDataTypeKey.minLvl] || 0;
    var maxLvl = exData[c_prop.activityExDataTypeKey.maxLvl] || 999;
    if(userData.lvl >= minLvl && userData.lvl <= maxLvl){
        return true;
    }else {
        return false;
    }
};