/**
 * Created by Administrator on 2014/5/16.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var c_lottery = uwData.c_lottery;
var t_itemLogic = uwData.t_itemLogic;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var t_item = uwData.t_item;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var chatBiz = require("uw-chat").chatBiz;
var LotteryEntity = require('uw-entity').LotteryEntity;

var userDao = null;
var userUtils = null;
var propUtils = null;
var lotteryDao = null;
var itemBiz = null;
var checkRequire = function(){
    userDao = require("uw-user").userDao;
    userUtils = require("uw-user").userUtils;
    propUtils = require("uw-utils").propUtils;
    lotteryDao = require("uw-lottery").lotteryDao;
    itemBiz = require("uw-item").itemBiz;
};

var ds = require("uw-ds").ds;

var exports = module.exports;

/**
 * 抽奖
 * @param client
 * @param userId
 * @param type      抽奖类型
 * @param count      抽奖次数
 * @param cb
 */
exports.lottery = function (client,userId,type,count,cb) {
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            _getRecordData(client,userId,cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], lotteryData = data[1];
        var items = {};
        var treasureValue = 0;
        var cosDiamond = 0;
        var bag = userData.bag;
        var itemsArr = [];
        var bagItems = {};
        var delBagItems = {};
        var equipBagItems = {};
        for(var i = 0; i < count; i++){
            switch(type){
                case c_prop.lotteryTypeKey.common:      //普通
                    var goldenKey = bag[c_prop.spItemIdKey.goldenKey]||0;
                    if(goldenKey > 0){      //优先扣除摸金符
                        userData.bag[c_prop.spItemIdKey.goldenKey] -= 1;
                        var sum = delBagItems[c_prop.spItemIdKey.goldenKey]||0;
                        delBagItems[c_prop.spItemIdKey.goldenKey] = sum + 1;
                        if(userData.bag[c_prop.spItemIdKey.goldenKey] == 0) delete userData.bag[c_prop.spItemIdKey.goldenKey];
                    }else{      //扣除钻石
                        cosDiamond += c_game.lotteryCostCfg[0];
                    }
                    items = propUtils.mergerProp(items,_getComLotteryObj(userData.lvl));
                    treasureValue += c_game.lotteryCostCfg[3];
                    break;
                case c_prop.lotteryTypeKey.advanced:        //高级
                    cosDiamond += c_game.lotteryCostCfg[1];
                    items = propUtils.mergerProp(items,_getAdvLotteryObj(userData.lvl));
                    treasureValue += c_game.lotteryCostCfg[4];
                    break;
                case c_prop.lotteryTypeKey.supremacy:       //至尊
                    cosDiamond += c_game.lotteryCostCfg[2];
                    items = propUtils.mergerProp(items,_getSupLotteryObj(userData.lvl));
                    treasureValue += c_game.lotteryCostCfg[5];
                    break;
                default :
                    return cb("异常");
                    break;
            }
        }

        if(userData.diamond < cosDiamond) return cb("元宝不足");
        //获得物品
        itemsArr = userUtils.saveItems(userData,items);
        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
        lotteryData.treasureValue += treasureValue;
        //钻石扣除
        userUtils.reduceDiamond(userData,cosDiamond);

        //items
        //推送系统消息(oldma)
        //第一个%s：玩家名
        //第二个%s：物品名
        for(var key in items){
            var locItemData = t_item[key];
            chatBiz.addSysData(13,[userData.nickName,locItemData.name,locItemData.color]);
            chatBiz.addSysData(14,[userData.nickName,locItemData.name,locItemData.color]);
        }


        //更新
        var updateData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag,
            prestige: userData.prestige
        };
        var updateLotData = {
            treasureValue:lotteryData.treasureValue
        };
        async.parallel([
            function (cb1) {
                userDao.update(client,updateData,{id:userId},cb1);
            },
            function (cb1) {
                lotteryDao.update(client,updateLotData,{id:lotteryData.id},cb1);
            }
        ], function (err, data1) {
            if (err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            return cb(null, [updateData,updateLotData,items,treasureValue,bagItems,delBagItems,equipBagItems,cosDiamond]);
        });
    });
};

