/**
 * Created by John on 2016/4/14.
 */
var async = require("async");
var uwData = require("uw-data");
var c_msgCode = uwData.c_msgCode;
var c_prop = uwData.c_prop;
var c_game = uwData.c_game;
var t_item = uwData.t_item;
var t_treasure = uwData.t_treasure;
var getMsg = require("uw-utils").msgFunc(__filename);
var userUtils = require("uw-user").userUtils;
var treasureDao = require("../dao/treasureDao");
var treasureRecordDao = require("../dao/treasureRecordDao");
var g_data = require("uw-global").g_data;
var g_guild = require("uw-global").g_guild;
var g_incognito = require("uw-global").g_incognito;
var ds = require("uw-ds").ds;
var formula = require("uw-formula");
var uwClient = require("uw-db").uwClient;
var mailBiz = require("uw-mail").mailBiz;
var TreasureEntity = require("uw-entity").TreasureRecordEntity;
var chatBiz  =  require("uw-chat").chatBiz;
var userDao = null;
var pkOutDao = null;
var pkOutUtils = null;
var pkOutBiz = null;
var kickTime = 3;

var checkRequire = function () {
    userDao = userDao || require("uw-user").userDao;
    pkOutDao = pkOutDao || require("uw-pkOut").pkOutDao;
    pkOutUtils = pkOutUtils||require("uw-pkOut").pkOutUtils;
    pkOutBiz = pkOutBiz || require("uw-pkOut").pkOutBiz;
};
var exports = module.exports;
exports.spies = function(client, userId, cb){
    checkRequire();
    var kickDate = g_incognito.getKickTime(userId);
    var now = new Date();
    if(kickDate){
        if(now - kickDate <= kickTime){
            return cb("操作太频繁，请稍后再试");
        }
    }
    kickDate = now;
    g_incognito.setKickTime(userId, kickDate);

    async.parallel([
            function(cb1){
                userDao.select(client, {id:userId}, cb1);
            },
            function(cb1){
                pkOutDao.select(client, {userId: userId}, cb1);
            }
        ],function(err, data){
        if(err) return cb(err);
        var userData = data[0];
        var outPkData = data[1];
        if(!userData){
            return cb("找不到玩家数据!");
        }

        if(!outPkData){
            return cb("找不到相关pk数据!");
        }
        var count = userUtils.getTodayCount(userData,c_prop.userRefreshCountKey.spies);
        var countMax = c_game.treasure[4];
        if(count && count%countMax == 0){
            var refreshTime = userUtils.getTodayRefreshTime(userData,c_prop.userRefreshCountKey.spies);
            var cd = c_game.treasure[5] || 0;
            if(refreshTime.addSeconds(cd).isAfter(now))
                return cb("cd中，请稍后再尝试");
        }
        userUtils.addTodayCount(userData, c_prop.userRefreshCountKey.spies,1);
        var costDiamond = formula.calSpies(count+1);
        if(userData.diamond < costDiamond){
            return cb(getMsg(c_msgCode.noDiamond));
        }
        userUtils.reduceDiamond(userData,costDiamond);


        pkOutUtils.calRefreshNum(outPkData);
        outPkData.todayRefreshNum++;
        for(var i=0; i< outPkData.enemyIds.length; i++){
            var enemyId = outPkData.enemyIds[i];
            g_data.addPkOutCdArr(userId, enemyId);
        }
        outPkData.enemyIds = [];
        _calEnemey(client, userData, outPkData, 3, function (err, data) {
            if(err) return cb(err);
            outPkData.freshTime = new Date();
            var updatepkOutData = {
                enemyIds: outPkData.enemyIds,
                freshTime: outPkData.freshTime,
                todayRefreshNum: outPkData.todayRefreshNum,
                todayRefreshTime: outPkData.todayRefreshTime
            };

            var updateUser = {
                counts: userData.counts,
                countsRefreshTime: userData.countsRefreshTime,
                diamond: userData.diamond,
                giveDiamond: userData.giveDiamond,
                buyDiamond: userData.buyDiamond
            };

            async.parallel([
                function (cb1) {
                    userDao.update(client, updateUser, {id: userId}, cb1);
                },
                function (cb1) {
                    pkOutDao.update(client, updatepkOutData, {id: outPkData.id}, cb1);
                }
            ], function (err, data) {
                if (err) return cb(err);
                cb(null, [updateUser, updatepkOutData, costDiamond]);
            });
        });
    });
};

