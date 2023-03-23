require("date-utils");
var uwData = require("uw-data");
var formula = require("uw-formula");
var project = require("uw-config").project;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var c_prop = uwData.c_prop;
var UserEntity = require('uw-entity').UserEntity;
var GameRecordEntity = require('uw-entity').GameRecordEntity;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var commonUtils = require("uw-utils").commonUtils;
var exports = module.exports;
var userDao = null;
var activityDao = null;

var gameRecordDao = null;
var checkRequire = function(){
    gameRecordDao = require("uw-game-record").gameRecordDao;
    userDao = require("uw-user").userDao;
    activityDao = require("uw-activity").activityDao;
};

/**
 * 记录用户每日登录次数
 * @param client
 * @param userId
 * @param cb
 */
exports.setLoginCount = function(client,userId,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var logincount = gameRecordData.loginCount || 0;
        logincount +=1;
        var updateData ={
            loginCount:logincount
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},cb);
    })
};

/**
 * 记录用户每日挑战副本次数
 * @param client
 * @param userId
 * @param cb
 */
exports.setCopyCount = function(client,userId,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var copycount = gameRecordData.copyCount||0;
        copycount +=1;
        var updateData ={
            copyCount:copycount
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},cb);
    })
};

/**
 * 记录用户每日刷野次数
 * @param client
 * @param userId
 * @param cb
 */
exports.setWipeCount = function(client,userId,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var wipecount = gameRecordData.wipeCount||0;
        wipecount +=1;
        var updateData ={
            wipeCount:wipecount
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},cb);
    })
};

/**
 * 记录用户每日pk次数
 * @param client
 * @param userId
 * @param cb
 */
exports.setPkCount = function(client,userId,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var pkcount = gameRecordData.pkCount||0;
        pkcount +=1;
        var updateData ={
            pkCount:pkcount
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},cb);
    })
};

/**
 * 记录用户每日竞技场pk次数
 * @param client
 * @param userId
 * @param cb
 */
exports.setJjcPkCount = function(client,userId,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var jjcpkcount = gameRecordData.jjcPkCount||0;
        jjcpkcount +=1;
        var updateData ={
            jjcPkCount:jjcpkcount
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},cb);
    })
};


exports.setChallengeCupPkCount = function(client, userId, cb){
    _getTodayRecord(client, userId, function(err, gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var challengeCupPkCount = gameRecordData.challengeCupPkCount||0;
        challengeCupPkCount += 1;
        var updateData = {
            challengeCupPkCount:  challengeCupPkCount
        }
        //*************************************************************/
        gameRecordDao.update(client, updateData, {id:id},cb)
    })
}

/**
 * 记录用户每日充值记录
 * @param client
 * @param userId
 * @param rechargeId
 * @param payMoney
 * @param cb
 */
exports.setRecharge = function(client,userId,rechargeId,payMoney,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var rechargecount = gameRecordData.rechargeCount||0;
        var rechargesum = gameRecordData.rechargeSum||0;
        var rechargerecord = gameRecordData.rechargeRecord[rechargeId]||0;
        rechargecount +=1;
        rechargesum +=payMoney;
        gameRecordData.rechargeRecord[rechargeId] = rechargerecord + payMoney;
        var updateData ={
            rechargeCount:rechargecount,
            rechargeSum:rechargesum,
            rechargeRecord:gameRecordData.rechargeRecord
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},cb);
    })
};

/**
 * 记录用户每日商店记录
 * @param client
 * @param userId
 * @param shopId
 * @param sum
 * @param cb
 */
exports.setShopRecord = function(client,userId,shopId,sum,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var daycount = !gameRecordData.shopRecord[shopId]?0:gameRecordData.shopRecord[shopId][0];
        var count = !gameRecordData.shopRecord[shopId]?0:gameRecordData.shopRecord[shopId][1];
        daycount += 1;
        count += sum;
        gameRecordData.shopRecord[shopId] = [daycount,count];
        var updateData ={
            shopRecord:gameRecordData.shopRecord
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},cb);
    })
};

/**
 * 记录用户每日消耗金币记录
 * @param client
 * @param userId
 * @param costGoldId
 * @param costGoldCount
 * @param cb
 */
exports.setCostGoldRecord = function(client,userId,costGoldId,costGoldCount,cb){
    checkRequire();
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        if(costGoldCount == null) costGoldCount = 0;
        var costgoldcount = gameRecordData.costGoldRecord[costGoldId]||0;
        gameRecordData.costGoldRecord[costGoldId] = costgoldcount + costGoldCount;
        var updateData ={
            costGoldRecord:gameRecordData.costGoldRecord
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},cb);
    })
};

/**
 *记录用户每日消耗钻石记录
 * @param client
 * @param userId
 * @param costDiamondId
 * @param costDiamondCount
 * @param cb
 */
exports.setCostDiamondRecord = function(client,userId,costDiamondId,costDiamondCount,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var costdiamondcount = gameRecordData.costDiamondRecord[costDiamondId]||0;
        gameRecordData.costDiamondRecord[costDiamondId] = costdiamondcount + costDiamondCount;
        var updateData ={
            costDiamondRecord:gameRecordData.costDiamondRecord
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},function(err, data){
            if (err) return cb(err);
            _recordActivityDiamond(client, userId, costDiamondId,costDiamondCount, cb);
        });
    })
};

/**
 *记录用户每日消耗钻石记录
 * @param client
 * @param userId
 * @param costDiamondId
 * @param costDiamondCount
 * @param cb
 */
