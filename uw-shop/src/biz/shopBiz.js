/**
 * Created by Sara on 2015/8/12.
 */
var uwData = require("uw-data");
var consts = uwData.consts;
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var c_msgCode = uwData.c_msgCode;
var c_shop = uwData.c_shop;
var getMsg = require("uw-utils").msgFunc(__filename);
var formula = require("uw-formula");
var ShopEntity = require('uw-entity').ShopEntity;
var ShopRecordEntity = require("uw-entity").ShopRecordEntity;
var async = require("async");
var shopDao = require("./../dao/shopDao");
var shopRecordDao = require("./../dao/shopRecordDao");
var propUtils = require("uw-utils").propUtils;
var commonUtils = require("uw-utils").commonUtils;
var t_item = uwData.t_item;
var t_itemEquip = uwData.t_itemEquip;

var ds = require("uw-ds").ds;
var exports = module.exports;

var userDao = null;
var userUtils = null;
var mailBiz = null;
var userBiz = null;
var equipBiz = null;
var heroDao = null;
var checkRequire = function(){
    mailBiz = require("uw-mail").mailBiz;
    userDao = require("uw-user").userDao;
    userUtils = require("uw-user").userUtils;
    userBiz = require("uw-user").userBiz;
    equipBiz = require("uw-equip").equipBiz;
    heroDao = require("uw-hero").heroDao;
};
/**
 * 获取商店数据
 * @param client
 * @param userId
 * @param type
 * @param cb
 */
exports.getInfo = function (client, userId, type, cb) {
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.selectCols(client,"lvl",{id:userId},cb1);
        },
        function(cb1){
            _getShopData(client,userId,type,cb1);
        },
        function(cb1){
            heroDao.listCols(client," tempId "," userId = ? ",[userId],cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0],shopData = data[1],heroList = data[2];
        var tempIdArr = [];
        for(var i = 0;i < heroList.length;i++){
            tempIdArr.push(heroList[i].tempId);
        }
        _calRefreshData(client,shopData,type,userData.lvl,tempIdArr,cb);
    });
};

/**
 * 刷新商店
 * @param client
 * @param userId
 * @param type
 * @param lvlRefresh
 * @param cb
 */
exports.refreshExShop = function(client,userId,type,lvlRefresh,cb){
    checkRequire();
    if(type != c_prop.shopTypeKey.equip) return cb("商店类型不需要刷新");
    var nowTime = new Date();
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            _getShopData(client,userId,type,cb1);
        },
        function(cb1){
            heroDao.listCols(client," tempId "," userId = ? ",[userId],cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], shopData = data[1],heroList = data[2];
        var tempIdArr = [];
        for(var i = 0;i < heroList.length;i++){
            tempIdArr.push(heroList[i].tempId);
        }
        var userLvl = userData.lvl;
        var refreshCount = 0;       //普通商店今日刷新次数
        var refreshCountResetTime = shopData.refreshCountResetTime;     //普通商店刷新次数重置时间
        if(refreshCountResetTime && refreshCountResetTime.equalsDay(new Date())) refreshCount = shopData.refreshCount||0;     //今天
        var costDiamond = formula.callRefreshShop(refreshCount);        //刷新消耗
        if(lvlRefresh) costDiamond = 0;
        if (userData.gold < costDiamond) return  cb("金币不足!");

        //刷新商品数据
        var items = _getNewItems(type,userLvl,tempIdArr);
        shopData.items = items;
        shopData.refreshCount = refreshCount + 1;
        if(lvlRefresh) shopData.refreshCount -= 1;
        shopData.refreshCountResetTime = nowTime;
        //扣除元宝
        //userUtils.reduceDiamond(userData,costDiamond);
        userUtils.costCurrency(userData,1,costDiamond);
        var updateExShopData ={
            items:shopData.items,
            refreshCount:shopData.refreshCount,
            refreshCountResetTime:shopData.refreshCountResetTime
        };
        var updateData ={
            gold:userData.gold
        };
        async.parallel([
            function(cb1){
                shopDao.update(client,updateExShopData,{id:shopData.id},cb1);
            },
            function(cb1){
                userDao.update(client,updateData,{id:userId},cb1);
            }
        ],function(err,data1){
            if(err) return cb(err);
            cb(null,[updateExShopData,updateData,costDiamond]);
        });
    });
}

