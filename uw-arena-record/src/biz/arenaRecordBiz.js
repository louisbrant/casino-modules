/**
 * Created by Administrator on 2014/5/9.
 */
var uwData = require("uw-data");
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var t_item = uwData.t_item;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var propUtils = require("uw-utils").propUtils;

var exports = module.exports;
var arenaRecordDao = require("../dao/arenaRecordDao");
var ds = require("uw-ds").ds;
var g_data = require("uw-global").g_data;

var ArenaRecordEntity = require("uw-entity").ArenaRecordEntity;

var userUtils;
var userDao;
var pkOutDao;
var checkRequire = function(){
    userUtils = require("uw-user").userUtils;
    userDao = require("uw-user").userDao;
    pkOutDao = require("uw-pkOut").pkOutDao;
};

//获取记录
exports.getPkRecordList = function(client,userId,index,count, cb){
    checkRequire();
    arenaRecordDao.list(client," (userId=? or enemyId=?) and fightType = ? order by id desc limit ?,? ",[userId,userId,c_prop.fightTypeKey.pk,index,count],function(err,arenaRecordList){
        if(err) return cb(err);

        for(var i=0;i<arenaRecordList.length;i++){
            var locRecord = arenaRecordList[i];
            if(locRecord.enemyId==userId){
                locRecord.enemyId = locRecord.userId;
                locRecord.enemyLvl = locRecord.userLvl;
                locRecord.enemyName = locRecord.userName;
                locRecord.enemyIconId = locRecord.userIconId;
                locRecord.isWin = locRecord.isWin ? 0 : 1;
                var changeRank = locRecord.fightData.changeRank||0;
                changeRank *= -1;
                locRecord.fightData.changeRank = changeRank;
            }
        }
        cb(null,arenaRecordList);
    });
};

/**
 * 获取未报仇的仇人列表
 * @param client
 * @param userId
 * @param count
 * @param cb
 */
exports.getRevengeUserIds = function(client,userId,count,cb){
    checkRequire();
    var userList = [];
    var strSql = "  enemyId = ? and isWin =1 AND isRevenge = 0 GROUP BY userId ORDER BY id DESC LIMIT 0,?";
    arenaRecordDao.listCols(client,"userId", strSql, [userId, count], function (err, dataList) {
        if(err) return cb(err);
        var userIds = [];
        for(var i = 0;i<dataList.length;i++){
            var locData = dataList[i];
            userIds.push(locData.userId);
        }
        cb(null,userIds);
    });
};

//获取记录
exports.getRankPkRecordList = function(client,userId,index,count, cb){
    checkRequire();
    arenaRecordDao.list(client," (userId=? or enemyId=?) and fightType = ? order by id desc limit ?,? ",[userId,userId,c_prop.fightTypeKey.rankPk,index,count],function(err,arenaRecordList){
        if(err) return cb(err);

        for(var i=0;i<arenaRecordList.length;i++){
            var locRecord = arenaRecordList[i];
            if(locRecord.enemyId==userId){
                locRecord.enemyId = locRecord.userId;
                locRecord.enemyLvl = locRecord.userLvl;
                locRecord.enemyName = locRecord.userName;
                locRecord.enemyIconId = locRecord.userIconId;
                locRecord.isWin = locRecord.isWin ? 0 : 1;
                var changeRank = locRecord.fightData.changeRank||0;
                changeRank *= -1;
                locRecord.fightData.changeRank = changeRank;
            }
        }
        cb(null,arenaRecordList);
    });
};


/**
 * 获取掠夺记录
 * @param client
 * @param userId
 * @param cb
 */
exports.getWinRecord = function(client,userId,cb){
    checkRequire();
    arenaRecordDao.list(client," userId = ? and isWin = 1 order by id desc limit ?",[userId,c_game.heroType[4]],function(err,dataList){
        if(err) return cb(err);
        var reList = [];
        for(var i = 0 ; i <dataList.length;i++){
            var locData = dataList[i];
            var record = new ds.HeroChangeRecord();
            record.type = 0;//0:抢夺，1:被抢
            record.fightType = locData.fightType;//1：段位赛 2：仇人榜
            record.enemyName = locData.enemyName;//名字
            record.heroData = {};//英雄改变数据
            if(locData.fightData){
                record.heroData = locData.fightData.winHeroData;
                record.gold = locData.fightData.gold||0;
            }
            record.time = locData.fightTime;//时间
            reList.push(record);
        }
        cb(null,reList);
    });
};

/**
 * 获取被抢记录
 * @param client
 * @param userId
 * @param cb
 */
