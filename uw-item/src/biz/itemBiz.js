/**
 * Created by Administrator on 13-12-13.
 */
var uwData = require("uw-data");
var t_item = uwData.t_item;
var t_itemEquip = uwData.t_itemEquip;
var t_itemLogic = uwData.t_itemLogic;
var t_sellItem = uwData.t_sellItem;
var c_game = uwData.c_game;
var consts = uwData.consts;
var c_prop = uwData.c_prop;
var c_msgCode = uwData.c_msgCode;
var sysMsgCode = uwData.sysMsgCode;

var ds = require("uw-ds").ds;
var exports = module.exports = {};
var async = require("async");

var uwUtils = require("uw-utils");
var getMsg = uwUtils.msgFunc(__filename);
var propUtils = uwUtils.propUtils;
var commonUtils = uwUtils.commonUtils;
var userUtils = require("uw-user").userUtils;

var heroBiz = null;
var heroDao = null;
var userBiz = null;
var userDao = null;
//var equipDao = require("./../dao/equipDao");
//var equipBiz = require("./../biz/equipBiz");
var formula = require("uw-formula");

var checkRequire = function () {
    userDao = userDao || require("uw-user").userDao;
    userBiz = userBiz || require("uw-user").userBiz;
    heroBiz = heroBiz || require("uw-user").heroBiz;
    heroDao = heroDao || require("uw-user").heroDao;
};


/**
 * 购买暗影石
 * @param client
 * @param userId
 * @param itemId
 * @param num
 * @param cb
 */
exports.buyDarkStoneItem = function (client, userId, itemId, num, cb) {
    checkRequire();
    num  = parseInt(num)||0;
    userDao.getCacheData(client, userId, function (err, userData) {
        if (err) return cb(err);
        var sellTempData = t_item[itemId];
        if(!sellTempData) return cb("没有该物品");
        if (sellTempData.type != c_prop.itemTypeKey.darkStone) return cb("不是暗影石类型");
        var costDiamond = sellTempData.diamonddPrice*num;
        //判断钻石
        if(userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));
        userUtils.reduceDiamond(userData, costDiamond, consts.diamondConsumeType.item_1, itemId);
        //背包加入
        userUtils.addBag(userData.bag,itemId,num);
        var updateData = {};
        updateData.diamond = userData.diamond;
        updateData.give_diamond = userData.give_diamond;
        updateData.buy_diamond = userData.buy_diamond;
        updateData.record = userData.record;
        updateData.bag = userData.bag;

        userDao.updateCacheData(client, userId, updateData, function(err,data){
            if (err) return cb(err);
            cb(null,costDiamond);
        });
    });
};


/**
 * 卖掉装备
 * @param client
 * @param userId
 * @param equipId
 * @param cb
 */
exports.sellEquip = function (client, userId, equipId, cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.getCacheData(client, userId, cb1);
        },
        function (cb1) {
            equipDao.select(client, " id=? and userId = ? and heroId is null", [equipId, userId], cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var  userData = data[0], equipData = data[1];
        if (!equipData) return cb("不存在该装备");//不存在该装备
        var itemTempData = t_item[equipData.tempId];

        //判断是否可出售
        if (!itemTempData.isSell) return cb("不可出售");//不可出售
        //计算金钱
        userData.gold += itemTempData.sellPrice;

        async.parallel([
            function (cb1) {
                userDao.updateCacheData(client, userId, {bag:userData.bag, gold:userData.gold},  cb1);
            },
            function (cb1) {
                equipDao.del(client, {id: equipId, userId: userId}, cb1);
            }
        ], function (err2, data2) {
            if (err2) return cb(err2);
            return cb(null, itemTempData.sellPrice);
        });
    });
};

/**
 * 使用物品
 * @param client
 * @param userId
 * @param heroId
 * @param itemId
 * @param itemNum
 * @param cb
 */