/**
 * 商店购买
 * @param client
 * @param userId
 * @param type
 * @param index
 * @param num
 * @param cb
 */
exports.buy = function(client,userId,type,index,num,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            if(type == c_prop.shopTypeKey.normal || type == c_prop.shopTypeKey.gem){
                exports.getInfo(client, userId, type, cb1);
            }else{
                shopDao.select(client,{userId:userId,type:type},cb1);
            }
        },
        function(cb1){
            heroDao.listCols(client," tempId "," userId = ? ",[userId],cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], shopData = data[1],heroList = data[2];
        var tempIdArr = [];
        for(var i = 0;i < heroList.length;i++){
            tempIdArr.push(heroList[i].tempId);
        }
        var itemShopData = shopData.items[index];
        if (!itemShopData) return cb("此商品不存在");
        var c_shopId = itemShopData[0];
        var c_ShopData = c_shop[c_shopId];
        var mailItems = {};

        var limitNum = itemShopData[1] || 0;
        if (limitNum >= 0) {
            //限购次数
            if (limitNum < num) return cb("此商品已售罄");
            if(type != c_prop.shopTypeKey.equip) itemShopData[1] = limitNum - num;
        }

        //消耗货币
        var costGold = 0;
        var costDiamond = 0;
        var costPrice = c_ShopData.price * num;
        switch (c_ShopData.currencyType) {
            case c_prop.currencyTypeKey.gold:
                if (userData.gold < costPrice) return cb("金币不足");
                costGold = costPrice;
                break;
            case c_prop.currencyTypeKey.diamond:
                if (userData.diamond < costPrice) return cb("元宝不足");
                costDiamond = costPrice;
                break;
            case c_prop.currencyTypeKey.honor:
                if (userData.honor < costPrice) return cb("荣誉值不足");
                break;
            case c_prop.currencyTypeKey.prestige:
                if (userData.prestige < costPrice) return cb("声望不足");
                break;
            case c_prop.currencyTypeKey.expedition:
                var count = userData.bag[79];
                if (count < costPrice) return cb("货币不足");
                break;
            case c_prop.currencyTypeKey.expeditionHigh:
                var count = userData.bag[80];
                if (count < costPrice) return cb("货币不足");
                break;
        }
        userUtils.costCurrency(userData, c_ShopData.currencyType, costPrice);

        var itemId = c_ShopData.itemId;
        if(itemId == c_prop.spItemIdKey.littleHorn && userData.vip < 2){
            return cb("VIP2以上才可购买喇叭");
        }

        //得到物品
        //gold,diamond,buyDiamond,giveDiamond,bag,equipBag          [shopId,num,[属性],评分]
        var items = {};
        var costGoldItem= {};
        var costDiamondItem = {};
        items[itemId] = num;
        costGoldItem[itemId] = costGold;
        costDiamondItem[itemId] = costDiamond;

        var equipBagResGrid = userUtils.getEquipBagResGrid(userData);       //装备背包剩余格数
        for(var key in items){
            if(t_item[key].type == c_prop.itemTypeKey.equip){       //装备需要判断背包是否有空间
                if(items[key] <= equipBagResGrid){
                    equipBagResGrid -= itemShopData[1];
                }else{
                    mailItems[key] = [items[key] - equipBagResGrid,itemShopData[2],itemShopData[3]];
                    itemShopData[1] = equipBagResGrid;
                    equipBagResGrid = 0;
                    //if(items[key] == 0) delete items[key];
                }
            }
        }
        var bagItems = {};
        var equipBagItems = {};
        if(type == c_prop.shopTypeKey.equip){
            for(var i = 0; i < itemShopData[1]; i++){
                var equipMaxId = 1;
                if(userData.equipBag != null && JSON.stringify(userData.equipBag) != "{}") equipMaxId = parseInt(commonUtils.getLastKey(userData.equipBag)) + 1;
                var randomArr = itemShopData[2];      //装备随到的属性值
                var gradeBase = itemShopData[3];       //装备评分
                userData.equipBag[equipMaxId] = [itemId,randomArr,gradeBase,0];
                equipBagItems[equipMaxId] = [itemId,randomArr,gradeBase,0];
            }
        }else{
            var itemsArr = userUtils.saveItems(userData,items);
            if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
            if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
        }

        if(type == c_prop.shopTypeKey.equip) shopData.items.splice(index,1);        //删除
        //如果装备商店物品全购完，自动刷新
        if (type == c_prop.shopTypeKey.equip) {
            var isRefresh = true;
            for (var i = 0; i < shopData.items.length; i++) {
                if (shopData.items[i][1] > 0) {
                    isRefresh = false;
                    break;
                }
            }
            if (isRefresh) shopData.items = _getNewItems(type, userData.lvl,tempIdArr);
        }

        var updateData = {
            gold:userData.gold,
            honor:userData.honor,
            diamond:userData.diamond,
            prestige:userData.prestige,
            giveDiamond : userData.giveDiamond,
            buyDiamond : userData.buyDiamond,
            bag:userData.bag,
            equipBag:userData.equipBag
        };

        var updateShopData = {
            items:shopData.items
        };
        async.parallel([
            function(cb1){
                if(type != c_prop.shopTypeKey.normal && type != c_prop.shopTypeKey.gem){
                    shopDao.update(client,updateShopData,{id:shopData.id},cb1);
                }else{cb1();}
            },
            function(cb1){
                userDao.update(client,updateData,{id:userId},cb1);
            }
        ],function(err,data){
            if(err) return cb(err);
            var isMail = false;
            delete updateData.bag;
            delete updateData.equipBag;
            _recordShop(client,type,userData, items, costGoldItem, costDiamondItem);
            if(JSON.stringify(mailItems) != "{}"){
                mailBiz.addByType(client, userId, c_prop.mailTypeKey.equipChest, [], mailItems, function(err,data1){
                    if (err) return cb(err);
                    isMail = true;
                    cb(null,[updateData,updateShopData,bagItems,equipBagItems,c_shopId,costGold,costDiamond,isMail]);
                });
            }else{
                cb(null,[updateData,updateShopData,bagItems,equipBagItems,c_shopId,costGold,costDiamond,isMail]);
            }
        });
    });
};

