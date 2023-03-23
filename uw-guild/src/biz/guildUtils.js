/**
 * Created by Administrator on 2015/12/8.
 */

var exports = module.exports;
var c_lvl = require("uw-data").c_lvl;
var c_guildLvl = require("uw-data").c_guildLvl;
var g_guild = require("uw-global").g_guild;
var c_game =  require("uw-data").c_game;
//获取上香次数
exports.getActNum = function (guildPersonalData, actId) {
    _calRefreshData(guildPersonalData);
    var actDataArr = guildPersonalData.actData[actId] || [];
    return actDataArr[0] || 0;
};

//增加上香次数
exports.addActNum = function (guildPersonalData, actId, num) {
    _calRefreshData(guildPersonalData);
    var actDataArr = guildPersonalData.actData[actId] || [];
    var actNum = actDataArr[0] || 0;
    actDataArr[0] = actNum + num;
    guildPersonalData.actData[actId] = actDataArr;
};

//获取今天贡献
exports.getTodayAct = function (guildPersonalData) {
    _calRefreshData(guildPersonalData);
    return guildPersonalData.todayAct;
};

//增加今天贡献
exports.addTodayAct = function (guildPersonalData, num) {
    _calRefreshData(guildPersonalData);
    guildPersonalData.todayAct += num;
    guildPersonalData.addUpAct += num;
    guildPersonalData.guildAct += num;
};

//获取今天公告次数
exports.getTodayNotice = function (guildPersonalData) {
    _calRefreshData(guildPersonalData);
    return guildPersonalData.noticeCount;
};

//增加今天公告次数
exports.addTodayNotice = function (guildPersonalData, num) {
    _calRefreshData(guildPersonalData);
    guildPersonalData.noticeCount += num;
};

//获取今天退会次数
exports.getTodayExitGuild = function (guildPersonalData) {
    _calRefreshData(guildPersonalData);
    return guildPersonalData.exitGuildCount;
};

//增加今天退会次数
exports.addTodayExitGuild = function (guildPersonalData, num) {
    _calRefreshData(guildPersonalData);
    guildPersonalData.exitGuildCount += num;
};

//获取今天抽奖次数
exports.getTodayLottery = function (guildPersonalData) {
    _calRefreshData(guildPersonalData);
    return guildPersonalData.lotteryCount;
};

//增加今天抽奖次数
exports.addTodayLottery = function (guildPersonalData, num) {
    _calRefreshData(guildPersonalData);
    guildPersonalData.lotteryCount += num;
};


//添加经验
exports.addGuildAct = function(guildData, act){

    var oldLvl = guildData.lvl;
    guildData.addUpAct+=act;

    var curLvl =  _getCurLvl(guildData.addUpAct);

    guildData.lvl = curLvl;

    //限制最高等级
    var maxLvl = c_game.guildSet[9];
    if(guildData.lvl>=maxLvl){
        guildData.lvl = maxLvl;
    }

    if(oldLvl!=curLvl){
        g_guild.reCalPkProp(guildData.id);
    }
};

var _getCurLvl = function(addUpAct){
    var tempLvl = 0;
    for(var i = 0;i<50;i++){
        var locLvlData = c_lvl[i];
        if(!locLvlData) break;
        var locNextData = c_lvl[i+1];
        if(!locNextData) break;
        if(addUpAct<locLvlData.guildExp){
            break;
        }
        tempLvl++;
    }
    return tempLvl;
};

var _calRefreshData = function (guildPersonalData) {
    if (!guildPersonalData.actLastTime) {
        guildPersonalData.actLastTime = new Date();
        guildPersonalData.actData = {};
        guildPersonalData.todayAct = 0;
        guildPersonalData.noticeCount = 0;
        guildPersonalData.exitGuildCount = 0;
        guildPersonalData.lotteryCount = 0;
    }
    if (!guildPersonalData.actLastTime.equalsDay(new Date())) {
        guildPersonalData.actLastTime = new Date();
        guildPersonalData.actData = {};
        guildPersonalData.todayAct = 0;
        guildPersonalData.noticeCount = 0;
        guildPersonalData.exitGuildCount = 0;
        guildPersonalData.lotteryCount = 0;
    }
};