exports.getLoseRecord = function(client,userId,cb){
    checkRequire();
    arenaRecordDao.list(client," enemyId = ? and isDeal = ?  and isWin = 1 order by id desc  limit ?",[userId,1,c_game.heroType[4]],function(err,dataList){
        if(err) return cb(err);
        var reList = [];
        for(var i = 0 ; i <dataList.length;i++){
            var locData = dataList[i];
            var record = new ds.HeroChangeRecord();
            record.type = 1;//0:抢夺，1:被抢
            record.fightType = locData.fightType;//1：段位赛 2：仇人榜
            record.enemyName = locData.userName;//名字
            record.heroData = {};//英雄改变数据
            if(locData.fightData){
                record.heroData = locData.fightData.winHeroData;
                record.gold = locData.fightData.gold||0;
            }
            record.time = locData.fightTime;//时间
            reList.push(record);
        }
        cb(null,reList);
    });
};

/**
 * 获取仇人PK记录
 * @param client
 * @param userId
 * @param enemyId
 * @param cb
 */
exports.getEnemyRecord = function(client,userId,enemyId,cb){
    checkRequire();
    arenaRecordDao.list(client," userId = ? and enemyId = ? and isDeal = ?  order by id desc  limit ?",[enemyId,userId,1,c_game.heroType[4]],function(err,dataList){
        if(err) return cb(err);
        var reList = [];
        for(var i = 0 ; i <dataList.length;i++){
            var locData = dataList[i];
            var record = new ds.HeroChangeRecord();
            record.type = 2;//0:抢夺，1:被抢
            record.fightType = locData.fightType;//1：段位赛 2：仇人榜
            record.enemyName = locData.userName;//名字
            record.heroData = {};//英雄改变数据
            record.isWin = !(locData.isWin||0);
            if(locData.fightData){
                record.heroData = locData.fightData.winHeroData;
                record.gold = locData.fightData.gold||0;
            }
            record.time = locData.fightTime;//时间
            reList.push(record);
        }
        cb(null,reList);
    });
};

/**
 * 处理pk
 * @param client
 * @param pkOutData
 * @param userData
 * @param fightType
 * @param cb
 * @returns [pkOutData，userData]
 */
exports.dealRecord = function(client,pkOutData,userData,fightType, cb){
    checkRequire();
    arenaRecordDao.list(client, " enemyId = ? and isDeal = ? and fightType = ? ", [userData.id, 0,fightType], function (err, dataList) {
        if (err) return cb(err);
        var losePkValue = 0;
        var loseKillValue = 0;
        var loseGold = 0;
        var loseItems = {};
        var addKillValue = 0;
        var isNew = false;
        if(dataList.length<=0) return cb(null,[pkOutData,userData,0,isNew]);
        isNew = true;
        for (var i = 0; i < dataList.length; i++) {
            var locData = dataList[i];
            if(locData.isWin){
                //被抢金币，杀戮值，装备
                if (locData.fightData) {
                    /*if(locData.fightData.killValue){
                        var killValue = locData.fightData.killValue;
                        loseKillValue+=killValue;
                    }*/

                    if(locData.fightData.pkValue){
                        //var pkValue = locData.fightData.pkValue;
                        //读取配置表
                        var pkValue = c_game.pkOutCfg[11]||0;
                        losePkValue+=pkValue;
                    }

                    //只有红名，才会被抢金币和装备
                    if(locData.fightData.ePkColor){
                        if(locData.fightData.ePkColor == c_prop.pkNameColorKey.red){
                            if(locData.fightData.gold){
                                loseGold+=locData.fightData.gold;
                            }
                            if(locData.fightData.items){
                                loseItems = propUtils.mergerProp(loseItems,locData.fightData.items);
                            }
                        }
                    }
                }
            }else{
                //不是当天之前的不结算杀戮积分
                if(locData.fightTime.isAfter((new Date()).clearTime())){
                    //防守胜利得到杀戮值
                    if (locData.fightData) {
                        if(locData.fightData.killValue){
                            var killValue = locData.fightData.killValue;
                            killValue = parseInt(killValue/2);
                            addKillValue+=killValue;
                        }
                    }
                }
            }
        }


        //杀戮值
        pkOutData.killValue -= loseKillValue;
        pkOutData.killValue += addKillValue;
        pkOutData.killValue = pkOutData.killValue < 0 ? 0 : pkOutData.killValue;

        //pk值
        pkOutData.pkValue -= losePkValue;
        pkOutData.pkValue = pkOutData.pkValue < 0 ? 0 : pkOutData.pkValue;


        //金币
        userUtils.addGold(userData,-loseGold);
        //装备
        //特殊箱子不掉落
        var pkLootCfg = c_game.pkLoot[0];
        pkLootCfg = pkLootCfg.split(",");
        var exLootItemId = parseInt(pkLootCfg[0]);
        delete loseItems[exLootItemId];

        userUtils.delItems(userData,loseItems);


        arenaRecordDao.update(client, {isDeal: 1}, " enemyId = ? and isDeal = 0 and fightType = ?", [userData.id, fightType], function (err, data) {
            if (err) return cb(err);
            g_data.setHasDealPk(userData.id,false);
            cb(null,[pkOutData,userData,loseGold,isNew]);
        });
    });
};

