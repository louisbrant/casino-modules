/**
 * Created by Administrator on 2015/12/25.
 */
var c_bossParameter = require("uw-data").c_bossParameter;
var c_bossWorld = require("uw-data").c_bossWorld;
var c_bossHurtRate = require("uw-data").c_bossHurtRate;
var c_game = require("uw-data").c_game;
var c_prop = require("uw-data").c_prop;
var md5Utils = require('uw-utils').md5Utils;
var g_lootConfig = require('uw-global').g_lootConfig;
var exports = module.exports;

//获取复活次数
exports.getRepeatCount = function(bossData){
    if(!bossData.repeatTime) bossData.repeatTime = new Date();
    if(!(new Date()).equalsDay(bossData.repeatTime)){
        bossData.repeatCount = 0;
    }
    return bossData.repeatCount;
};

//增加复活次数
exports.addRepeatCount = function(bossData){
    var count = exports.getRepeatCount(bossData);
    count++;
    bossData.repeatTime = new Date();
    bossData.repeatCount = count;
};

//获取行会bossid组
exports.getGuildBossIds = function(){
    var list = [];
    for(var key in c_bossParameter){
        var locId = parseInt(key) ;
        list.push(locId);
    }
    return list;
};

//获取世界bossid组
exports.getWorldBossIds = function(){
    var list = [];
    var worldIds = c_game.newBossCfg[3];
    worldIds = worldIds.toString();
    worldIds = worldIds.split(",");
    for(var i = 0;i<worldIds.length;i++){
        var locId = parseInt(worldIds[i]) ;
        list.push(locId);
    }
    return list;
};

//获取开始时间
exports.getOpenStartTime = function() {
    var startTime = c_game.worldBossCfg[5];
    var startTimeHours = parseInt(startTime.split(";")[0]);
    var startTimeMinutes = parseInt(startTime.split(";")[1]);

    var reTime = (new Date()).clearTime();
    reTime.addHours(startTimeHours).addMinutes(startTimeMinutes);
    return reTime;
};

//获取结束时间
exports.getOpenEndTime = function() {
    var startTime = c_game.worldBossCfg[6];
    var startTimeHours = parseInt(startTime.split(";")[0]);
    var startTimeMinutes = parseInt(startTime.split(";")[1]);

    var reTime = (new Date()).clearTime();
    reTime.addHours(startTimeHours).addMinutes(startTimeMinutes);
    return reTime;
};

//获取世界boss开始时间
exports.getWorldOpenStartTime = function(bossId) {
    var startTime = c_bossWorld[bossId].startTime;
    var startTimeHours = parseInt(startTime[0]);
    var startTimeMinutes = parseInt(startTime[1]);
    var reTime = (new Date()).clearTime();
    reTime.addHours(startTimeHours).addMinutes(startTimeMinutes);
    return reTime;
};

//获取世界boss结束时间
exports.getWorldOpenEndTime = function(bossId) {
    var endTime = c_bossWorld[bossId].endTime;
    var endTimeHours = parseInt(endTime[0]);
    var endTimeMinutes = parseInt(endTime[1]);
    var reTime = (new Date()).clearTime();
    reTime.addHours(endTimeHours).addMinutes(endTimeMinutes);
    return reTime;
};

/**
 * 获取开启cd
 * @returns {number}
 */
exports.getOpenCd = function(bossData,bossId) {
    var c_data = c_bossParameter[bossId];
    var summonCd = c_data.summonCd;
    var deathTime = bossData.deathTime || (new Date()).addDays(-10);
    deathTime = new Date(deathTime);
    var diffSeconds = deathTime.getSecondsBetween(new Date());
    var cd = summonCd - diffSeconds;
    cd = cd > 0 ? cd : 0;
    return cd;
};

//获取伤害奖励
exports.getHurtGold = function(bossId,hurt){
    var rangHurt = _getRangHurt(bossId,hurt);
    var rate2 = c_bossParameter[bossId].goldRate;
    var getGold = rangHurt*rate2;
    getGold = parseInt(getGold);
    return getGold;
};

exports.mData = function(mykey, hurtArr,isEnd){
    var str = JSON.stringify(hurtArr);
    return md5Utils.md5(mykey+str+isEnd);
};