/**
 * 购买全部
 * @param client
 * @param userId
 * @param type
 * @param cb
 */
exports.buyAll = function(client,userId,type,cb){
    checkRequire();
    if(type != c_prop.shopTypeKey.equip) return cb("不是装备商店类型");
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            shopDao.select(client,{userId:userId,type:type},cb1);
        },
        function(cb1){
            heroDao.listCols(client," tempId "," userId = ? ",[userId],cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], shopData = data[1],heroList = data[2];
        var costGold = 0;
        var costHonor = 0;
        var costDiamond = 0;
        var costPrestige = 0;
        var costBlack = 0;
        var costBlackHigh = 0;
        var items = {};
        var mailItems = {};
        var goldItems = {};
        var diamondItems = {};
        var costGoldItem= {};
        var costDiamondItem = {};
        var buyItems = {};
        var c_shopIdObj = {};       //{"c_shopId":数量,.....}
        var tempIdArr = [];
        for(var i = 0;i < heroList.length;i++){
            tempIdArr.push(heroList[i].tempId);
        }
        for(var i = 0;i < shopData.items.length;i++){
            var itemShopData = shopData.items[i];
            if(!itemShopData) continue;
            var c_shopId = itemShopData[0];     //商品表id
            var limitNum = itemShopData[1]||0;      //数量
            c_shopIdObj[c_shopId] = limitNum;
            var c_ShopData = c_shop[c_shopId];      //商品数据
            items[c_ShopData.itemId] = [1,itemShopData[2],itemShopData[3]];

            //计算消耗货币
            var costPrice = c_ShopData.price;
            switch (c_ShopData.currencyType) {
                case c_prop.currencyTypeKey.gold:
                    costGold += costPrice;
                    goldItems[c_ShopData.itemId] = 1;
                    costGoldItem[c_ShopData.itemId] = costPrice;
                    buyItems[c_ShopData.itemId] = 1;
                    break;
                case c_prop.currencyTypeKey.diamond:
                    costDiamond += costPrice;
                    diamondItems[c_ShopData.itemId] = 1;
                    costDiamondItem[c_ShopData.itemId] = costPrice;
                    buyItems[c_ShopData.itemId] = 1;
                    break;
                case c_prop.currencyTypeKey.honor:
                    costHonor += costPrice;
                    break;
                case c_prop.currencyTypeKey.prestige:
                    costPrestige += costPrice;
                    break;
                case c_prop.currencyTypeKey.expedition:
                    costPrestige += costPrice;
                    break;
                case c_prop.currencyTypeKey.expeditionHigh:
                    costPrestige += costPrice;
                    break;
            }
        }

        //扣除货币
        var goldShowMsg = false,diamondShowMsg = false;
        if(costGold > 0){
            if (userData.gold < costGold){
                goldShowMsg = true;
            }else{
                userUtils.costCurrency(userData,1,costGold);
            }
        }
        if(costDiamond > 0){
            if (userData.diamond < costDiamond){
                diamondShowMsg = true;
                costDiamond = 0;
            }else{
                userUtils.costCurrency(userData,2,costDiamond);
            }
        }
        if(costHonor > 0){
            if (userData.honor < costHonor){
                return cb("荣誉值不足");
            }else{
                userUtils.costCurrency(userData,3,costHonor);
            }
        }
        if(costPrestige > 0){
            if (userData.prestige < costPrestige){
                return cb("声望不足");
            }else{
                userUtils.costCurrency(userData,4,costPrestige);
            }
        }
        //if(goldShowMsg && diamondShowMsg) return cb("金币、元宝不足");

        //得到物品
        //gold,diamond,buyDiamond,giveDiamond,bag,equipBag
        if(goldShowMsg){
            for(var key in goldItems){
                delete items[key];
            }
        }
        if(diamondShowMsg){
            for(var key in diamondItems){
                delete items[key];
            }
        }
        for(var key in items){
            for(var i = 0;i<shopData.items.length;i++){
                if(c_shop[shopData.items[i][0]].itemId == key) shopData.items.splice(i,1);
            }
        }

        var equipBagResGrid = userUtils.getEquipBagResGrid(userData);       //装备背包剩余格数
        for(var key in items){
            if(t_item[key].type == c_prop.itemTypeKey.equip){       //装备需要判断背包是否有空间
                if(items[key][0] <= equipBagResGrid){
                    equipBagResGrid -= items[key][0];
                }else{
                    mailItems[key] = [items[key][0] - equipBagResGrid,items[key][1],items[key][2]];
                    items[key][0] = equipBagResGrid;
                    equipBagResGrid = 0;
                    if(items[key][0] == 0) delete items[key];
                }
            }
        }
        var bagItems = {};
        var equipBagItems = {};
        if(type == c_prop.shopTypeKey.equip){
            for(var key in items){
                for(var i = 0; i < items[key][0]; i++){
                    var equipMaxId = 1;
                    if(userData.equipBag != null && JSON.stringify(userData.equipBag) != "{}") equipMaxId = parseInt(commonUtils.getLastKey(userData.equipBag)) + 1;
                    var randomArr = items[key][1];      //装备随到的属性值
                    var gradeBase = items[key][2];       //装备评分
                    userData.equipBag[equipMaxId] = [key,randomArr,gradeBase,0];
                    equipBagItems[equipMaxId] = [key,randomArr,gradeBase,0];
                }
            }
        }else{
            var itemsArr = userUtils.saveItems(userData,items);
            if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
            if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
        }

        //成功购买所有物品，刷新商店
        if(!goldShowMsg && !diamondShowMsg) shopData.items = _getNewItems(type,userData.lvl,tempIdArr);

        var updateData = {
            gold:userData.gold,
            honor:userData.honor,
            diamond:userData.diamond,
            prestige:userData.prestige,
            giveDiamond : userData.giveDiamond,
            buyDiamond : userData.buyDiamond,
            bag:userData.bag,
            equipBag:userData.equipBag
        };

        var updateShopData = {
            items:shopData.items
        };

        async.parallel([
            function(cb1){
                shopDao.update(client,updateShopData,{id:shopData.id},cb1);
            },
            function(cb1){
                userDao.update(client,updateData,{id:userId},cb1);
            }
        ],function(err,data){
            if(err) return cb(err);
            var isMail = false;
            delete updateData.bag;
            delete updateData.equipBag;
            _recordShop(client,type,userData, buyItems, costGoldItem, costDiamondItem);
            if(JSON.stringify(mailItems) != "{}"){
                mailBiz.addByType(client, userId, c_prop.mailTypeKey.equipChest, [], mailItems, function(err,data1){
                    if (err) return cb(err);
                    isMail = true;
                    cb(null,[updateData,updateShopData,bagItems,equipBagItems,c_shopIdObj,costGold,costDiamond,[goldShowMsg,diamondShowMsg],isMail]);
                });
            }else{
                cb(null,[updateData,updateShopData,bagItems,equipBagItems,c_shopIdObj,costGold,costDiamond,[goldShowMsg,diamondShowMsg],isMail]);
            }
        });
    });
};


