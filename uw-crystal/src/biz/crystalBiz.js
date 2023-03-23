/**
 * Created by Administrator on 2014/5/16.
 */

var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var crystalDao = require("./../dao/crystalDao");
var CrystalEntity = require("uw-entity").CrystalEntity;
var crystalUtils = require("./crystalUtils.js");
var commonUtils = require("uw-utils").commonUtils;
var c_crystal = require("uw-data").c_crystal;
var userDao = require("uw-user").userDao;
var userUtils = require("uw-user").userUtils;
var consts = require("uw-data").consts;
var c_game = require("uw-data").c_game;
var c_msgCode = require("uw-data").c_msgCode;
var exports = module.exports;


/**
 * 获取数据
 * @param client
 * @param userId
 * @param hp 剩余血量
 * @param hpNum 剩余血了条数
 * @param nextReplayTime 下一次恢复时间
 * @param cb
 */
exports.saveProgress = function (client, userId, hp, hpNum, nextReplayTime, cb) {
    if(!nextReplayTime) nextReplayTime = null;
    exports.getCrystalData(client, userId, function (err, crystalData) {
        if (err) return cb(err);
        var updateData = {
            crystalHp: hp,
            crystalHpNum: hpNum,
            nextReplayTime: nextReplayTime
        };
        crystalDao.update(client, updateData, {id:crystalData.id}, function (err, data) {
            if (err) return cb(err);
            cb(null)
        });
    });
};

//完成某个关卡
exports.finish = function (client, userId, crystalId, cb) {
    exports.getCrystalData(client, userId, function (err, crystalData) {
        if (err) return cb(err);
        if (crystalData.crystalId != crystalId) return cb("进度不一致");
        //判断是否最高等级
        var maxId = _getMaxId();

        if (crystalData.crystalId == maxId) {
            crystalData.crystalHp = 0;
            crystalData.crystalHpNum = 0;
            crystalData.nextReplayTime = null;
            crystalData.updateTime = new Date();
            crystalData.canPickIds.push(crystalId);
        } else {
            var nextId = crystalData.crystalId + 1;
            nextId = nextId > maxId ? maxId : nextId;
            var c_crystalData = c_crystal[nextId];
            crystalData.crystalId = nextId;
            crystalData.crystalHp = c_crystalData.hp;
            crystalData.crystalHpNum = c_crystalData.hpNum;
            crystalData.nextReplayTime = null;
            crystalData.updateTime = new Date();
            crystalData.canPickIds.push(crystalId);
        }

        var updateData = {
            crystalId: crystalData.crystalId,
            crystalHp: crystalData.crystalHp,
            crystalHpNum: crystalData.crystalHpNum,
            nextReplayTime: crystalData.nextReplayTime,
            updateTime: crystalData.updateTime,
            canPickIds: crystalData.canPickIds
        };
        crystalDao.update(client, updateData,{id:crystalData.id}, function (err, data) {
            if (err) return cb(err);
            cb(null, updateData);
        });
    });
};

//获取数据
exports.getCrystalData = function (client, userId, cb) {
    crystalDao.select(client, {userId: userId}, function (err, crystalData) {
        if (err) return cb(err);
        if (crystalData) {
            crystalData.crystalHp = Math.ceil(crystalData.crystalHp);
            _calReplayTime(crystalData);
            cb(null, crystalData);
        } else {
            var crystalEntity = new CrystalEntity();
            /** 用户id **/
            crystalEntity.userId = userId;
            /*用户id*/
            /** 当前水晶id **/
            crystalEntity.crystalId = 1;
            var c_crystalData = c_crystal[1];
            /*当前水晶id*/
            /** 当前血量 **/
            crystalEntity.crystalHp = c_crystalData.hp;
            /*当前血量(注意：这是一个字符串，因为可能太长)
             */
            /** 当前血量条数 **/
            crystalEntity.crystalHpNum = c_crystalData.hpNum;
            /*当前血量条数*/
            /** 下一次回满时间 **/
            crystalEntity.nextReplayTime = null;
            /*下一次回满时间*/
            /** 可领取的水晶id组 **/
            crystalEntity.canPickIds = [];
            /*可领取的水晶id组*/
            crystalDao.insert(client, crystalEntity, function (err, data) {
                if (err) return cb(err);
                crystalEntity.id = data.insertId;
                cb(null, crystalEntity);
            });
        }
    });
};

