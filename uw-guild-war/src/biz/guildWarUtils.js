/**
 * Created by Administrator on 2016/4/11.
 */

var c_game = require("uw-data").c_game;
var t_otherBuff =  require("uw-data").t_otherBuff;
var c_prop =  require("uw-data").c_prop;
var g_guildWar =  require("uw-global").g_guildWar;
var c_guildWarReward =  require("uw-data").c_guildWarReward;
var g_gameConfig = require("uw-global").g_gameConfig;

//获取所有行会list
exports.getALLGuildWarByGroupId = function(groupId){
    var objList = g_guildWar.getAllObj();
    var guildList = [];
    for(var i = 0;i<objList.length;i++){
        var locObj = objList[i];
        var locList = locObj.getGuildWarDataByGroupId(groupId);
        guildList = guildList.concat(locList);
    }
    return guildList;
};


exports.syncGuildWarObj = function(serverId,syncGuildWarObj){
    /*
     this._guildWarGroupDic = {};//{"组别id":[]}
     this._guildWarDic = {};//{"行会id":GuildWarData}
     */
    var guildWarObj = g_guildWar.getObj(serverId);
    guildWarObj._guildWarDic = {};
    guildWarObj._guildWarGroupDic = {};
    guildWarObj._guildWarUserDic = {};
    guildWarObj._guildWarUserGroupDic = {};


    for(var gwKey in syncGuildWarObj){
        var locData = syncGuildWarObj[gwKey]||{};
        if(gwKey=="_guildWarGroupDic") continue;
        if(gwKey=="_guildWarUserGroupDic") continue;

        if(gwKey=="_guildWarDic"){
            //同步行会
            for(var key2 in locData){
                var locData2 = locData[key2];
                guildWarObj.pushGuildWarData(locData2.groupId,locData2);
            }
        } else if(gwKey=="_guildWarUserDic"){
            //同步用户
            guildWarObj._guildWarUserDic = locData;
            for(var key2 in locData){
                var locData2 = locData[key2];
                guildWarObj.pushWarUserGroup(locData2.groupId,locData2);
            }
        }else{
            guildWarObj[gwKey] = locData;
        }
    }
};

//获取所有行会list
exports.getALLUserWarByGroupId = function(groupId){
    var objList = g_guildWar.getAllObj();
    var userWarList = [];
    for(var i = 0;i<objList.length;i++){
        var locObj = objList[i];
        var locList = locObj.getWarUserArrByGroupId(groupId);
        userWarList = userWarList.concat(locList);
    }
    return userWarList;
};

exports.calGuildRank = function(guildWarList){
    for(var i = 0;i<guildWarList.length;i++){
        var locWar = guildWarList[i];
        locWar.rank = i+1;
    }
};


//行会排序
exports.sortGuildWarRankList = function (list) {
    _sortGuildWarRankList(list);
    for(var i = 0;i<list.length;i++){
        var locWar = list[i];
        locWar.rank = i+1;
    }
};

var _sortGuildWarRankList = function (list) {
    //this._guildWarGroupDic
    //数据结构：[行会id,行会积分]
    var sortKeyArr = ["points", "doorLives", "lastLootTime"]; //排序规则：积分＞守卫存活数＞最后掠夺升序
    var sortType = [-1, -1, 1]; //积分降序，守卫存活数升序,最后掠夺升序
    list.sort(function (a, b) {
        for (var i = 0; i < 3; i++) {
            var type = sortType[i];
            if (a[sortKeyArr[i]] > b[sortKeyArr[i]]) {
                return type <= 0 ? -1 : 1;
            }
            else if (a[sortKeyArr[i]] < b[sortKeyArr[i]]) {
                return type <= 0 ? 1 : -1;
            }
        }
        return 0;
    });
    return list;
};

//用户排序
exports.sortUserRankList = function (list) {
    _sortUserRankList(list);
    for(var i = 0;i<list.length;i++){
        var locUserWar = list[i];
        locUserWar.rank = i+1;
    }
};

//用户排序
var _sortUserRankList = function (list) {
    //this._guildWarGroupDic
    //数据结构：[行会id,行会积分]
    var sortKeyArr = ["points", "combat"]; //排序规则：积分＞最后掠夺
    var sortType = [-1, -1]; //积分降序，最后掠夺升序
    list.sort(function (a, b) {
        for (var i = 0; i < 2; i++) {
            var type = sortType[i];
            if (a[sortKeyArr[i]] > b[sortKeyArr[i]]) {
                return type <= 0 ? -1 : 1;
            }
            else if (a[sortKeyArr[i]] < b[sortKeyArr[i]]) {
                return type <= 0 ? 1 : -1;
            }
        }
        return 0;
    });
    return list;
};

//是否在防守
exports.isInDefence = function(userId,guildWarData){
    var isIn = 0;
    for(var key in guildWarData.doorData){
        var locDoorData = guildWarData.doorData[key];
        if(locDoorData.userId == userId){
            isIn = 1;
            break;
        }
    }
    return isIn;
};

//获取战斗剩余cd
exports.getFightReCd = function(nextFightTime){
    //参数5：攻打CD（秒）
    if(!nextFightTime) return 0;
    nextFightTime = new Date(nextFightTime);
    var reSenconds = (new Date()).getSecondsBetween(nextFightTime);
    if(reSenconds<=0) reSenconds = 0;
    return reSenconds;
};

//获取存活行会数
exports.getLiveGuildNum = function(guildWarList){
    var liveNum = 0;
    for(var i = 0 ;i<guildWarList.length;i++){
        var locGuildWar = guildWarList[i];
        if(locGuildWar.doorLives>0){
            liveNum++;
        }
    }
    return liveNum;
};

