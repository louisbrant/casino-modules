/**
 * Created by Administrator on 14-9-25.
 */
var c_game = require("uw-data").c_game;
var c_bossParameter = require("uw-data").c_bossParameter;
var c_bossWorld = require("uw-data").c_bossWorld;
var c_prop = require("uw-data").c_prop;
var bossUtils = require("./bossUtils");

var BossObj = function () {
    //整个服务器掉落的缓存
    this._bossData = {};
    this._userDic = {};
    this._rankUserList = [];
    this._isOpen = false;
    this._guildDic = {};
    this._timeOutId = null;
    this._rankRefreshTime = null;
    this._bossId = null;//

    this.initBossId = function(bossId){
        this._bossId = bossId;
    };

    this.getBossId = function(){
        return this._bossId;
    };

    this.getBossType = function(){
        if (c_bossParameter[this._bossId]) return c_prop.worldBossTypeKey.guild;
        if (c_bossWorld[this._bossId]) return c_prop.worldBossTypeKey.world;
        return "未知类型";
    };

    //重置数据
    this.reset = function () {
        this._bossData = {};
        this._userDic = {};
        this._rankUserList = [];
        this._isOpen = false;
        this._guildDic = {};
        this._rankRefreshTime = null;
        if (this._timeOutId) {
            clearTimeout(this._timeOutId);
            this._timeOutId = null;
        }
    };

    //是否进行中
    this.isOpen = function () {
        return this._isOpen;
    };

    /**
     * 初始化
     */
    this.openBoss = function (bossOpt, setOverFun) {
        this.reset();
        this._isOpen = true;
        var boss = new BossData();
        boss.originHp = bossOpt.originHp;
        boss.curHp = bossOpt.curHp;
        boss.bossId = bossOpt.bossId;//boss的id
        boss.bossName = bossOpt.bossName;//boss的id
        boss.startTime = bossOpt.startTime;
        boss.endTime = bossOpt.endTime;
        boss.callUserId = bossOpt.callUserId;
        boss.callUserName = bossOpt.callUserName;
        boss.callUserGuildName = bossOpt.callUserGuildName;
        boss.callUserGuildId = bossOpt.callUserGuildId;
        boss.type = bossOpt.type;
        boss.isLock = bossOpt.isLock;
        boss.originBossId = bossOpt.originBossId;
        boss.isRepeat = bossOpt.isRepeat;

        this._bossData = boss;

        //如果是行会boss，boss会逃跑
        if(bossOpt.type==c_prop.worldBossTypeKey.guild){
            var reTime = this._getReDisappearSeconds(bossOpt.bossId);
            //reTime = 30;
            this._timeOutId = setTimeout(setOverFun, reTime * 1000);
        }
        return boss;
    };

    /**
     * 初始化世界boss
     */
    this.openWorldBoss = function (bossOpt,setOverFun) {
        this.reset();
        this._isOpen = true;
        var boss = new BossData();
        boss.originHp = bossOpt.originHp;
        boss.curHp = bossOpt.curHp;
        boss.bossId = bossOpt.bossId;//boss的id
        boss.bossName = bossOpt.bossName;//boss的id
        boss.startTime = bossOpt.startTime;
        boss.endTime = bossOpt.endTime;
        boss.type = bossOpt.type;
        boss.originBossId = bossOpt.originBossId;

        this._bossData = boss;

        var reTime = this._getReDisappearSeconds(bossOpt.bossId);
        //reTime = 30;
        this._timeOutId = setTimeout(setOverFun, reTime * 1000);
        return boss;
    };

    //获取公会数据
    this.getGuildData = function (guildId) {
        var guildData = this._guildDic[guildId];
        if (!guildData) {
            guildData = new GuildData();
            guildData.guildId = guildId;
            this._guildDic[guildId] = guildData;
        }
        return guildData;
    };

    //设置公会数据
    this.setGuildData = function (guildId, data) {
        this._guildDic[guildId] = data;
    };

    /**
     * 获取bossData
     * @returns {{}}
     */
    this.getBossData = function () {
        return this._bossData;
    };

    //获取伤害排行数据
    this.getRankUserList = function () {
        if (!this._rankRefreshTime) {
            this._rankRefreshTime = new Date();
        }
        if (this._rankRefreshTime && this._rankRefreshTime.getSecondsBetween(new Date()) > 5) {
            this.calDpsRank();
            this._rankRefreshTime = new Date();
        }
        if (this._rankUserList.length <= 0) this.calDpsRank();

        return this._rankUserList;
    };

    //获取用户数据
    this.getUserData = function (userId) {
        var userData = this._userDic[userId];
        if (!userData) {
            userData = new UserData();
            userData.userId = userId;
            userData.hurt = 0;
            userData.rank = 0;
            this._userDic[userId] = userData;
        }
        return userData;
    };

    this.hasUserData = function (userId) {
        var userData = this._userDic[userId];
        if (userData) {
            return true;
        } else {
            return false;
        }
    };

    //设置用户数据
    this.setUserData = function (userId, data) {
        this._userDic[userId] = data;
    };

    //获取所有数据
    this.getAllUserData = function () {
        return this._userDic;
    };


    //获取伤害排行        [UserData,UserData.....]
    this.calDpsRank = function () {
        var list = [];
        for (var key in this._userDic) {
            var userData = this._userDic[key];
            var hurt = userData.hurt || 0;
            if (hurt <= 0) continue;
            list.push([userData.userId, hurt]);
        }
        list = this._sortList(list);
        var rank = 0;
        var returnArr = [];
        for (var i = 0; i < list.length; i++) {
            rank++;
            var userId = list[i][0];
            this._userDic[userId].rank = rank;
            returnArr.push(this._userDic[userId]);
        }
        this._rankUserList = returnArr;
    };

    //排序
    this._sortList = function (list) {
        //数据结构：[id,伤害]
        var sortIdx = [1, 0]; //排序规则：伤害＞id
        var sortType = [-1, 1]; //id升序，伤害降序
        list.sort(function (a, b) {
            for (var i = 0; i < 2; i++) {
                var type = sortType[i];
                if (a[sortIdx[i]] > b[sortIdx[i]]) {
                    return type <= 0 ? -1 : 1;
                }
                else if (a[sortIdx[i]] < b[sortIdx[i]]) {
                    return type <= 0 ? 1 : -1;
                }
            }
            return 0;
        });
        return list;
    };

    //获取剩余消失时间
    this._getReDisappearSeconds = function (bossId) {
        var diffSeconds = 0;
        if(this.getBossType()==c_prop.worldBossTypeKey.guild){
            var c_bossData = c_bossParameter[bossId];
            var startTime = this._bossData.startTime;
            //timeLimit
            var aliveTime = c_bossData.timeLimit;
            diffSeconds = (new Date()).getSecondsBetween(startTime.clone().addSeconds(aliveTime));
        } else if(this.getBossType()==c_prop.worldBossTypeKey.world){
            var endTime =bossUtils.getWorldOpenEndTime(bossId);
            diffSeconds = (new Date()).getSecondsBetween(endTime);
        }
        diffSeconds = diffSeconds > 0 ? diffSeconds : 0;
        return diffSeconds;
    };
};