//获取奖励
exports.pickAward = function (client, userId, crystalId, cb) {
    async.parallel([
        function (cb1) {
            exports.getCrystalData(client, userId, cb1);
        },
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var crystalData = data[0], userData = data[1];
        //判断是否可领取
        if (crystalData.canPickIds.indexOf(crystalId) <= -1) {
            return cb("不可领取");
        }
        commonUtils.arrayRemoveObject(crystalData.canPickIds,crystalId);

        //获得钻石和英雄
        var c_crystalData = c_crystal[crystalId];
        userUtils.addDiamond(userData.diamond, c_crystalData.diamond);
        //randomHero
        var locGetHeroData = userUtils.getRandomHeroData(consts.heroGetType.normal, 1, c_crystalData.randomHero, userData);
        for (var key in locGetHeroData) {
            var locHeroId = parseInt(key);
            var locHeroNum = parseInt(locGetHeroData[key]);
            userUtils.addHero(userData, locHeroId, locHeroNum);
        }

        //得到物品
        var randomItems = _getRandomItems(c_crystalData.randomItems);
        userUtils.addBag(userData.bag,randomItems);

        userUtils.calHeroRecord(userData);
        userUtils.calHeroProduceFix(userData);
        var updateData = {
            maxHeroRecord: userData.maxHeroRecord,
            heroData: userData.heroData,
            arenaData: userData.arenaData,
            attack: userData.attack,
            defence: userData.defence,
            hp: userData.hp,
            crit: userData.crit,
            heroSum:userData.heroSum,
            heroStarSum:userData.heroStarSum,
            produceFix: userData.produceFix,
            producePer: userData.producePer,
            diamond: userData.diamond,
            exData: userData.exData,
            bag: userData.bag
        };

        async.parallel([
            function (cb1) {
                crystalDao.update(client,{canPickIds:crystalData.canPickIds} ,{id:crystalData.id}, cb1);
            },
            function (cb1) {
                userDao.update(client, updateData, {id: userId}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, updateData);
        });
    });
};

//使用技能
exports.useSkill = function(client, userId, index, cb){
    exports.getCrystalData(client, userId, function(err,crystalData){
        if (err) return cb(err);
        var skillTimes = crystalData.skillTimes||[];
        skillTimes[index] = new Date();
        var updateData = {
            skillTimes:skillTimes
        };
        crystalDao.update(client,updateData ,{id:crystalData.id}, function(err,data){
            if (err) return cb(err);
            cb(null,updateData);
        });
    });
};

//重置技能cd
exports.refreshSkillCd = function(client, userId, index, cb){
    async.parallel([
        function (cb1) {
            exports.getCrystalData(client, userId, cb1);
        },
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var crystalData = data[0], userData = data[1];
        //消耗钻石
        var costDiamond = c_game.crystalCfg[3];
        if(userData.diamond<costDiamond){
            return cb(getMsg(c_msgCode.noDiamond));
        }
        userUtils.reduceDiamond(userData,costDiamond);
        //刷新时间
        var skillTimes = crystalData.skillTimes||[];
        skillTimes[index] = null;

        var updateData = {
            skillTimes:skillTimes
        };
        var updateUserData = {
            diamond:userData.diamond,
            record: userData.record
        };

        async.parallel([
            function (cb1) {
                crystalDao.update(client,updateData ,{id:crystalData.id},cb1);
            },
            function (cb1) {
                userDao.update(client, updateUserData,{id: userId}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null,[updateData,costDiamond]);
        });
    });
};

//获取超过的百分比
exports.getBeyondPer = function(client,crystalId,cb){
    async.parallel([
        function (cb1) {
            crystalDao.getCount(client, " 1=1 ", [],cb1);
        },
        function (cb1) {
            crystalDao.getCount(client, " crystalId <?", [crystalId],cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var allCount = data[0], beyondCount = data[1];
        if(beyondCount<=0) beyondCount = 1;
        if(allCount<=0) allCount = 1;
        var per =  parseInt(beyondCount/allCount*100);
        cb(null,per);
    });
};

/**************************************private*********************************************/
//获取随机的物品
var _getRandomItems = function (randomItems) {
    var ret = {};
    var random = Math.random()*10000;
    for (var i = 0; i < randomItems.length; i++) {
        var locCreate = randomItems[i];
        if (random <= locCreate[2]) {
            ret[locCreate[0]] = locCreate[1];
            break;
        }
    }
    return ret;
};

var _calReplayTime = function (crystalData) {
    if (crystalData.nextReplayTime) {
        if (crystalData.nextReplayTime.isBefore(new Date)) {
            var c_crystalData = c_crystal[crystalData.crystalId];
            crystalData.crystalHp = c_crystalData.hp;
            crystalData.crystalHpNum = c_crystalData.hpNum;
            crystalData.nextReplayTime = null;
        }
    }
};

var _getMaxId = function () {
    var keys = Object.keys(c_crystal);
    return keys[keys.length - 1];
};