exports.getExPkOutInfo = function(client, userId, cb) {
    checkRequire();
    //treasureDao.list(client, "userId = ? and isOpen = 1",[userId],function(err, treasureList){
    async.parallel([
        function(cb1){
            cb1(null);
        },
        function(cb1){
            g_incognito.getTreasureListByUserId(userId, cb1);
        }
    ],function(err, data){
        if(err) return cb(err);
        //var openTreasureList = data[0];
        var treasureList = data[1];
        var exPkOutInfo = new ds.ExPkOutInfo();
        exPkOutInfo.openTime = g_incognito.getOpenTime(userId);
        exPkOutInfo.treasureInfo = [];
        if(!treasureList){
            return cb(null, exPkOutInfo);
        }
        for(var i= 0; i < treasureList.length; i++){
            var treasurEntity = treasureList[i];
            var treasureInfo = new ds.TreasureInfo();
            treasureInfo.id = treasurEntity.id;
            treasureInfo.itemId = treasurEntity.treasureId;
            treasureInfo.openTime = treasurEntity.openTime;
            if(treasureInfo.openTime){
                if(treasurEntity.isOpen == 1) {
                    treasureInfo.status = 1;
                }else {
                    treasureInfo.status = 2;
                }
            }else {
                treasureInfo.status = 0;
            }
            exPkOutInfo.treasureInfo.push(treasureInfo);
        }
        return cb(null, exPkOutInfo);
    });

};

/****
 * 开启秘宝
 * @param client
 * @param id
 * @param cb
 */
exports.open = function(client, id, userId, cb){
    checkRequire();
    g_incognito.getTreasureInfoById(id, function(err, treasureData){
    //treasureDao.select(client, "id = ? and userId = ? and isOpen = 1",[id, userId], function(err, treasureData){
        if(err) return cb(err);
        if(!treasureData || treasureData.userId != userId){
            return cb("参数有误： "+id);
        }
        if(treasureData.openTime){
            return cb("不可重复开启");
        }
        treasureData.openTime = new Date();
        var update = {
            openTime: treasureData.openTime
        }
        g_incognito.setTreasureInfoById(id, treasureData);
        treasureDao.update(client, update, {id:id},function(err, data){
            if(err) return cb(err);
            var temp = t_treasure[treasureData.treasureId];
            if(!temp){
                return cb("数据有误")
            }
            var cd = temp.guardTime;
            g_incognito.openTreasureTimeOut(id, cd, function(){
                _dealTreasure(id);
            });
            var reData = new ds.TreasureInfo();
            reData.id = treasureData.id;
            reData.itemId = treasureData.treasureId;
            reData.openTime = treasureData.openTime;
            reData.status = 1;
            cb(null, reData);
        });
    });
};

/***
 * 插入秘宝记录
 *
 */
exports.insertTreasureRecord = function(client, recordType,userData, treasureId,items,cb) {
    var treasureEntity = new TreasureEntity();
    treasureEntity.recordType = recordType;
    treasureEntity.userId = userData.id;
    treasureEntity.userVip = userData.vip;
    treasureEntity.medalTitle = userData.medalTitle;
    treasureEntity.treasureId = treasureId;
    treasureEntity.userName  = userData.nickName;
    treasureEntity.items = items;
    var myGuildId = g_data.getGuildId(userData.userId);
    var myGuild = g_guild.getGuild(myGuildId);
    var guildName = "";
    if (myGuild) {
        guildName = myGuild.name;
    }
    treasureEntity.guildName = guildName;
    treasureEntity.recordDate = new Date();
    treasureRecordDao.insert(client, treasureEntity, cb);
};

exports.dealTreasur = function(id){
    _dealTreasure(id);
};
/***
 *合成秘宝碎片
 * @param client
 * @param userId
 * @param itemId
 * @param cb
 */