/**
 * 领取探宝值宝箱
 * @param client
 * @param userId
 * @param cb
 */
exports.getTreasureChest = function(client,userId,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            _getRecordData(client,userId,cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], lotteryData = data[1];
        var treasureValue = lotteryData.treasureValue;     //探宝值
        var needTreValue = c_game.lotteryCostCfg[6];        //单条经验需要的探宝值
        if(treasureValue < needTreValue) return cb("探宝值不足");
        var chestId = 0;
        var treasureChestCount = lotteryData.treasureChestCount;
        var treasureChestCfg = c_game.treasureChestCfg;

        if(treasureChestCount < treasureChestCfg.length){
            chestId = c_game.treasureChestCfg[treasureChestCount];
        }else{
            chestId = c_game.treasureChestCfg[treasureChestCfg.length - 1];
        }

        var logicItems = itemBiz.calLogicItems(chestId);        //随机的物品
        //获得物品
        var itemsArr = [];
        var bagItems = {};
        var equipBagItems = {};
        itemsArr = userUtils.saveItems(userData,logicItems);
        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
        //扣除探宝值
        lotteryData.treasureValue -= needTreValue;
        //添加领取探宝值宝箱次数
        lotteryData.treasureChestCount = treasureChestCount + 1;

        //更新
        var updateData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag,
            prestige: userData.prestige
        };
        var updateLotData = {
            treasureValue:lotteryData.treasureValue,
            treasureChestCount:lotteryData.treasureChestCount
        };
        async.parallel([
            function (cb1) {
                userDao.update(client,updateData,{id:userId},cb1);
            },
            function (cb1) {
                lotteryDao.update(client,updateLotData,{id:lotteryData.id},cb1);
            }
        ], function (err, data1) {
            if (err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            return cb(null, [updateData,updateLotData,logicItems,needTreValue,bagItems,equipBagItems]);
        });
    });
};

//初始化数据
exports.getInfo = function(client,userId,cb){
    checkRequire();
    _getRecordData(client,userId,function(err,data){
        if (err) return cb(err);
        cb(null,data);
    });
};

/*****************************************************************************************************/

//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};

//判断权重获得抽奖物品
var _weigh = function(secArr,returnObj,lvl){
    //获得随机区间的权重总数
    var weightNum = 0;      //权重总数
    var weight = 0;
    var weightIdArr = [];       //随机库id
    for (var i = secArr[0]; i <= secArr[1]; i++) {
        if (!c_lottery[i]) break;
        if (lvl < c_lottery[i].needLvl) continue;
        if (lvl >= c_lottery[i].surpassLvl && c_lottery[i].surpassLvl != 0) continue;
        weightNum = weightNum + c_lottery[i].rate;
        weightIdArr.push(i);
    }
    //随机物品以及对应数量
    var eventRandomNum = _getRandomNumber(1, weightNum);
    for (var i = 0; i < weightIdArr.length; i++) {
        var locWeightId = weightIdArr[i];
        weight = weight + c_lottery[locWeightId].rate;
        if (weight >= eventRandomNum) {
            returnObj[c_lottery[locWeightId].itemId] = _getRandomNumber(c_lottery[locWeightId].minNum,c_lottery[locWeightId].maxNum);
            break;
        }
    }
}

//获取普通抽奖所得物品id  {"id":数量,"id":数量,...}
var _getComLotteryObj = function(lvl) {
    var returnObj = {};
    var pro1 = c_game.lotteryCfg[0];     //普通抽奖 库1概率
    var count = c_game.lotteryCfg[1];     //普通抽奖所得数量
    for (var ii = 0; ii < count; ii++) {
        var randomNum = _getRandomNumber(1, 10000);
        if (randomNum <= pro1) {
            var secArr = c_game.lotterySecCfg[0].split(",");
            _weigh(secArr,returnObj,lvl);
        }
    }
    return returnObj;
}

