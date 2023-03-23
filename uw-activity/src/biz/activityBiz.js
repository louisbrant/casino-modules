/**
 * Created by Administrator on 13-12-13.
 */
var uwData = require("uw-data");
var c_msgCode = uwData.c_msgCode;
var c_game = uwData.c_game;
var consts = uwData.consts;
var c_prop = uwData.c_prop;
var t_medal = uwData.t_medal;
var c_mysterShop = uwData.c_mysterShop;
var biBiz = require('uw-log').biBiz;
var UpStarStoneObj = require('uw-log').UpStarStoneObj;
var MysterShopObj = require('uw-log').MysterShopObj;
var exports = module.exports = {};
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var propUtils = require("uw-utils").propUtils;
var userUtils = require("uw-user").userUtils;

var logger = require('uw-log').getLogger("uw-logger", __filename);
var userBiz = require("uw-user").userBiz;
var userDao = require("uw-user").userDao;
var gameRecordDao = require("uw-game-record").gameRecordDao;

var rechargeDao = require("uw-recharge").rechargeDao;
var ActivityEntity = require("uw-entity").ActivityEntity;

var activityDao = require("./../dao/activityDao");
var activityRecordDao = require("./../dao/activityRecordDao");
var receiveFun = require("./receiveFun").receiveFun;
var checkOpBiz = require("./checkOpBiz");
var activityUtils = require("./activityUtils");
var mailBiz = require("uw-mail").mailBiz;
var userSurveyBiz = require("uw-user-survey").userSurveyBiz;
var ActivityRecordEntity = require("uw-entity").ActivityRecordEntity;

var ds = require("uw-ds").ds;

var formula = require("uw-formula");


var _calRandomHero = function (userData, randomHero) {
    if(!randomHero) return;
    var getHeroTypeCount = parseInt(randomHero[0] || 0), getHeroNum = parseInt(randomHero[1] || 0);
    var reRandomData = userUtils.getRandomHeroData(consts.heroGetType.normal, getHeroTypeCount, getHeroNum, userData);
    for (var locHeroId in reRandomData) {
        var locHeroCount = parseInt(reRandomData[locHeroId] || 0);
        userUtils.addHero(userData, locHeroId, locHeroCount);
    }
};

/**
 * 获取7天登陆礼包详细
 * @param client
 * @param userId
 * @param cb
 */