/*******************************************************private*************************************************************/
var _recordShop = function(client, shopType, userData, items, costGold, costDiamond){
    var insertList = [];
    for(var itemId in items){
        var shopRecord = new ShopRecordEntity();
        shopRecord.userId = userData.id;
        shopRecord.userLvl = userData.lvl;
        shopRecord.userVip = userData.vip;
        shopRecord.costDiamond = costDiamond[itemId]||0;
        shopRecord.costGold = costGold[itemId]||0;
        shopRecord.buyItemId = parseInt(itemId);
        shopRecord.buyAmount = parseInt(items[itemId]);
        shopRecord.buyTime = new Date();
        shopRecord.shopType = shopType;
        insertList.push(shopRecord);
    }
    shopRecordDao.insertList(client, insertList, function(err){
        if(err) return console.log(err);
    })
}



//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};

var _arrLength = function(length,arr){
    if(length - arr.length <= 0){
        arr.splice(_getRandomNumber(0,arr.length -1),1);
    }
}

//判断是否有数据，无数据插入一条
var _getShopData = function(client,userId,type,cb){
    if(type == c_prop.shopTypeKey.normal || type == c_prop.shopTypeKey.gem){
        var shopEntity = new ShopEntity();
        shopEntity.id = 1;
        shopEntity.userId = userId;
        shopEntity.type = type;
        cb(null,shopEntity);
    }else{
        shopDao.select(client,{userId:userId,type:type},function(err,shopData) {
            if(err) return cb(err);
            if(!shopData) {        //插入一条
                var shopEntity = new ShopEntity();
                shopEntity.userId = userId;
                shopEntity.type = type;
                shopDao.insert(client, shopEntity, function(err,data){
                    if(err) return cb(err);
                    shopEntity.id = data.insertId;
                    cb(null,shopEntity);
                });
            }else{
                cb(null,shopData);
            }
        });
    }
};