exports.use = function (client, userId, heroId, itemId, itemNum,  cb) {
    itemNum = itemNum || 0;
    checkRequire();
    userDao.getCacheData(client,userId, function (err, data) {
        var bag = data.bag;
        var itemTempData = t_item[itemId], itemLogicTempData = t_itemLogic[itemId], ownItemCount = bag[itemId] || 0;
        //判断是否拥有
        if (!itemTempData || ownItemCount < itemNum) return  cb("不拥有该物品");//不拥有该物品
        //判断是否可使用
        if (!itemTempData.isUse) return cb("不可使用");//不可使用

        //计算生成物品
        var randomCreates = {};
        for (var i = 0; i < itemNum; i++) {
            var locItems = exports.calLogicItems(itemId);
            randomCreates = propUtils.mergerProp(randomCreates, locItems);
        }

        switch (itemLogicTempData.type) {
            case consts.itemLogicType.gift://礼包类
            case consts.itemLogicType.res://资源补给类
                calLogicRes(client, data, itemId, itemNum, randomCreates, cb);
                break;
            case consts.itemLogicType.expc://经验类
                calLogicExpc(client, data, itemId, itemNum,randomCreates, heroId, cb);
                break;
        }
    });
};

/**
 * 计算道具随机的物品
 * @param itemId
 * @returns {id:num,id:num}
 */
exports.calLogicItems = function (itemId) {
    var randomCreates = {};
    var itemLogicTempData = t_itemLogic[itemId];
    if (itemLogicTempData.num < 0) {
        randomCreates = getRandomRangCreate(itemLogicTempData.create);
    }else if (itemLogicTempData.num == 0) {
        randomCreates = getRandomCreate(itemLogicTempData.create);
    } else if (itemLogicTempData.num == 1){
        var weightArr = [];
        var create = [].concat(itemLogicTempData.create);
        for (var i = 0; i < create.length; i++) {
            weightArr.push(create[i][2]);
        }
        var weightIndex = commonUtils.getWeightRandom(weightArr);
        randomCreates[create[weightIndex][0]] = create[weightIndex][1];
    } else {
        var randomArr = commonUtils.getRandomArray(itemLogicTempData.create, itemLogicTempData.num);
        for (var i = 0; i < randomArr.length; i++) {
            var c = randomArr[i];
            randomCreates[c[0]] = c[1];
        }
    }
    //必定获得
    if(itemLogicTempData.create2){
        for (var i = 0; i < itemLogicTempData.create2.length; i++) {
            var locCreate2 = itemLogicTempData.create2[i];
            if(!locCreate2) continue;
            var locItemsId = locCreate2[0];
            var locItemsNum = locCreate2[1]||0;
            if(!locItemsId||!locItemsNum) continue;
            var locOwnNum = randomCreates[locItemsId]||0;
            randomCreates[locItemsId] = locOwnNum+locItemsNum;
        }
    }
    return randomCreates;
};

/**
 * 保存物品并且更新数据库
 * @param client
 * @param userId|userData
 * @param items
 * @param consumeType
 * @param orderid
 * @param cb
 */
exports.saveItems = function (client, userId, items, consumeType, orderid, cb) {
    checkRequire();
    getBaseUserData(client, userId, function (err, baseUserData) {
        if (err) return cb(err);

        var equipIds = userUtils.addItems(baseUserData, items, consumeType, orderid);
        async.parallel([
            function (cb1) {
                userDao.updateCacheData(client, baseUserData.id, baseUserData,  cb1);
            },
            function (cb1) {
                equipBiz.insertByTempIds(client, baseUserData.id, equipIds, cb1)
            }
        ], function (err0,data) {
            if (err0) return cb(err0);
            var equipList = data[1];
            cb(null, equipList)
        })
    });
};

/**
 * 出售物品
 * @param client
 * @param userId|userData
 * @param itemId
 * @param itemNum
 * @param cb
 */
