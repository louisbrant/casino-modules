/**
 * Created by Administrator on 2015/11/4.
 */

var c_game = require("uw-data").c_game;
var exports = module.exports = {};

/**
 * 获取今天是否已经签到
 * @returns {boolean}
 */
exports.isTodaySigned = function(signData){
    var lastSignTime = signData[1];
    if(!lastSignTime) return false;
    var gameDate = new Date();
    return !(exports.checkCanSign(gameDate,lastSignTime));
};


/**
 *
 * @param nowDate
 * @param lastSignDate
 * @private
 */
exports.checkCanSign = function(nowDate, lastSignDate){
    lastSignDate = new Date(lastSignDate);
    var nextSignDate = nowDate.clone();
    var refreshTime = c_game.refreshTime[1];
    //获取下一次签到时间
    if(lastSignDate.getHours()<refreshTime){
        nextSignDate = lastSignDate.clone().clearTime().addHours(refreshTime);
    }else{
        nextSignDate = lastSignDate.clone().clearTime().addHours(refreshTime).addDays(1);
    }
    //如果当前时间大于下一次签到时间，可以签到
    if(nowDate>=nextSignDate){
        return true;
    }
    return false;
};

/**
 * 获取签到次数
 */
exports.getSignNum = function (signData) {
    var signNum = signData[0];
    var lastSignTime = signData[1];
    //未领取过
    if (!lastSignTime) {
        signNum = 0;
    } else {
        //如果签到不等于当前月,则认为没签到
        var now = new Date();
        if (now.getMonth() != lastSignTime.getMonth()) {
            signNum = 0;
        }
    }
    return signNum;
};