exports.getSevenLogin = function (client, userId, cb) {
    async.parallel([
        function (cb1) {
            userDao.select(client, {id:userId}, cb1);
        },
        function (cb1) {
            activityDao.select(client, {type: c_prop.activityTypeKey.sevenLogin, isOpen: 1}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0], activityData = data[1];
        if (!activityData) return cb(null, null);//活动不存在，或者未开启
        var activity = userData.activity;
        var receiveData = activity[activityData.id] || [];
        var receiveCount = receiveData.length;
        if (receiveCount >= activityData.items.length) return cb(null, null);//已经领取完

        //返回数据
        _calActivityData(client,activityData,userData,function(err,reActivity){
            if (err) return cb(err);
            cb(null, reActivity);
        });
    });
};


//获取主要精彩活动列表
exports.getList = function(client, userId, cb){
    async.parallel([
        function(cb1){
            var strWhere = " isOpen = 1 and ( startTime is null or (startTime <? and endTime>?)) order by sort desc";
            var args = [new Date(),new Date()];
            activityDao.list(client,strWhere, args,cb1);
        },
        function (cb1) {
            userDao.select(client, {id:userId}, cb1);
        }
    ],function(err,data){
        if (err) return cb(err);
        var activityList = data[0],userData = data[1];
        var reList = [];
        async.map(activityList,function(activityData,cb1){
            _calActivityData(client,activityData,userData,function(err,reActivity){
                if (err){
                    cb1(err);
                }else{
                    var locIsNeed = checkOpBiz.isNeedOp(userData, reActivity);
                    reActivity.isNeedOp =  locIsNeed;

                    var isNeedLvl = checkOpBiz.isNeedLvl(userData, reActivity);
                    if(isNeedLvl) {
                        reList.push(reActivity);
                    }
                    cb1(null);
                }
            });
        },function(err,data){
            if (err) return cb(err);
            cb(null, reList);
        });
    });
};

/**
 * 判断是否需要操作
 * @param client
 * @param userId
 * @param cb
 * @returns {"活动id":"是否需要操作(0|1)",.....}
 */
exports.getIsNeedOperate = function(client,userId,cb){
    async.parallel([
        function(cb1){
            var strWhere = " isOpen = 1 and ( startTime is null or (startTime <? and endTime>?))  order by sort desc";
            var args = [new Date(),new Date()];
            activityDao.list(client,strWhere, args,cb1);
        },
        function (cb1) {
            userDao.select(client, {id:userId}, cb1);
        }
    ],function(err,data){
        if (err) return cb(err);
        var activityList = data[0], userData = data[1];
        var reData = {};
        async.map(activityList, function (locData, cb1) {
            _calActivityData(client, locData, userData, function (err, reActivity) {
                if (err) {
                    cb1(err);
                } else {
                    var locIsNeed = checkOpBiz.isNeedOp(userData, reActivity);
                    reData[reActivity.id] = locIsNeed;
                    //大红点
                    if(locIsNeed&&reActivity.type != c_prop.activityTypeKey.firstRecharge&&reActivity.type != c_prop.activityTypeKey.sevenLogin){
                        reData["-1"] = 1;
                    }
                    cb1(null);
                }
            });
        }, function (err, data) {
            if (err) return cb(err);
            cb(null, reData);
        });
    });
};

/**
 * 领取活动
 * @param client
 * @param userId
 * @param index
 * @param activityId
 * @param cb
 */
exports.receive = function(client, userId, activityId,index, cb){
    async.parallel([
        function (cb1) {
            userDao.select(client, {id:userId}, cb1);
        },
        function (cb1) {
            activityDao.select(client, {id: activityId, isOpen: 1}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0], activityData = data[1];
        if (!activityData)  return cb(getMsg(c_msgCode.activitiesEnd));//活动不存在，或者未开启
        var oldDiamond = userData.diamond, costDiamond = 0, getDiamond = 0;
        //活动已经结束
        _calActivityData(client,activityData,userData,function(err,exActivity){
            if (err) return cb(err);
            if(exActivity.activity.startTime){
                //不在时间范围内
                if(exActivity.activity.startTime.isAfter(new Date())||exActivity.activity.endTime.isBefore(new Date())){
                    return cb(getMsg(c_msgCode.activitiesEnd));//活动结束
                }
            }
            var receiveFunc = receiveFun[exActivity.activity.type];

            if(receiveFunc){
                receiveFunc(client, userData, exActivity, index, function(err, receiveData){
                    if (err) return cb(err);
                    var items = receiveData[0];
                    var lotteryItemsArr = receiveData[1];
                    var luckyTalosItemArr = receiveData[2];
                    var delbag = receiveData[3];
                    var exItem = receiveData[4];
                    var itemsArr = [];
                    var bagItems = {};
                    var equipBagItems = {};
                    var getGold = 0;
                    if(exActivity.activity.type == c_prop.activityTypeKey.mysterShop){
                        mailBiz.addByType(client, userId, c_prop.mailTypeKey.mysterShop, [], items, function(){});
                    }else if(exActivity.activity.type == c_prop.activityTypeKey.appMysterShop){
                        mailBiz.addByType(client, userId, c_prop.mailTypeKey.mysterShop, [], items, function(){});
                    }else if(exActivity.activity.type == c_prop.activityTypeKey.limitPanicBuying || exActivity.activity.type == c_prop.activityTypeKey.newLimitPanicBuying){
                        mailBiz.addByType(client, userId, c_prop.mailTypeKey.limitPanicBuyingAward, [], items, function(){});
                        bagItems = delbag;
                    }else if(exActivity.activity.type == c_prop.activityTypeKey.everydayCharge) {
                        mailBiz.addByType(client, userId, c_prop.mailTypeKey.everydayChargeAward, [index+1], items, function(){});
                    }else if (exActivity.activity.type == c_prop.activityTypeKey.rebate) {
                        mailBiz.addByType(client, userId, c_prop.mailTypeKey.rebate, [exActivity.activityItems[index].diamond], items, function () {
                        });
                    }else if(exActivity.activity.type == c_prop.activityTypeKey.setTheWord) {
                        mailBiz.addByType(client, userId, c_prop.mailTypeKey.setTheWord, [], items, function () {
                        });
                        bagItems = delbag;
                    }else if(exActivity.activity.type == c_prop.activityTypeKey.vPlan) {
                        mailBiz.addByType(client, userId, c_prop.mailTypeKey.vPlan, [], items, function () {
                        });
                    }else if(exActivity.activity.type == c_prop.activityTypeKey.userSurvey){
                        mailBiz.addByType(client, userId, c_prop.mailTypeKey.userSurvey, [], items, function () {
                        });
                    } else if(exActivity.activity.type == c_prop.activityTypeKey.luckyTalos || exActivity.activity.type == c_prop.activityTypeKey.luckyMajong || exActivity.activity.type == c_prop.activityTypeKey.newLuckyMajong) {
                        getGold = items[c_prop.spItemIdKey.gold] || 0;
                        bagItems = delbag;
                        itemsArr = userUtils.saveItems(userData, items);
                        if (Object.keys(itemsArr[0]).length > 0) bagItems = propUtils.mergerProp(bagItems, itemsArr[0]);
                        if (Object.keys(itemsArr[1]).length > 0) equipBagItems = propUtils.mergerProp(equipBagItems, itemsArr[1]);
                    } else{
                        itemsArr = userUtils.saveItems(userData,items);
                        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
                        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
                    }

                    var count = items[c_prop.spItemIdKey.starStone]||0;
                    if(count>0){
                        var upStarStoneObj = new UpStarStoneObj();
                        upStarStoneObj.type = c_prop.biLogTypeKey.upStarStone;
                        upStarStoneObj.serverId = userData.serverId;
                        upStarStoneObj.accountId = userData.accountId;
                        upStarStoneObj.userId = userData.id;
                        upStarStoneObj.nickName = userData.nickName;
                        upStarStoneObj.happenTime = (new Date()).toFormat("YYYY-MM-DD HH24:MI:SS");
                        upStarStoneObj.upStarWay = c_prop.upStarWayKey.activity;  /** 升星石获得途径 **/
                        upStarStoneObj.upStarCount = count;  /** 升星石获得数量 **/
                        biBiz.upStarStoneBi(JSON.stringify(upStarStoneObj));
                    }

                    //gold,diamond,buyDiamond,giveDiamond,bag,equipBag,prestige
                    //var bag = userData.bag;
                    //var medalData = userData.medalData;
                    //for(var key in t_medal){
                    //    var medalId = t_medal[key].id;
                    //    if(!medalData[medalId] && bag[medalId] && bag[medalId] > 0 ){
                    //        userData.medalData[medalId] = [parseInt(medalId)*100];
                    //        userData.bag[medalId] -= 1;
                    //        bagItems[medalId] -= 1;
                    //        if(userData.bag[medalId] == 0) delete userData.bag[medalId];
                    //        if(bagItems[medalId] == 0) delete bagItems[medalId];
                    //    }
                    //}
                    var updateData = {
                        activity:userData.activity,
                        gold: userData.gold,
                        diamond: userData.diamond,
                        buyDiamond: userData.buyDiamond,
                        giveDiamond: userData.giveDiamond,
                        bag: userData.bag,
                        equipBag: userData.equipBag,
                        prestige: userData.prestige,
                        sign: userData.sign,
                        medalData: userData.medalData
                    };

                    if (userData.diamond < oldDiamond) {
                        costDiamond = oldDiamond - userData.diamond;
                    }

                    if (userData.diamond > oldDiamond) {
                        getDiamond =  userData.diamond-oldDiamond;
                    }

                    userDao.update(client,updateData,{id:userId},function(err,data){
                        if(err) return cb(err);
                        delete updateData.bag;
                        delete updateData.equipBag;
                        _recordActivityRecord(client,userData,activityId, exActivity.activity.type,getDiamond, costDiamond);
                        cb(null,[updateData,costDiamond,getDiamond,bagItems,equipBagItems,lotteryItemsArr,luckyTalosItemArr,exItem,getGold]);
                    });
                });
            }else{
                return cb(null,[{},0,0,{},{},[]]);
            }

        });
    });
};

/**
 * 神秘商店购买礼包
 * @param client
 * @param activityId
 * @param userId
 * @param index
 * @param cb
 */
exports.buyMysterShop = function(client,activityId,userId,index,cb){
    index = parseInt(index);
    async.parallel([
        function (cb1) {
            userDao.select(client, {id:userId}, cb1);
        },
        function (cb1) {
            activityDao.select(client, {id: activityId, isOpen: 1}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0], activityData = data[1];
        if (!activityData)  return cb(getMsg(c_msgCode.activitiesEnd));//活动不存在，或者未开启

        var items = {};
        var consume = 99999;        //消耗
        var currencyType = 0;       //货币类型
        var costDiamond = 0;
        var integral = 0;       //积分
        var rate = 1;       //积分倍率
        var isCrit = false;
        var exValues =  activityData.exValues;
        if (!exValues[0]) return cb("参数错误");
        var mysterShop = c_mysterShop[exValues[0]];
        if (!mysterShop) return cb("参数错误");
        var randomNum = _getRandomNumber(1, 100);
        if (randomNum <= c_game.mysterShopCfg[0]) {
            rate = c_game.mysterShopCfg[1]/100;
            isCrit = true;
        }
        switch (index){
            case 0:
                var giftBag1 = mysterShop.giftBag1;
                items[giftBag1[0]]=giftBag1[1];             //[礼包ID，礼包数量，货币类型（1金币，2元宝），货币数量，获得积分]
                currencyType=giftBag1[2];
                consume=giftBag1[3];
                integral=giftBag1[4]*rate;
                break;
            case 1:
                var giftBag2 = mysterShop.giftBag2;
                items[giftBag2[0]]=giftBag2[1];             //[礼包ID，礼包数量，货币类型（1金币，2元宝），货币数量，获得积分]
                currencyType=giftBag2[2];
                consume=giftBag2[3];
                integral=giftBag2[4]*rate;
                break;
        }

        //扣除货币
        if(currencyType == 1){      //金币
            if(userData.gold < consume) return cb("金币不足");
            userUtils.addGold(userData,consume*-1);
        }else if(currencyType == 2){        //元宝
            if(userData.diamond < consume) return cb("元宝不足");
            costDiamond = consume;
            userUtils.reduceDiamond(userData,consume);
        }else{
            return cb("参数错误");
        }
        //添加积分
        if(!userData.activity[activityData.id]){
            userData.activity[activityData.id] = [integral,[],new Date()];               //[积分,[领取次数,领取次数,领取次数],积分最后获得时间]
        }else{
            if(userData.activity[activityData.id][2]){
                var actTime = userData.activity[activityData.id][2];
                if(activityData.startTime && (activityData.startTime.isAfter(actTime)||activityData.endTime.isBefore(actTime))){        //判断积分是否是本次活动积分
                    userData.activity[activityData.id] = [integral,[],new Date()];
                }else{
                    userData.activity[activityData.id][0] += integral;
                    userData.activity[activityData.id][2] = new Date();
                }
            }
        }

        var bagItems = {};
        var equipBagItems = {};
        var itemsArr = userUtils.saveItems(userData,items);
        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);

        _logMysterShop(userData,items);

        var updateData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag,
            prestige: userData.prestige,
            exData: userData.exData,
            sign:userData.sign,
            activity:userData.activity
        };

        userDao.update(client, updateData, {id:userId}, function(err,data){
            if(err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            cb(null, [updateData,bagItems,equipBagItems,costDiamond,[isCrit,integral]]);
        });
    });
};


/**
 * 补签
 * @param client
 * @param activityId
 * @param userId
 * @param cb
 */
exports.patchSign = function(client, activityId, userId, cb){
    async.parallel([
        function (cb1) {
            userDao.select(client, {id:userId}, cb1);
        },
        function (cb1) {
            activityDao.select(client, {id: activityId, isOpen: 1}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0], activityData = data[1];
        if (!activityData)  return cb(getMsg(c_msgCode.activitiesEnd));//活动不存在，或者未开启
        _calActivityData(client,activityData,userData,function(err,exActivity) {
            if (err) return cb(err);
            var diamond = userData.diamond;
            var signData = userData.sign || [];          //0：签到次数1：签到时间
            var signTime = signData[1];
            if(signTime) signTime = signData[1] = new Date(signTime);
            //判断今日是否已经签到
            if(!activityUtils.isTodaySigned(signData)) return cb("今日还未签到,不能进行补签");       //今日已经签到
            //补签条件
            var days = parseInt(new Date().getDate());
            if(signData[0] + 1 > days) return cb("超出了补签日期");
            //var nowDays = new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate();
            //if(signData[0] + 1 > nowDays) return cb("超出了签到日期");
            var diamondNum = c_game.patchSignCon[0];
            if(diamond < diamondNum) return cb("元宝不足");
            userUtils.reduceDiamond(userData,diamondNum);

            //获取补签物品
            var now = new Date();
            var signNum = activityUtils.getSignNum(signData);
            var id = (now.getMonth() + 1) * 100 + signNum + 1;
            var signDataItems = exActivity.activity.exValues[id];

            var bagItems = {};
            var equipBagItems = {};
            var itemsArr = userUtils.saveItems(userData,signDataItems);
            if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
            if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
            var getGold = userUtils.getNumOfItems(signDataItems,c_prop.itemTypeKey.gold);
            var getDiamond = userUtils.getNumOfItems(signDataItems,c_prop.itemTypeKey.diamond);

            //更新签到次数和时间
            signData[0] = signNum+1;
            signData[1] = new Date();
            userData.sign = signData;

            var updateData = {
                gold: userData.gold,
                diamond: userData.diamond,
                buyDiamond: userData.buyDiamond,
                giveDiamond: userData.giveDiamond,
                bag: userData.bag,
                equipBag: userData.equipBag,
                prestige: userData.prestige,
                exData: userData.exData,
                sign:userData.sign
            };

            userDao.update(client, updateData, {id:userId}, function(err,data){
                if(err) return cb(err);
                delete updateData.bag;
                delete updateData.equipBag;
                cb(null, [updateData,getGold,getDiamond,bagItems,equipBagItems,diamondNum]);
            });
        });

    });
};

/***
 * 处理每日累充
 *
 */
exports.dayRecharge= function(client, userData, cb){
    var strWhere = " isOpen = 1 and type = ? and ( startTime is null or (startTime <? and endTime>?)) order by sort desc";
    var now = new Date();
    var args = [c_prop.activityTypeKey.dayRecharge,now,now];
    var groupList = [];
    var tempCount = 0;
    var tempList = [];
    var max = 1000;//
    activityDao.list(client,strWhere, args,function(err, activityList){
        if(err) return cb(err);
        if(!activityList) return cb(null);
        async.map(activityList,function(activityData,cb1) {

            var startTime = activityData.startTime;
            var endTime = activityData.endTime;
            var period = 1;

            var diffDays = startTime.clone().clearTime().getDaysBetween(now.clone().clearTime());
            var sTime = startTime.clone().addDays(diffDays);
            if(sTime.isAfter(now)){
                sTime.addDays(-period);
                diffDays -= period;
            }
            var eTime = sTime.clone().addDays(period);
            if (eTime.isAfter(endTime)) {
                eTime = endTime;
            }
            var userId = userData.id;
            rechargeDao.getPeriodCount(client, userId, sTime, eTime, function(err, todayRecharge){
                if(err) return cb(err);
                var exValues = activityData.exValues;
                var items = activityData.items;
                var days = diffDays;
                for(var index=0; index < exValues.length; index++) {
                    var itemData = items[index];
                    if(!itemData) return cb("index:"+index+",参数有误");
                    var needRecharge = exValues[index];
                    if(todayRecharge < needRecharge){
                        continue;
                    }
                    var revieData = userData.activity[activityData.id] || [];
                    var r = revieData[days] || [];
                    if (r[index] && r[index] == 1) {
                        continue;
                    }

                    r[index] = 1;
                    revieData[days] = r;
                    userData.activity[activityData.id] = revieData;
                    var rmb = exValues[index];
                    if (todayRecharge >= rmb) {
                        //mailBiz.addByType(client, userId, c_prop.mailTypeKey.dayRecharge, [rmb], items[i], function () {
                        //});
                        var mailEntity = mailBiz.createEntityByType(userId, c_prop.mailTypeKey.dayRecharge, [rmb], items[index]);
                        mailEntity.addTime = new Date();
                        tempList.push(mailEntity);
                        if(tempCount>=max){
                            tempCount = 0;
                            groupList.push(tempList.concat([]));
                            tempList.length =0;
                        }
                        tempCount++;
                    }
                }
                cb1(null);
            });

        },function(err, data){
         if(err)  return cb(err);
         async.parallel([
             function(cb1){
                 if(tempList.length >0){
                     groupList.push(tempList.concat([]));
                 }
                 if(groupList.length >0 ) {
                     async.map(groupList, function (group, cb2) {
                         mailBiz.addMailByList(client, group, cb2);
                     }, cb1)
                 }else {
                     return cb1(null);
                 }
             },
             function(cb1){
                var updateUser = {
                    activity: userData.activity
                }
                 userDao.update(client, updateUser, {id:userData.id}, cb1)
             }
             ],function(err, data){
             if(err) cb(err);
             cb(null);
         })
        });
    });
};

/***
 * 上报用户调研数据
 *
 */
exports.report= function(client,activityId,userId,report, cb) {
    userSurveyBiz.report(client, activityId,userId, report, function(err, data){
        if(err) return cb(err);
        return cb(null, data);
    });
};
/***************************************************private*************************************************/
var _recordActivityRecord = function(client, userData, activityId, activityType, getDiamond, costDiamond){
    activityRecordDao.select(client,{userId:userData.id,activityId:activityId},function(err, activityRecord){
        if(err) return console.log(err);
        if(!activityRecord){//无数据插入
            var activityRecordEntity = new ActivityRecordEntity();
            activityRecordEntity.userId = userData.id;
            activityRecordEntity.userLvl = userData.lvl;
            activityRecordEntity.userVip = userData.vip;
            activityRecordEntity.activityId = activityId;
            activityRecordEntity.activityType = activityType;
            activityRecordEntity.costDiamond  = costDiamond;
            activityRecordEntity.getDiamond = getDiamond;
            activityRecordEntity.joinCount = 1;
            activityRecordEntity.addTime = new Date();
            activityRecordEntity.updateTime = new Date();
            activityRecordDao.insert(client, activityRecordEntity, function(err){if(err) console.log(err)});
        }else { //有数据更新
            var costTotalDiamond = activityRecord.costDiamond || 0;
            var getTotalDiamond = activityRecord.getDiamond || 0;
            var joinCount = activityRecord.joinCount || 0;
            costTotalDiamond += costDiamond;
            getTotalDiamond += getDiamond;
            joinCount += 1;
            var updateActivityRecord = {
                costDiamond:costTotalDiamond,
                getDiamond: getTotalDiamond,
                joinCount: joinCount,
                updateTime: new Date()
            };
            activityRecordDao.update(client, updateActivityRecord,{id:activityRecord.id},function(err){if(err) console.log(err)});
        }
    })
}


//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};

var _calActivityData = function(client,activityData,userData,cb){
    var reActivity = new ds.ExActivity();
    reActivity.activity = activityData;
    var now = new Date();
    if(now.isBefore(activityData.endTime)){
        reActivity.leftTime = now.getSecondsBetween(activityData.endTime);
    }
    var reItems = [];
    for(var i = 0;i<activityData.items.length;i++){
        var items = activityData.items[i];
        var exValue = activityData.exValues[i];
        var exValue2 = activityData.exValues2[i];
        var exValue3 = activityData.exValues3[i];
        var randomHero = activityData.randomHeroes[i];
        var aItem = new ds.ActivityItem();
        //activityTypeKey : {firstRecharge:1,sevenLogin:2,limitBuy:3,dayChargeCount:4,allChargeCount:5,dayCostCount:6,allCostCount:7,upLvl:8,redeemCode:9},
        aItem.items = items;
        //aItem.randomHero = randomHero;
        switch (activityData.type){
            case c_prop.activityTypeKey.firstRecharge:
            case c_prop.activityTypeKey.sevenLogin:
                aItem.items = items;
                break;
            case c_prop.activityTypeKey.limitBuy:
            case c_prop.activityTypeKey.limitBuyRange:
                aItem.diamond = exValue;
                aItem.limitNum = exValue2;
                aItem.discount = exValue3;
                break;
            case c_prop.activityTypeKey.dayChargeCount:
            case c_prop.activityTypeKey.allChargeCount:
            case c_prop.activityTypeKey.singleCharge:
            case c_prop.activityTypeKey.dayRecharge:
                aItem.rmb = exValue;
                break;
            case c_prop.activityTypeKey.dayCostCount:
            case c_prop.activityTypeKey.allCostCount:
            case c_prop.activityTypeKey.rebate:
                aItem.diamond = exValue;
                break;
            case c_prop.activityTypeKey.upLvl:
                aItem.userLvl = exValue;
                break;
            case c_prop.activityTypeKey.upVip:
                aItem.vipLvl = exValue;
                break;
            case c_prop.activityTypeKey.limitPanicBuying:
                aItem.limitNum = exValue2;
                break;
            case c_prop.activityTypeKey.everydayCharge:
                aItem.rmb = exValue;
                break;
            case c_prop.activityTypeKey.setTheWord:
                aItem.wordSet = exValue;
            case c_prop.activityTypeKey.vPlan:
                aItem.vPlan = exValue;
            default:
                aItem.items = items;
                break;
        }
        reItems.push(aItem);
    }

    if(activityData.type == c_prop.activityTypeKey.everydayCharge){
        var aItem = new ds.ActivityItem();
        aItem.rmb = activityData.exValues[0];
        reItems.push(aItem);
    }

    reActivity.activityItems = reItems;
    _calCostRecharge(client,reActivity,userData,function(err,data){
        if(err) return cb(err);
        cb(null,reActivity);
    });
};

var _calCostRecharge = function(client,exActivity,userData,cb){
    switch (exActivity.activity.type) {
        case c_prop.activityTypeKey.firstRecharge:
            rechargeDao.getAllCount(client, userData.id,(new Date()).addYears(-5),new Date(), function (err, allRecharge) {
                if(err) return cb(err);
                exActivity.allRecharge = allRecharge;
                cb(null);
            });
            break;
        case c_prop.activityTypeKey.dayChargeCount:
            rechargeDao.getTodayCount(client, userData.id, function (err, todayRecharge) {
                if(err) return cb(err);
                exActivity.todayRecharge = todayRecharge;
                cb(null);
            });
            break;
        case c_prop.activityTypeKey.allChargeCount:
            rechargeDao.getAllCount(client, userData.id, exActivity.activity.startTime, exActivity.activity.endTime, function (err, allRechargeCount) {
                if(err) return cb(err);
                exActivity.allRecharge = allRechargeCount;
                cb(null);
            });
            break;
        case c_prop.activityTypeKey.dayCostCount:
            gameRecordDao.getTodayCost(client, userData.id, function (err, todayCost) {
                if(err) return cb(err);
                exActivity.todayCost = todayCost;
                cb(null, todayCost);
            });
            break;
        case c_prop.activityTypeKey.dayRecharge:
            var startTime = exActivity.activity.startTime;
            var endTime = exActivity.activity.endTime;
            var period = 1;
            var now = new Date();
            var diffDays = startTime.clone().clearTime().getDaysBetween(now.clone().clearTime());
            var sTime = startTime.clone().addDays(diffDays);
            if(sTime.isAfter(now)){
                sTime.addDays(-period);
                diffDays -= period;
            }
            var eTime = sTime.clone().addDays(period);
            if(eTime.isAfter(endTime)){
                eTime = endTime;
            }
            exActivity.leftTime = now.getSecondsBetween(eTime);
            exActivity.days = diffDays;
            rechargeDao.getPeriodCount(client, userData.id, sTime, eTime, function(err, todayRecharge){
                if(err) return cb(err);
                exActivity.todayRecharge = todayRecharge;
                cb(null, todayRecharge);
            });
            break;
        case c_prop.activityTypeKey.allCostCount:
            gameRecordDao.getAllCost(client, userData.id, exActivity.activity.startTime, exActivity.activity.endTime, function (err, allCost) {
                if(err) return cb(err);
                exActivity.allCost = allCost;
                cb(null, allCost);
            });
            break;
        case c_prop.activityTypeKey.rebate:
            var userActivityData = userData.activity[exActivity.activity.id];
            if(userActivityData){
                exActivity.allCost = userActivityData[0] || 0;
            }else {
                exActivity.allCost  = 0;
            }
            cb(null);
            break;
        case c_prop.activityTypeKey.fiveDaysTarget:
            exActivity.days = _getCurDay(exActivity.activity);
            cb(null);
            break;
        case c_prop.activityTypeKey.newFourDays:
            exActivity.days = _getCurDay(exActivity.activity);
            cb(null);
            break;
        case c_prop.activityTypeKey.everydayCharge:
            async.parallel([
                function(cb1) {
                    var payMoney = exActivity.activityItems[0].rmb || 9999;
                    rechargeDao.getRechargeDays(client, userData.id, exActivity.activity.startTime, exActivity.activity.endTime, payMoney, function (err, rechargeDays) {
                        if (err) return cb1(err);
                        exActivity.days = rechargeDays;
                        cb1(null);

                    });
                },
                function(cb1){
                    rechargeDao.getTodayCount(client, userData.id, function (err, todayRecharge) {
                        if(err) return cb1(err);
                        exActivity.todayRecharge = todayRecharge;
                        cb1(null);
                    });
                }
            ],function(err, data){
               if(err) return cb(err);
                cb(null);
            });
            break;
        case c_prop.activityTypeKey.vPlan:
            rechargeDao.getMaxRechargeMoney(client, userData.id, exActivity.activity.startTime, exActivity.activity.endTime, function(err, maxPaymoney){
                if(err) return cb(err);
                exActivity.maxPaymoney = maxPaymoney;
                cb(null);
            })
            break;
        case c_prop.activityTypeKey.luckyMajong:
            var userActivityData = userData.activity[exActivity.activity.id];
            exActivity.luckValue = userActivityData || 0;
            cb(null);
            break;
        default :
            cb(null);
            break;
    }
};

/**
 * 获得当前活动到第几天
 * @param activityData
 * @return day
 */
var _getCurDay = function(activityData){
    var today = new Date();
    if (!activityData || today.isAfter(activityData.endTime) || activityData.startTime.isAfter(today)) {
        return -1;
    }
    var startTemp = new Date();
    startTemp.setFullYear(activityData.startTime.getFullYear(), activityData.startTime.getMonth(), activityData.startTime.getDate());
    startTemp.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    var diff =  today - startTemp;
    return  Math.floor((diff)/1000  /  60  /  60  /24);
}

var _logMysterShop = function(userData,getObj){
    var upStarStoneObj = new MysterShopObj();
    upStarStoneObj.type = c_prop.biLogTypeKey.mysterShop;
    upStarStoneObj.serverId = userData.serverId;
    upStarStoneObj.accountId = userData.accountId;
    upStarStoneObj.userId = userData.id;
    upStarStoneObj.nickName = userData.nickName;
    upStarStoneObj.happenTime = (new Date()).toFormat("YYYY-MM-DD HH24:MI:SS");
    upStarStoneObj.getObj = getObj;  /** 升星石获得途径 **/
    biBiz.mysterShopBi(JSON.stringify(upStarStoneObj));
}

var _queryList = function(cb){
    var sql = "select * from uw_activity where isOpen = 1 and ( startTime is null or (startTime <? and endTime>?)) order by sort desc";
    client.query(sql, [new Date(), new Date()], function(err, dataList){
        if(err) return cb(err);
        var self = activityDao;
        var castCols = self.castCols;
        if(castCols){
            for (var i = 0, li = dataList.length; i < li; i++) {
                var data = dataList[i];
                for (var key in castCols) {
                    var value = data[key];
                    if(value){
                        //todo oldma 遇到单倍数正斜线会报错,所以double一下
                        if(data.type != c_prop.activityTypeKey.limitPanicBuying) {
                            value = value.replace(/\\/g, '\\\\');
                            data[key] = JSON.parse(value);
                        }else {
                            data[key] = value;
                        }
                    }else{
                        var castType = castCols[key];
                        if(castType == BaseDao.CAST_ARRAY) value = [];
                        else if(castType == BaseDao.CAST_OBJECT) value = {};
                        data[key] = value;
                    }
                }
            }
        }
        cb(null, dataList);
    });
}