exports.sellItems = function(client,userId,itemId, itemNum,cb){
    checkRequire();
    itemNum = parseInt(itemNum);
    if(itemNum<=0) return cb("出售物品异常！");

    userDao.select(client,{id:userId},function(err,userData) {
        if (err) return cb(err);
        var bag = userData.bag;
        var bagItems = {};
        var delBagItems = {};
        var ownItemNum = bag[itemId];
        if(!ownItemNum || ownItemNum < itemNum) return cb("背包没有指定数量的该物品");
        ownItemNum -= itemNum;
        var sellItemData = t_sellItem[itemId];
        if(!sellItemData) return cb("该装备不可出售");
        var sellItems = sellItemData.items;
        var items = {};
        for(var key in sellItems){
            var item = sellItems[key];
            if(t_item[item[0]].type == c_prop.itemTypeKey.equip) {
                return cb("目前不支持获得装备")
            }
            items[item[0]] = item[1]*itemNum;
        }
        var itemsArr = userUtils.saveItems(userData,items);
        var getGold = userUtils.getNumOfItems(items,c_prop.itemTypeKey.gold);
        var getDiamond = userUtils.getNumOfItems(items,c_prop.itemTypeKey.diamond);
        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        delBagItems[itemId] = itemNum;
        bag[itemId] = ownItemNum;
        userData.bag = bag;
        var updateUser = {
            gold: userData.gold,
            bag: userData.bag,
            diamond: userData.diamond
        }
        userDao.update(client, updateUser, {id:userData.id}, function(err, data){
            if (err) return cb(err);
            delete updateUser.bag;
            return cb(null, [updateUser,bagItems,getDiamond,delBagItems]);
        });
    });
};

//--------------------------------------------private method-------------------------------------------------------------------------------
var calLogicRes = function (client, userData, itemId, itemNum, randomCreates, cb) {
    //扣除
    userUtils.delBag(userData.bag, itemId, itemNum);
    //增加
    exports.saveItems(client, userData, randomCreates , consts.diamondGainType.item_1, itemId+"-"+itemNum, function(err,equipEntityList){
        if (err) return cb(err);
        cb(null, new ds.UseItemInfo(randomCreates, equipEntityList));
    });
};

var calLogicExpc = function (client, userData, itemId, itemNum, randomCreates, heroId, cb) {
    heroDao.select(client, {id: heroId, userId: userData.id}, function (err, heroData) {
        if (err) return cb(err);
        if(!heroData) return cb(sysMsgCode.c_6_2);
        var heroExpc = 0;
        for (var key in randomCreates) {
            heroExpc += randomCreates[key];
        }

        //扣除
        userUtils.delBag(userData.bag, itemId, itemNum);
        //更新英雄
        heroBiz.calAddExpc(heroData, heroExpc, userData.lvl);

        heroBiz.updateUserHeroData(client, userData, heroData, userData.id, heroId, function (err, reHeroData) {
            if (err) return cb(err);
            cb(null, new ds.UseItemInfo(null, null, reHeroData));
        });
    });
};

//获取随机的物品
var getRandomCreate = function (createArr) {
    var ret = {};
    for (var i = 0; i < createArr.length; i++) {
        var locCreate = createArr[i];
        if (Math.random()*10000 <= locCreate[2]) {
            ret[locCreate[0]] = locCreate[1];
        }
    }
    return ret;
};

//获取随机的物品
var getRandomRangCreate = function (createArr) {
    var ret = {};
    var random = Math.random()*10000;
    for (var i = 0; i < createArr.length; i++) {
        var locCreate = createArr[i];
        if (random <= locCreate[2]) {
            ret[locCreate[0]] = locCreate[1];
            break;
        }
    }
    return ret;
};

/**
 *
 * @param client
 * @param userId|userData
 * @param cb
 */
function getBaseUserData(client, userId, cb) {
    if (typeof userId == "number") {
        userDao.getCacheData(client, userId, function (err, data) {
            if (err) return cb(err);
            cb(null, data);
        });
    } else {
        cb(null, userId);
    }
};