exports. compose = function(client, userId, itemId,cb){
    checkRequire();
    var itemIdArr = t_treasure[itemId].items;
    var treasureList = g_incognito.getOpenTreasureListByUserIdAndItemId(userId, itemId);
    if(!treasureList || treasureList.length <=0 ) return cb("当期无可用秘宝碎片");
    var num = treasureList.length;
    var needNum = 0;
    var chestId = 0;
    for(var i=0 ;i<itemIdArr.length; i++){
        needNum = itemIdArr[i][0];
        if(num >= needNum){
            var items = {};
            chestId = itemIdArr[i][1];
            items[chestId] = 1;
            mailBiz.addByType(client, userId, c_prop.mailTypeKey.treasureOpen, [t_item[chestId].name], items, function(err,mailData){if(err) console.log(err)});
            break
        }
    }
    var taskArr = [];
    for(var i=0; i<needNum;i++){
        var treasureData = treasureList[i];
        var update = {
            id: treasureData.id,
            isDelete:1
        }
        g_incognito.setTreasureInfoById(treasureData.id, null);
        taskArr.push(update);
    }
    async.map(taskArr,function(taskArrData,cb1) {
        var update = {
            isDelete: taskArrData.isDelete
        }
        treasureDao.update(client, update, {id:taskArrData.id},cb1);
    },function(err, data){
        if(err) return cb(err);
        userDao.select(client, {id:userId}, function(err, userData) {
            if(err) return cb(err);
            if(chestId) {//添加密文
                exports.insertTreasureRecord(client, c_prop.treasureRecordTypeKey.compose, userData, chestId, {}, function (err, insertData) {
                    if (err) return console.log(err);
                });
            }
            var delBag = {};
            userUtils.delBag(userData.bag, treasureData.treasureId, needNum);
            delBag[treasureData.treasureId] = needNum;
            var updateUser = {
                bag: userData.bag
            };
            userDao.update(uwClient, updateUser, {id: userData.id}, function (err, up) {
                if (err) return cb(err);
                g_incognito.getTreasureListByUserId(userId, function(err, treasureList){
                    if(err) return cb(err);
                    if(!treasureList){
                        return cb(null, [updateUser, []]);
                    }
                    var treasureInfoList = [];
                    for(var i= 0; i < treasureList.length; i++){
                        var treasurEntity = treasureList[i];
                        var treasureInfo = new ds.TreasureInfo();
                        treasureInfo.id = treasurEntity.id;
                        treasureInfo.itemId = treasurEntity.treasureId;
                        treasureInfo.openTime = treasurEntity.openTime;
                        if(treasureInfo.openTime){
                            if(treasureInfo.isOpen == 1) {
                                treasureInfo.status = 1;
                            }else {
                                treasureInfo.status = 2;
                            }
                        }else {
                            treasureInfo.status = 0;
                        }
                        treasureInfoList.push(treasureInfo);
                    }
                    cb(null, [delBag, treasureInfoList])
                });
            });
        });
    });
};

exports.check = function(client, userId, cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.selectCols(sClient, "id,bag", "id = ?",[userId], cb1);
        },
        function(cb1){
            treasureDao.listCols(sClient, "userId, treasureId", "isDelete = 0 and userId = ?", [userId], cb1)
        }
    ], function(err, data){
        if(err) return cb(err);
        var userData = data[0];
        var treasureList = data[1];
        if(!userData){
            return cb(null, 0);
        }
        var treasureMap = {};
        var treasurelength = 0;
        if(treasureList){
            treasurelength = treasureList.length;
        }
        for(var i=0; i<treasurelength; i++){
            var num = treasureMap[treasureList[i].treasureId] || 0;
            treasureMap[treasureList[i].treasureId] = num + 1;
        }
        var bag = userData.bag;
        var effNum = 0;
        for(var key in bag){
            var itemId = parseInt(key);
            if(itemId > 6000 && itemId < 7000){
                var insertList = [];
                var treasureNum = treasureMap[itemId] || 0;
                var num = bag[key] - treasureNum;
                var treasureEntity = new TreasureEntity();
                treasureEntity.treasureId = itemId;
                treasureEntity.userId = userData.id;
                treasureEntity.openTime = new Date();
                for(var i=0; i<num; i++){
                    insertList.push(treasureEntity);
                }
                treasureDao.insertList(client, insertList, function (err, data) {
                    if (err) return cb(err);
                    if(!data) return cb(null, 0);
                    var insertId = data.insertId;
                    var affectedRows = data.affectedRows;
                    for(var i = 0; i<affectedRows; i++) {
                        var newO = _cloneOBj(treasureEntity);
                        newO.id = i+insertId;
                        newO.openTime = new Date();
                        newO.item = null;
                        g_incognito.setTreasureInfoById(newO.id, newO);
                        g_incognito.setTreasureOpenTimeOut(newO);
                    }
                    effNum += affectedRows;
                });
            }
        }
        cb(null, effNum);
    })
}
/********************************************************************************************/
var _dealTreasure = function(id){
    /************************************/
    checkRequire();
    g_incognito.getTreasureInfoById(id, function(err, data){
        if(err || !data) return console.log("g_incognito.getTreasureInfoById");
        var userId = data.userId;
        var treasureData = t_treasure[data.treasureId];
        var lootItems = treasureData.items;
        var items = {};
        var temp = 0;
        var locItemId = 0;
        /*if(lootItems) {
            var rand = Math.random() * 10000;
            for(var i = 0;i<lootItems.length;i++) {
                var locId = parseInt(lootItems[i][0]);
                var locNum = parseInt(lootItems[i][1]);
                var locRate = lootItems[i][2];
                if (!locId) continue;
                temp += locRate;
                if (rand < temp) {
                    items[locId] = locNum;
                    locItemId = locId;
                    break;
                }
            }
        }
        mailBiz.addByType(uwClient, userId, c_prop.mailTypeKey.treasureOpen, [], items, function(err,mailData){if(err) console.log(err)});
        userDao.select(uwClient, {id:userId}, function(err, userData){
            if(err) return console.log(err);
            chatBiz.addSysData(76, [treasureData.name, userData.nickName, t_item[locItemId].name, data.treasureId, userData.id]);
            exports.insertTreasureRecord(uwClient, c_prop.treasureRecordTypeKey.openTreasure, userData, data.treasureId ,items,function(err, insertData) {if(err) return console.log(err);});
            userUtils.delBag(userData.bag,data.treasureId,1);
            var update =  {
                bag : userData.bag
            };
            userDao.update(uwClient, update, {id:userData.id}, function(err, up){if(err){console.log(err);}});
        });*/
        data.isOpen = 0;
        //g_incognito.setTreasureInfoById(id, null);
        g_incognito.setTreasureInfoById(id, data);
        var update = {
            isOpen : 0,
            openTime:data.openTime
        }
        treasureDao.update(uwClient, update, {id:id},function(err, up){if(err){console.log(err)}});
    });
};