var GuildData = function () {
    this.guildId = null;//行会id
    this.inspireRecordArr = [];//鼓舞记录 [玩家名，玩家名....]
    this.inspireEndTime = new Date();//鼓舞结束时间
    this.inspireNum = 0;//鼓舞次数
    this.fightUserIds = [];
};

var UserData = function () {
    this.userId = null;
    this.userName = null;//用户名
    this.hurt = 0;//伤害
    this.rank = 0;//排名
    this.isStartFight = false;//是否开始战斗userData
    this.guildName = "";//公会名
    this.icon = null;//头像
    this.vip = null;//排名
    this.lastHurtTime = null;//最后一次伤害时间
    this.heroMaxHurt = {};//英雄对怪物的最大伤害
    this.myKey = 0 | Math.random() * 1000;//字符串
    this.isFirstStart = 1;
};

//缓存对象
var BossData = function () {
    this.originHp = 0;//原始生命值
    this.curHp = 0;//当前hp
    this.bossId = null;//boss的id
    this.bossName = null;//boss名称
    this.killUserId = null;//击杀人的id
    this.killUserName = null;//击杀人的名字
    this.deathTime = null;//死亡时间
    this.startTime = null;//开始时间
    this.endTime = null;//结束时间
    this.callUserId = null;//召唤者id
    this.callUserName = null;//召唤者名字
    this.callUserGuildName = null;//召唤者公会名
    this.callUserGuildId = null;//召唤者公会id
    this.isOver = 0;
    this.type = 0;//世界boss类型
    this.sendNoHpMsgArr = [];
    this.isLock = null;
    this.originBossId = null;//boss的起始id
    this.sendTreasureMsgArr = [];
    this.isRepeat = 0;
};

module.exports = BossObj;