//获取奖励物品
exports.getAwardItems = function(bossId,type,data){
    /*
     第一名奖励	二到五名奖励	六到10名奖励	召唤奖	行会奖	最后一击奖
     rankAward1	rankAward2	rankAward3	summonAward	guildAward	lastShotAward
     */

    var items = {};
    var bossParameter = c_bossParameter[bossId];
    if(!bossParameter) return items;
    var itemArr = [];
    switch (type) {
        case c_prop.bossAwardTypeKey.summonAward:       //召唤奖
            itemArr = bossParameter.summonAward;
            break;
        case c_prop.bossAwardTypeKey.guildAward:       //行会奖
            itemArr = bossParameter.guildAward;
            break;
        case c_prop.bossAwardTypeKey.hurtAward:       //伤害奖励
            var hurtGold = exports.getHurtGold(bossId,data);
            itemArr.push([c_prop.spItemIdKey.gold,hurtGold]);
            break;
        case c_prop.bossAwardTypeKey.rankAward1:       //排名奖1
            itemArr = bossParameter.rankAward1;
            break;
        case c_prop.bossAwardTypeKey.rankAward2:       //排名奖2
            itemArr = bossParameter.rankAward2;
            break;
        case c_prop.bossAwardTypeKey.rankAward3:       //排名奖3
            itemArr = bossParameter.rankAward3;
            break;
        case c_prop.bossAwardTypeKey.rankAward4:       //排名奖4
            itemArr = bossParameter.rankAward4;
            break;
        case c_prop.bossAwardTypeKey.lastShotAward:       //最后一击奖励
            itemArr = bossParameter.lastShotAward;
            break;
    }

    for(var i=0;i<itemArr.length;i++){
        var locItemId = itemArr[i][0];
        var locItemNum = itemArr[i][1];
        if(!g_lootConfig.isLoot(locItemId)) continue;
        locItemNum = parseInt(locItemNum)||0;
        if(locItemNum<=0) continue;
        items[locItemId] = locItemNum;
    }
    return items;
};

exports.getWorldAwardItems = function(bossId,type,isWin,data){
    var items = {};
    var bossParameter = c_bossWorld[bossId];
    if(!bossParameter) return items;
    var itemArr = [];
    switch (type) {
        case c_prop.bossAwardTypeKey.hurtAward:       //伤害奖
            itemArr = _getWorldRankItems(isWin,bossId,data);
            break;
        case c_prop.bossAwardTypeKey.lastShotAward:   //最后一击
            itemArr = bossParameter.lastShotAward;
            break;
    }
    for(var i=0;i<itemArr.length;i++){
        var locItemId = itemArr[i][0];
        var locItemNum = itemArr[i][1];
        if(!g_lootConfig.isLoot(locItemId)) continue;
        locItemNum = parseInt(locItemNum)||0;
        if(locItemNum<=0) continue;
        items[locItemId] = locItemNum;
    }
    return items;
};

var _getRangHurt = function(bossId,hurt){
    var hurtGold = 0;
    if(bossId==120000){
        for(var key in c_bossHurtRate){
            var locData = c_bossHurtRate[key];
            var locStartHurt = locData.startHurt2;
            var locEndHurt = locData.endHurt2;
            var locRate = locData.gold2;
            if(hurt>=locStartHurt&&hurt<=locEndHurt){
                hurtGold += (hurt-locStartHurt)*locRate;
                break;
            }else{
                hurtGold += (locEndHurt-locStartHurt)*locRate;
            }
        }
    }else{
        for(var key in c_bossHurtRate){
            var locData = c_bossHurtRate[key];
            var locStartHurt = locData.startHurt1;
            var locEndHurt = locData.endHurt1;
            var locRate = locData.gold1;
            if(hurt>=locStartHurt&&hurt<=locEndHurt){
                hurtGold += (hurt-locStartHurt)*locRate;
                break;
            }else{
                hurtGold += (locEndHurt-locStartHurt)*locRate;
            }
        }
    }
    return hurtGold;
};


var _getWorldRankItems = function(isWin,bossId,rank){
/*
    1奖励	2奖励	3奖励	4到10奖励	11到50奖励	51到200奖励	201到1000奖励
    rankAward1	rankAward2	rankAward3	rankAward4	rankAward5	rankAward6	rankAward7
*/
    var bossData = c_bossWorld[bossId];
    if (rank == 1) {
        return isWin ? bossData.rankAward1 : bossData.failAward1;
    }
    if (rank == 2) {
        return isWin ? bossData.rankAward2 : bossData.failAward2;
    }
    if (rank == 3) {
        return isWin ? bossData.rankAward3 : bossData.failAward3;
    }
    if (rank >= 4 && rank <= 10) {
        return isWin ? bossData.rankAward4 : bossData.failAward4;
    }
    if (rank >= 11 && rank <= 50) {
        return isWin ? bossData.rankAward5 : bossData.failAward5;
    }
    if (rank >= 51 && rank <= 200) {
        return isWin ? bossData.rankAward6 : bossData.failAward6;
    }
    if (rank >= 201) {
        return isWin ? bossData.rankAward7 : bossData.failAward7;
    }
    return [];
};