/**
 * 获取是否有没读的段位记录
 * @param client
 * @param userId
 * @param cb
 */
exports.getHasNotRead = function(client,userId,cb){
    checkRequire();
    arenaRecordDao.selectCols(client,"id", " enemyId = ? and isDeal = 1 and isRead = 0  and isWin = 1 and fightType = ? ", [userId,c_prop.fightTypeKey.pk], function (err, data) {
        if (err) return cb(err);
        var has = 0;
        if(data) has = 1;
        cb(null,has);
    });
};

/**
 * 设置阅读
 * @param client
 * @param userId
 * @param cb
 */
exports.setPkRead = function(client,userId,cb){
    checkRequire();
    arenaRecordDao.update(client, {isRead:1},{enemyId:userId,isRead:0,fightType:c_prop.fightTypeKey.pk}, function (err, data) {
        if (err) return cb(err);
        cb(null);
    });
};

/**
 * 获取是否有没读的段位记录
 * @param client
 * @param userId
 * @param cb
 */
exports.getHasNotReadArena = function(client,userId,cb){
    checkRequire();
    arenaRecordDao.selectCols(client,"id", " enemyId = ? and isRead = 0  and fightType = ? ", [userId,c_prop.fightTypeKey.arena], function (err, data) {
        if (err) return cb(err);
        var has = 0;
        if(data) has = 1;
        cb(null,has);
    });
};

/**
 * 设置巅峰赛阅读
 * @param client
 * @param userId
 * @param cb
 */
exports.setArenaRead = function(client,userId,cb){
    checkRequire();
    arenaRecordDao.update(client, {isRead:1},{enemyId:userId,fightType:c_prop.fightTypeKey.arena,isRead:0}, function (err, data) {
        if (err) return cb(err);
        cb(null);
    });
};



//插入记录
exports.insertRecord = function(client,userData,enemyData,fightResult,fightType,cb){
    checkRequire();
    var insertData = new ArenaRecordEntity();
    insertData.userId = userData.id;
    insertData.userLvl = userData.lvl;
    insertData.userIconId = userData.iconId;
    insertData.userName = userData.nickName;
    insertData.userWinCount = userData.pkWinCount;
    insertData.enemyId = enemyData.id;
    insertData.enemyLvl = enemyData.lvl;
    insertData.enemyIconId = enemyData.iconId;
    insertData.enemyName = enemyData.nickName;
    insertData.enemyWinCount = enemyData.pkWinCount;
    insertData.isWin = fightResult.winStatus==consts.winStatus.lose?0:1;
    insertData.fightTime = new Date();
    insertData.isRevenge = fightResult.isRevenge;

    var fightData = null;

    if (fightType == c_prop.fightTypeKey.pk||fightType == c_prop.fightTypeKey.rankPk) {
        fightData = {
            winStatus: fightResult.winStatus,
            gold: fightResult.gold,
            items: fightResult.items,
            honor: fightResult.honor,
            expc: fightResult.expc,
            killValue: fightResult.killValue,
            pkValue: fightResult.pkValue,
            mPkColor: fightResult.mPkColor,
            ePkColor: fightResult.ePkColor,
            curRank: fightResult.curRank,
            prestige: fightResult.curRank,
            changeRank: fightResult.changeRank
        };
    } else if (fightType == c_prop.fightTypeKey.arena) {
        fightData = {
            winStatus: fightResult.winStatus,
            gold: fightResult.gold,
            prestige: fightResult.prestige,
            curRank: fightResult.curRank,
            changeRank: fightResult.changeRank
        };
    } else if (fightType == c_prop.fightTypeKey.challengeCupPk) {
        fightData = {
            winStatus: fightResult.winStatus
        };
    }
    insertData.fightData = fightData;
    insertData.fightType = fightType;

    arenaRecordDao.insert(client,insertData,cb);
};