//获取高级抽奖所得物品id  {"id":数量,"id":数量,...}
var _getAdvLotteryObj = function(lvl) {
    var returnObj = {};
    var pro1 = c_game.lotteryCfg[2];     //高级抽奖 库1概率
    //var pro2 = c_game.lotteryCfg[3];     //高级抽奖 库2概率
    var count = c_game.lotteryCfg[4];     //普通抽奖所得数量
    for (var ii = 0; ii < count; ii++) {
        var secArr = [];
        var randomNum = _getRandomNumber(1, 10000);
        if (randomNum <= pro1) {        //库1
            secArr = c_game.lotterySecCfg[1].split(",");
        }else{      //库2
            secArr = c_game.lotterySecCfg[2].split(",");
        }
        _weigh(secArr,returnObj,lvl);
    }
    return returnObj;
}

//获取至尊抽奖所得物品id  {"id":数量,"id":数量,...}
var _getSupLotteryObj = function(lvl) {
    var returnObj = {};
    var pro1 = c_game.lotteryCfg[5];     //至尊抽奖 库1概率
    var pro2 = c_game.lotteryCfg[6];     //至尊抽奖 库2概率
    var pro3 = c_game.lotteryCfg[7];     //至尊抽奖 库3概率
    var count = c_game.lotteryCfg[8];     //普通抽奖所得数量
    for (var ii = 0; ii < count; ii++) {
        var secArr = [];
        var randomNum = _getRandomNumber(1, 10000);
        if (randomNum <= pro1) {        //库1
            secArr = c_game.lotterySecCfg[3].split(",");
        }else if(randomNum <= pro2){      //库2
            secArr = c_game.lotterySecCfg[4].split(",");
        }else{      //库3
            secArr = c_game.lotterySecCfg[5].split(",");
        }
        _weigh(secArr,returnObj,lvl);
    }
    return returnObj;
}

//获取探宝值宝箱随机所得物品id  {"id":数量,"id":数量,...}
//var _getChestObj = function(chestId){
//    var returnObj = {};
//    //金币掉落
//    if(t_copyLoot[chestId].moneyProbability != 0){
//        var par = t_copyLoot[chestId].moneyProbability;
//        var randomNum = _getRandomNumber(1, 10000);
//        if (randomNum <= par){
//            var getGold = _getRandomNumber(t_copyLoot[chestId].moneyMin, t_copyLoot[chestId].moneyMax);
//            returnObj[c_prop.spItemIdKey.gold] = getGold;
//        }
//    }
//
//    //物品掉落
//    var lootChildIds = t_copyLoot[chestId].lootChildIds;
//    var lootChildId = _getRandCounts(lootChildIds);
//    var items2 = t_copyLootChild[lootChildId].items2;
//
//}

//获取随机道具个数或id  ps：[[1002,1000],[1042,9000]]  [[1,8000],[2,2000]]   （id，概率或数量，概率）
var _getRandCounts = function(randCounts){
    var returnCount = 0;
    var randomNumLimit = 0;
    for(var i = 0;i < randCounts.length; i++){
        randomNumLimit += randCounts[i][1];
    }
    var randomNum = _getRandomNumber(1, randomNumLimit);
    var num = 0;
    for(var i = 0;i < randCounts.length; i++){
        num += randCounts[i][1];
        if(randomNum <= num){
            returnCount = randCounts[i][0];
            break;
        }
    }

    return returnCount;
}

//判断是否有数据，无数据插入一条
var _getRecordData = function(client,userId,cb){
    lotteryDao.select(client,{userId:userId},function(err,lotteryData) {
        if(err) return cb(err);
        if(!lotteryData) {        //如果不存在该用户数据则插入一条
            var lotteryEntity = new LotteryEntity();
            lotteryEntity.userId = userId;
            lotteryEntity.treasureValue = 0;
            lotteryEntity.treasureChestCount = 0;
            lotteryDao.insert(client, lotteryEntity, function(err,data){
                if(err) return cb(err);
                lotteryEntity.id = data.insertId;
                cb(null,lotteryEntity);
            });
        }else{
            cb(null,lotteryData);
        }
    });

};