exports.setCostDiamondRecord1 = function(client,userId,costDiamondId,costDiamondCount,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var costdiamondcount = gameRecordData.costDiamondRecord1[costDiamondId]||0;
        gameRecordData.costDiamondRecord1[costDiamondId] = costdiamondcount + costDiamondCount;
        var updateData ={
            costDiamondRecord1:gameRecordData.costDiamondRecord1
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},function(err, data){
            if (err) return cb(err);
            _recordActivityDiamond(client, userId, costDiamondId,costDiamondCount, cb);
        });
    })
};

/**
 *记录用户每日消耗钻石记录
 * @param client
 * @param userId
 * @param costDiamondId
 * @param costDiamondCount
 * @param cb
 */
exports.setCostDiamondRecord2 = function(client,userId,costDiamondId,costDiamondCount,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var costdiamondcount = gameRecordData.costDiamondRecord2[costDiamondId]||0;
        gameRecordData.costDiamondRecord2[costDiamondId] = costdiamondcount + costDiamondCount;
        var updateData ={
            costDiamondRecord2:gameRecordData.costDiamondRecord2
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},function(err, data){
            if (err) return cb(err);
            _recordActivityDiamond(client, userId, costDiamondId,costDiamondCount, cb);
        });
    })
};

/**
 * 记录用户每日获取钻石记录
 * @param client
 * @param userId
 * @param getDiamondId
 * @param getDiamondCount
 * @param cb
 */
exports.setDiamondRecord = function(client,userId,getDiamondId,getDiamondCount,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var getdiamondcount = gameRecordData.getDiamondRecord[getDiamondId]||0;
        gameRecordData.getDiamondRecord[getDiamondId] = getdiamondcount + getDiamondCount;
        var updateData ={
            getDiamondRecord:gameRecordData.getDiamondRecord
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},cb);
    })
};

/**
 * 记录用户每日获取钻石记录
 * @param client
 * @param userId
 * @param getDiamondId
 * @param getDiamondCount
 * @param cb
 */
exports.setDiamondRecord1 = function(client,userId,getDiamondId,getDiamondCount,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var getdiamondcount = gameRecordData.getDiamondRecord1[getDiamondId]||0;
        gameRecordData.getDiamondRecord1[getDiamondId] = getdiamondcount + getDiamondCount;
        var updateData ={
            getDiamondRecord1:gameRecordData.getDiamondRecord1
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},cb);
    })
};


/**
 * 记录用户每日获取钻石记录
 * @param client
 * @param userId
 * @param getDiamondId
 * @param getDiamondCount
 * @param cb
 */
exports.setDiamondRecord2 = function(client,userId,getDiamondId,getDiamondCount,cb){
    _getTodayRecord(client,userId,function(err,gameRecordData){
        if(err) return cb(err);
        //*************************************************************/
        var id = gameRecordData.id;
        var getdiamondcount = gameRecordData.getDiamondRecord2[getDiamondId]||0;
        gameRecordData.getDiamondRecord2[getDiamondId] = getdiamondcount + getDiamondCount;
        var updateData ={
            getDiamondRecord2:gameRecordData.getDiamondRecord2
        };
        //*************************************************************/
        gameRecordDao.update(client,updateData,{id:id},cb);
    })
};
/*****************************************************************************************************/
var _getTodayRecord = function(client,userId,cb){
    checkRequire();
    gameRecordDao.select(client," userId = ? and recordTime = ?",[userId,(new Date()).toFormat("YYYY-MM-DD")],function
        (err,gameRecordData){
        if(err) return cb(err);
        if(gameRecordData){
            cb(null,gameRecordData);
        }else{
            var gameRecordEntity = new GameRecordEntity();
            gameRecordEntity.userId = userId;
            gameRecordEntity.rechargeRecord = {};
            gameRecordEntity.shopRecord = {};
            gameRecordEntity.costGoldRecord = {};
            gameRecordEntity.costDiamondRecord = {};
            gameRecordEntity.getDiamondRecord = {};
            gameRecordEntity.recordTime = (new Date()).toFormat("YYYY-MM-DD");
            gameRecordEntity.serverId =  project.serverId;
            gameRecordDao.insert(client, gameRecordEntity,function(err, data){
                if (err) return cb(err);
                gameRecordEntity.id = data.insertId;
                cb(null,gameRecordEntity);
            });
        }
    });
};

var _recordActivityDiamond = function(client, userId, costDiamondId, costDiamond, cb){
    async.parallel([
        function(cb1){
            var strWhere = " type = ? and isOpen = 1 and ( startTime is null or (startTime <? and endTime>?)) order by sort desc";
            var args = [c_prop.activityTypeKey.rebate,new Date(),new Date()];
            activityDao.list(client,strWhere, args,cb1);
        },
        function(cb1){
            userDao.select(client, {id: userId}, cb1);
        }
    ], function(err, data){
        if(err) return cb(err);
        var activityList = data[0];
        var userData = data[1];
        var activity = userData.activity || {};
        async.map(activityList,function(activityData,cb1) {
            var userActivity = activity[activityData.id] || [];
            var allCost = userActivity[0] || 0;
            if (activityData.exValues2.length > 0 && activityData.exValues2.indexOf(parseInt(costDiamondId)) == -1){
                costDiamond = 0;
            }
            allCost += costDiamond;
            userActivity[0] = allCost;
            activity[activityData.id] = userActivity;
            cb1(null);
        },function(err, data){
            if(err) return cb(err);
            var updateUser = {
                activity: userData.activity
            }
            userDao.update(client, updateUser,{id:userId}, cb);
        })
    });
}