//计算物品刷新
var _calRefreshData = function(client,shopData,type,userLvl,tempIdArr,cb){

    var isRefresh = false;
    switch (type) {
        case c_prop.shopTypeKey.normal:
            if(!shopData.items || shopData.items.length < 1){
                shopData.items = _getNewItems(type,userLvl,tempIdArr);
                shopData.lastTime = curLastRefreshTime;
                isRefresh = false;
            }
            break;
        case c_prop.shopTypeKey.arena:
            var curLastRefreshTime = _getCurLastRefreshTime();
            if (!shopData.lastTime || !shopData.lastTime.equals(curLastRefreshTime)) {
                shopData.items = _getNewItems(type,userLvl,tempIdArr);
                shopData.lastTime = curLastRefreshTime;
                isRefresh = true;
            }
            break;
        case c_prop.shopTypeKey.equip:
            var curLastRefreshTime = _getCurLastRefreshTime();
            if (!shopData.lastTime || !shopData.lastTime.equals(curLastRefreshTime)) {
                shopData.items = _getNewItems(type,userLvl,tempIdArr);
                shopData.lastTime = curLastRefreshTime;
                isRefresh = true;
            }
            break;
        case c_prop.shopTypeKey.gem:
            if(!shopData.items || shopData.items.length < 1){
                shopData.items = _getNewItems(type,userLvl,tempIdArr);
                shopData.lastTime = curLastRefreshTime;
                isRefresh = false;
            }
            break;
        case c_prop.shopTypeKey.expedition:
            if(!shopData.items || shopData.items.length < 1){
                shopData.items = _getNewItems(type,userLvl,tempIdArr);
                shopData.lastTime = curLastRefreshTime;
                isRefresh = false;
            }
            break;
        case c_prop.shopTypeKey.expeditionHigh:
            if(!shopData.items || shopData.items.length < 1){
                shopData.items = _getNewItems(type,userLvl,tempIdArr);
                shopData.lastTime = curLastRefreshTime;
                isRefresh = false;
            }
            break;

        default :
            break;
    }

    if(!isRefresh) return cb(null,shopData);

    var updateShopData = {};
    updateShopData.items = shopData.items;
    updateShopData.lastTime = shopData.lastTime;

    shopDao.update(client,updateShopData,{id:shopData.id},function(err,data){
        if(err) return cb(err);
        cb(null,shopData);
    });
};