//计算英雄属性
exports.calHeroProp = function(heroList){
    var attackValue = t_otherBuff[c_prop.otherBuffIdKey.inspireGuildWar].addHurt;
    //34
    for(var i = 0;i<heroList.length;i++){
        var locHero = heroList[i];
        var locAttack = locHero.propArr[34]||0;
        locHero.propArr[34] = locAttack*(1+attackValue/10000);
    }
};

//获取守门userId
exports.getDoorDataUserId = function(doorData){
    if(doorData.userId) return doorData.userId;
    if(doorData.lastDownTime){
        doorData.lastDownTime = new Date(doorData.lastDownTime);
        if(doorData.lastDownTime.getSecondsBetween(new Date())<5){
            return doorData.lastUserId;
        }
    }
    return 0;
};

//获得的积分
exports.getGetPoints = function(isWin,eDoorData){
    var getPoints = isWin?c_game.guildWar[2]:c_game.guildWar[3];
    if(getPoints>eDoorData.hp) getPoints = eDoorData.hp;
    return getPoints;
};

//获取开启开始时间
exports.getOpenStartTime = function(){
    var  gCfg = g_gameConfig.getData();
    //[开始月，开始日，开始时间，结束时间]
    var startTime = new Date();
    startTime.clearTime();
    startTime.setMonth(gCfg.guildWarOpen[0]-1);
    startTime.setDate(gCfg.guildWarOpen[1]);
    startTime.addHours(gCfg.guildWarOpen[2]);
    //startTime = new Date("2016-04-28 01:53:00");
    return startTime;
};


//获取开启结束时间
exports.getOpenEndTime = function(){
    var  gCfg = g_gameConfig.getData();
    var endTime = new Date();
    endTime.clearTime();
    endTime.setMonth(gCfg.guildWarOpen[0]-1);
    endTime.setDate(gCfg.guildWarOpen[1]);
    endTime.addHours(gCfg.guildWarOpen[3]);
    //endTime = new Date("2016-04-28 17:10:00");
    return endTime;
};


/**
 * 获取奖励
 * @param groupId
 * @param rank
 * @param type 1、行会 2、会长 3、个人
 * @returns {{}}
 */
exports.getAwardItems = function(groupId,rank,type){
    /*
     diamond	1	钻石
     wGold	2	白金
     hGold	3	黄金
     silver	4	白银
     copper	5	黄铜
     */

    var rewardData = null;
    for(var key in c_guildWarReward){
        var locData = c_guildWarReward[key];
        if(rank>=locData.rangeBeg&&rank<=locData.rangeEnd){
            rewardData = locData;
            break;
        }
    }
    if(!rewardData) return null;
    //钻石奖励物品	钻石组会长奖励	钻石组个人奖励	白金组奖励	白金组会长奖励	白金组个人奖励	黄金组奖励	黄金组会长奖励	黄金组个人奖励	白银组奖励	白银组会长奖励	白银组个人奖励	青铜组奖励	青铜组会长奖励	青铜组个人奖励
    //diamond	diamondSp	diamondUser	wgold	wgoldSp	wgoldUser	hgold	hgoldSp	hgoldUser	silver	silverSp	silverUser	copper	copperSp	copperUser
    var itemArr = [];
    switch (groupId){
        case c_prop.guildGroupKey.diamond:
            if (type == 1) {
                itemArr = rewardData.diamond
            } else if (type == 2) {
                itemArr = rewardData.diamondSp
            } else if (type == 3) {
                itemArr = rewardData.diamondUser
            }
            break;
        case c_prop.guildGroupKey.wGold:
            if (type == 1) {
                itemArr = rewardData.wgold
            } else if (type == 2) {
                itemArr = rewardData.wgoldSp
            } else if (type == 3) {
                itemArr = rewardData.wgoldUser
            }
            break;
        case c_prop.guildGroupKey.hGold:
            if (type == 1) {
                itemArr = rewardData.hgold
            } else if (type == 2) {
                itemArr = rewardData.hgoldSp
            } else if (type == 3) {
                itemArr = rewardData.hgoldUser
            }
            break;
        case c_prop.guildGroupKey.silver:
            if (type == 1) {
                itemArr = rewardData.silver
            } else if (type == 2) {
                itemArr = rewardData.silverSp
            } else if (type == 3) {
                itemArr = rewardData.silverUser
            }
            break;
        case c_prop.guildGroupKey.copper:
            if (type == 1) {
                itemArr = rewardData.copper
            } else if (type == 2) {
                itemArr = rewardData.copperSp
            } else if (type == 3) {
                itemArr = rewardData.copperUser
            }
            break;
    }
    if(!itemArr) return null;
    var reItems = {};
    for(var i=0;i<itemArr.length;i++){
        var locItemId = itemArr[i][0];
        var locItemNum = itemArr[i][1];
        locItemNum = parseInt(locItemNum)||0;
        if(locItemNum<=0) continue;
        reItems[locItemId] = locItemNum;
    }
    return reItems;
};


exports.getClientCfg = function(){
    var redisId = g_guildWar.getServerData().redisId;
    var gameConfigData = g_gameConfig.getData();
    var redisHostArr = gameConfigData.redisHostArr;

    var redisHostData = redisHostArr[redisId];
    if(!redisHostData) redisHostData = redisHostArr[0];
    var redisCfg = redisHostData.split(":");
    var cfg = {
        name : "guildWar",
        host:redisCfg[0],
        port:redisCfg[1]
    };
    return cfg;
};