var _calEnemey = function (client, userData, outPkData, num, cb) {
    _calOneEnemey(client, userData, outPkData, num,g_incognito.getIncognitoIds(),function(err, data){
        if(err) return cb(err);
        console.log("**********************");
        console.log(outPkData.enemyIds);
        return cb(null);
    });
}

var _calOneEnemey = function (client, userData, outPkData, num,ignoreIds ,cb) {
    var num2 = 0;
    for(var i=0; i<num; i++) {
        var randNum = _getRandomNumber(0, 100);
        var treasureRand = c_game.treasure[0];
        if (randNum < treasureRand) {
            var cdIds = _getPkCdIds(userData.id);
            var cdId2 = g_incognito.getIncognitoIds();
            ignoreIds.push(userData.id);
            ignoreIds =ignoreIds.concat(outPkData.enemyIds);
            ignoreIds = ignoreIds.concat(cdIds);
            ignoreIds = ignoreIds.concat(cdId2);
            var treasureList =  g_incognito.getListTreasur(ignoreIds);
            if(treasureList.length == 0){
                break;
            }else{
                var userId = treasureList[0].userId;
                outPkData.enemyIds.push(userId);
                ignoreIds.push(userId)
                num2++;
            }
        }
    }
    var leftNum = num - num2;
    if(leftNum <= 0){
        cb(null);
    }else {
        pkOutBiz.exCalEnemey(client, userData, outPkData, leftNum, cb);
    }


    /*var randNum = _getRandomNumber(0, 100);
    var treasureRand = c_game.treasure[0];
    if (randNum < treasureRand) {
        console.log(ignoreIds);
        var cdIds = _getPkCdIds(userData.id);
        var cdId2 = g_incognito.getIncognitoIds();
        ignoreIds.push(userData.id);
        ignoreIds =ignoreIds.concat(outPkData.enemyIds);
        ignoreIds = ignoreIds.concat(cdIds);
        ignoreIds = ignoreIds.concat(cdId2);
        g_incognito.listTreasur(ignoreIds,function(err,treasureList){
        //treasureDao.list(client, "isOpen =1 and userId not in (?)",ignoreIds, function(err, treasureList){
            if(err) return cb(err);
            if(treasureList.length == 0){
                pkOutBiz.exCalEnemey(client, userData, outPkData, num, cb);
            }else {
                var userId = treasureList[0].userId;
                outPkData.enemyIds.push(userId);
                ignoreIds.push(userId)
                cb(null, ignoreIds);
            }
        })
    } else {
        pkOutBiz.exCalEnemey(client, userData, outPkData, num, cb);
    }*/
}

var _getPkCdIds = function (userId) {
    var pkOutCdArr = g_data.getPkOutCdArr(userId);
    var cd = c_game.treasure[12] || c_game.treasure[2] || 0;
    var reList = [];
    for (var i = 0; i < pkOutCdArr.length; i++) {
        var locData = pkOutCdArr[i];
        var locDate = locData[1];
        if (locDate.getSecondsBetween(new Date()) >= cd) {
            pkOutCdArr.splice(i, 1);
            i--;
        }
    }

    for (var i = 0; i < pkOutCdArr.length; i++) {
        var locData = pkOutCdArr[i];
        var locId = locData[0];
        reList.push(locId);
    }

    g_data.setPkOutCdArr(userId, pkOutCdArr);

    return reList;
};

//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};

//深拷贝对象
var _cloneOBj = function(obj) {
    var newO = {};
    if(obj instanceof Array){
        newO = [];
    }
    for(var key in obj){
        var val = obj[key];
        newO[key] = typeof val === 'object' ? arguments.callee(val) : val;
    }
    return newO;
}