//生成商品数组
var _getNewItems = function(type,userLvl,tempIdArr){
    var reTempItems = [];
    var shopDataArr = [];
    var itemsLength = _getItemsLength(type);

    if(type == c_prop.shopTypeKey.equip){       //装备商店特殊处理
        var itemsLengthArr = itemsLength.split(",");        //范围对应数量数组
        for(var i = 0;i<itemsLengthArr.length;i++){
            shopDataArr = [];
            var itemsScope = c_game.shopCfg[i+4].split(",");        //权重范围数组
            //过滤类型，权重范围，等级
            for(var key in c_shop){
                var locShopData = c_shop[key];
                if(locShopData.type!=type || locShopData.id < itemsScope[0] || locShopData.id > itemsScope[1]) continue;
                var job = t_itemEquip[locShopData.itemId].job;
                if(userLvl < locShopData.needLvl || userLvl > locShopData.endLvl || tempIdArr.indexOf(job) < 0)  continue;
                shopDataArr.push(locShopData);
            }
            //权重
            var weightArr = [];
            for(var ii = 0;ii<shopDataArr.length;ii++){
                var locShopData = shopDataArr[ii];
                weightArr.push(locShopData.rate);
            }

            if(itemsLength - reTempItems.length < 0){
                _arrLength(itemsLength,reTempItems);
                if(itemsLength - reTempItems.length < 0){
                    _arrLength(itemsLength,reTempItems);
                }
            }

            var arr = [];
            for(var ii = 0;ii<itemsLengthArr[i]-arr.length;ii++){
                if(weightArr.length<=0) break;
                var locIndex = commonUtils.getWeightRandom(weightArr);
                var locShopData = shopDataArr[locIndex];
                arr.push([locShopData.id,locShopData.limit||1]);
                reTempItems.push([locShopData.id,locShopData.limit||1]);

                weightArr.splice(locIndex, 1);
                shopDataArr.splice(locIndex, 1);
                ii--;
            }
        }

    }else{
        //过滤类型，等级
        for(var key in c_shop){
            var locShopData = c_shop[key];
            if(locShopData.type!=type) continue;
            if(locShopData.needLvl != 0 && userLvl < locShopData.needLvl) continue;
            if(locShopData.endLvl != 0 && userLvl > locShopData.endLvl)  continue;
            shopDataArr.push(locShopData);
        }
        //过滤必出
        for(var i = 0;i<shopDataArr.length;i++){
            var locShopData = shopDataArr[i];
            if(locShopData.rate==10000){
                reTempItems.push([locShopData.id,locShopData.limit||1]);
                shopDataArr.splice(i, 1);
                i--;
            }
        }
        //随机剩余
        var weightArr = [];
        for(var i = 0;i<shopDataArr.length;i++){
            var locShopData = shopDataArr[i];
            weightArr.push(locShopData.rate);
        }

        if(itemsLength - reTempItems.length < 0){
            _arrLength(itemsLength,reTempItems);
            if(itemsLength - reTempItems.length < 0){
                _arrLength(itemsLength,reTempItems);
            }
        }

        for(var i = 0;i<itemsLength-reTempItems.length;i++){
            if(weightArr.length<=0) break;
            var locIndex = commonUtils.getWeightRandom(weightArr);
            var locShopData = shopDataArr[locIndex];
            reTempItems.push([locShopData.id,locShopData.limit||1]);

            weightArr.splice(locIndex, 1);
            shopDataArr.splice(locIndex, 1);
            i--;
        }
    }

    //排序
    reTempItems = reTempItems.sort(_sortItems);
    if (reTempItems.length > itemsLength) {
        for (var i = 0; i < reTempItems.length - itemsLength; i++) {
            reTempItems.pop();
        }
    }
    shopDataArr.length = 0;
    if(type == c_prop.shopTypeKey.equip){       //给装备加具体属性评分
        reTempItems.sort(function(){ return 0.5 - Math.random() });     //打乱数组顺序
        for(var i = 0;i < reTempItems.length;i++){
            var templateId = c_shop[reTempItems[i][0]].itemId;
            var randomAbility = [];       //计算额外属性
            if(t_itemEquip[templateId].isUp==1||t_itemEquip[templateId].isRare==1){
                randomAbility = t_itemEquip[templateId].fixProp;
            }else{
                randomAbility = equipBiz.getRandomAbility(templateId);      //装备随到的属性值
            }
            reTempItems[i][2] = randomAbility;
            reTempItems[i][3] = equipBiz.getEquipGrade(templateId,randomAbility);        //计算评分
        }
    }
    return reTempItems;
};

//排序
var _sortItems = function(a,b){
    var shopData1 = c_shop[a[0]];
    var shopData2 = c_shop[b[0]];
    return shopData1.order<shopData2.order?-1:1;
};

//获取项目数
var _getItemsLength = function(type){
    //"参数1：竞技场商店种类数量
    //参数2：普通商店种类数量"
    var itemLength = 0;
    switch (type) {
        case c_prop.shopTypeKey.normal:
            itemLength = c_game.shopCfg[1];
            break;
        case c_prop.shopTypeKey.arena:
            itemLength = c_game.shopCfg[0];
            break;
        case c_prop.shopTypeKey.equip:
            itemLength = c_game.shopCfg[3];
            break;
        case c_prop.shopTypeKey.gem:
            itemLength = c_game.shopCfg[2];
            break;
        case c_prop.shopTypeKey.expedition:
            itemLength = c_game.shopCfg[9];
            break;
        case c_prop.shopTypeKey.expeditionHigh:
            itemLength = c_game.shopCfg[10];
            break;
    }
    return itemLength;
};

//获取最后一次的刷新具体时间
var _getCurLastRefreshTime = function(){
    var curHour = (new Date).getHours();
    var reTime = null;
    if(curHour<5){
        reTime = (new Date).addDays(-1).clearTime().addHours(5);
    }else{
        reTime = (new Date).clearTime().addHours(5);
    }
    return reTime;
};