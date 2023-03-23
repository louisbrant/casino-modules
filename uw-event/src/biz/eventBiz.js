var uwData = require("uw-data");
var formula = require("uw-formula");
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var c_prop = uwData.c_prop;
var c_game = uwData.c_game;
var c_event = uwData.c_event;
var c_effect = uwData.c_effect;
var t_item = uwData.t_item;
var UserEntity = require('uw-entity').UserEntity;
var EventEntity = require('uw-entity').EventEntity;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var commonUtils = require("uw-utils").commonUtils;
var exports = module.exports;
var eventDao = require("../dao/eventDao");
var userDao = require("uw-user").userDao;
var userUtils = require("uw-user").userUtils;

/**
 * 随机事件
 * @param client
 * @param userId
 * @param randomCfg1Type
 * @param cb
 */
exports.randomEvent = function(client,userId,lvl,randomCfg1Type,cb){
    var randomCfg1Prob = _getRandomCfg1Prob(randomCfg1Type);
    var randomNum1 = _getRandomNumber(1,10000);
    //判断是否产生随机事件
    if(randomNum1 > randomCfg1Prob) return cb(null,[0,null]);
    //获取事件数据
    _getRecordData(client,userId,function(err,eventData) {
        if (err) return cb(err);
        var beginEvents = eventData.beginEvents || [];
        var record = eventData.record;
        eventData.items = {};
        var eventId = 0;//需要返回去的id
        //初始必须触发的事件
        for (var i = 0; i < c_game.randomCfg3.length; i++) {
            var locInitId = c_game.randomCfg3[i];
            if (beginEvents.indexOf(locInitId) < 0) {
                eventId = locInitId;
                eventData.beginEvents.push(eventId);
                break;
            }
        }
        //概率触发
        if(!eventId){
            //事件1~9
            var randomNum2 = _getRandomNumber(1,10000);
            var randomCfg2Type = 0;
            for(var i = 0; i < c_game.randomCfg2.length; i++){      //正常事件
                if(c_game.randomCfg2[i] >= randomNum2){
                    randomCfg2Type = i + 1;
                    break;
                }
            }
            var userLvl = lvl;
            var weightNum = 0;
            var weight = 0;
            var weightIdArr = [];
            for(var key in c_event){
                var locEventData = c_event[key];
                if(key == 10000 || key == 10001 || key == 10002 || key == 10003 || key == 10004){
                    continue;
                }

                var type = locEventData.type;
                var eventLvl = locEventData.lvl;
                if(type == randomCfg2Type && userLvl >= eventLvl){
                    weightNum = weightNum + locEventData.weight;
                    weightIdArr.push(locEventData.id);
                }
            }
            var eventRandomNum = _getRandomNumber(1,weightNum);
            for(var i = 0; i< weightIdArr.length; i++){
                var locWeightId = weightIdArr[i];
                weight = weight + c_event[locWeightId].weight;
                if(weight >= eventRandomNum){
                    eventId = locWeightId;
                    break;
                }
            }
        }
        if(!eventId) return cb(null,[0,null]);
        //更新数据
        if(!record[eventId]){
            record[eventId] = [1,1,0];
        }else{
            record[eventId] = [1,record[eventId][1] + 1,0];
        }
        _getEventIdItems(client,userId,eventId,function(err,data){
            if(err) return cb(err);
            var returnData = [];
            returnData[0] = eventId;
            returnData[1] = data;
            eventData.items = {};
            eventData.items = data;
            var updateData ={
                beginEvents:eventData.beginEvents,
                record:eventData.record,
                items:eventData.items
            };
            eventDao.update(client,updateData,{id:eventData.id},function(err,data){
                if(err) return cb(err);
                return cb(null,returnData);
            });
        });
    });
};


/**
 * 随机事件购买
 * @param client
 * @param userId
 * @param eventId
 * @param cb
 */
exports.eventBuy = function(client,userId,eventId,cb){
    var locEventData = c_event[eventId];
    if(!c_event[eventId]) return cb("没有该随机事件");
    eventDao.select(client,{userId:userId},function(err,eventData) {
        if (err) return cb(err);
        if(!eventData) return cb("没有该条记录");
        var id = eventData.id;
        var record = eventData.record;
        var items = eventData.items;
        if(!record[eventId]) return cb("没有该随机事件记录");
        var isOpen = record[eventId][0];
        if(isOpen == 0) return cb("事件未开启");

        userDao.select(client,{id:userId},function(err,userData) {
            if (err) return cb(err);
            var effectId = locEventData.effectId;
            var addValue1 = locEventData.addValue1;
            var costDiamond = locEventData.costDiamond;
            if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));         //钻石不足

            userUtils.saveItems(userData, items);                           //保存items数据

            if(addValue1.length > 1) {                                       //提升属性
                var addValue1Type = addValue1[0];
                var addValue1Count = addValue1[1];
                _getAddValue1(userData,addValue1Type,addValue1Count);
            }

            if (c_event[eventId].conTime != 0) {
                var value = 0;
                for(var key in items) {
                    value = items[key];
                }
                var nowTime = new Date();
                var calTime = nowTime.getTime();
                var conTime = c_event[eventId].conTime;       //效果持续时间
                calTime += conTime * 1000;
                var endTime = new Date(calTime);
                userData.conEffectData.push([effectId,nowTime,endTime,value]);
            }

            record[eventId] = [0,record[eventId][1],record[eventId][2] + 1];
            var updateEventData ={
                record:eventData.record
            };
            userUtils.reduceDiamond(userData, costDiamond);
            userUtils.calHeroProduceFix(userData);
            var updateData = {
                diamond: userData.diamond,
                exData: userData.exData,
                attack:userData.attack,
                defence:userData.defence,
                hp:userData.hp,
                crit:userData.crit,
                heroSum:userData.heroSum,
                heroStarSum:userData.heroStarSum,
                producePer:userData.producePer,
                produceFix:userData.produceFix,
                gold:userData.gold,
                bag: userData.bag,
                heroSum:userData.heroSum,
                heroStarSum:userData.heroStarSum,
                goldAddCount: userData.goldAddCount,
                offEarn:userData.offEarn,
                heroData:userData.heroData,
                copyWipeRate:userData.copyWipeRate,
                conEffectData:userData.conEffectData
            };
            async.parallel([
                function (cb1) {
                    eventDao.update(client,updateEventData,{id:id},cb1);
                },
                function (cb1) {
                    userDao.update(client,updateData,{id:userId},cb1);
                }
            ], function (err, data) {
                if (err) return cb(err);
                return cb(null, [updateData,costDiamond]);
            });
        });
    });
};
/*****************************************************************************************************/

//获取eventId对应产生的items
var _getEventIdItems = function(client,userId,eventId,cb) {
    var locEventData = c_event[eventId];
    var itemsTemp = locEventData.items;
    var items = {};
    for(var key in itemsTemp){
        items[key] = itemsTemp[key];
    }
    var effectId = locEventData.effectId;
    if (effectId != 0) {
        userDao.select(client, {id: userId}, function (err, userData) {
            if (err) return cb(err);
            var type = c_effect[effectId].type;       //效果值类型
            var valueType = c_effect[effectId].valueType;       //效果值类型
            if (valueType === 0) {        //万分率
                var value = c_effect[effectId].value / 10000;      //效果值
                switch (type) {
                }
            } else {      //固定值
                var value = c_effect[effectId].value;      //效果值
                switch (type) {
                    case  c_prop.effectTypeKey.producePer:           //提升金币生产倍率
                        var itemId = 0;
                        switch (value) {
                            case 100:
                                itemId = 1024;
                                break;
                            case 200:
                                itemId = 1025;
                                break;
                            case 500:
                                itemId = 1027;
                                break;
                        }
                        items[itemId] = value;
                        break;
                    case  c_prop.effectTypeKey.buyGoldRate:             //炼金术倍率
                        var secondProduce = userUtils.getSecondProduce(userData);
                        var goldGet = formula.calBuyGoldGet(secondProduce, userData.lvl) * value;
                        items[1100] = goldGet;
                        break;
                    case  c_prop.effectTypeKey.getComHero:             //英雄类别从玩家当前拥有的普通英雄中随机
                        var randomComHeroId = userUtils.getRandomComHeroId(userData);
                        items[randomComHeroId] = value;
                        break;
                }
            }
            return cb(null, items);
        });
    } else {
        return cb(null, items);
    }
};

//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};

//计算randomCfg1Prob
var _getRandomCfg1Prob = function(randomCfg1Type){
    var randomCfg1Prob = 0;
    switch (randomCfg1Type){
        case c_prop.randomCfg1Key.updateFinish:
            randomCfg1Prob = c_game.randomCfg1[c_prop.randomCfg1Key.updateFinish - 1];
            break;
        case c_prop.randomCfg1Key.shopFinish:
            randomCfg1Prob = c_game.randomCfg1[c_prop.randomCfg1Key.shopFinish - 1];
            break;
        case c_prop.randomCfg1Key.wipeFinish:
            randomCfg1Prob = c_game.randomCfg1[c_prop.randomCfg1Key.wipeFinish - 1];
            break;
        case c_prop.randomCfg1Key.copyFinish:
            randomCfg1Prob = c_game.randomCfg1[c_prop.randomCfg1Key.copyFinish - 1];
            break;
    }
    return randomCfg1Prob;
}

//判断是否有数据，无数据插入一条
var _getRecordData = function(client,userId,cb){
    eventDao.select(client,{userId:userId},function(err,eventData) {
        if(err) return cb(err);
        if(!eventData) {        //如果不存在该用户数据则插入一条
            var eventEntity = new EventEntity();
            eventEntity.userId = userId;
            eventEntity.beginEvents = [];
            eventEntity.record = {};
            eventDao.insert(client, eventEntity, function(err,data){
                if(err) return cb(err);
                eventEntity.id = data.insertId;
                cb(null,eventEntity);
            });
        }else{
            cb(null,eventData);
        }
    });

};

//计算基础属性
var _getAddValue1 = function(userData,addValue1Type,addValue1Count){
    switch (addValue1Type) {
        case c_prop.addValue1Key.attack:       //提升攻击
            userData.attack += addValue1Count;
            break;
        case  c_prop.addValue1Key.defence:     //提升防御
            userData.defence += addValue1Count;
            break;
        case  c_prop.addValue1Key.hp:      //提升血量
            userData.hp += addValue1Count;
            break;
        case  c_prop.addValue1Key.crit:        //提升暴击
            userData.crit += addValue1Count;
            break;
        case  c_prop.addValue1Key.produceFix:      //提升金币生产速度
            //todo 在其他地方计算
            //userData.produceFix += resultNum;
            break;
        case  c_prop.addValue1Key.producePer:      //提升金币生产速度百分比
            userData.producePer += addValue1Count;
            break;
    }
};

//计算效果
var _getEffect = function(userData,eventId,effectId){
    var type = c_effect[effectId].type;       //效果值类型
    var valueType = c_effect[effectId].valueType;       //效果值类型
    if (valueType === 0) {        //万分率
        var value = c_effect[effectId].value / 10000;      //效果值
        switch (type) {
            case c_prop.effectTypeKey.offEarnRate:       //离线收益增加百分比
                value = Math.round(userData.offEarn * value);
                userData.offEarn += value;
                break;
            case  c_prop.effectTypeKey.pkAbsence:        //名单不会出现在排位赛
                //todo
                break;
            case  c_prop.effectTypeKey.seeDetails:       //可查看排位赛人员的详细信息
                //todo
                break;
            case  c_prop.effectTypeKey.getHero:         //当前拥有类型的小弟随机增加一种xx数量
                var StochasticHreoId = exports.calStochastic(userData);
                userUtils.addHero(userData, StochasticHreoId, value);
                break;
            case  c_prop.effectTypeKey.copyWipeRate:         //提升刷野倍率
                value = Math.round(userData.copyWipeRate * value);
                userData.copyWipeRate += value;
                break;
            case  c_prop.effectTypeKey.producePer:           //提升金币生产倍率
                value = Math.round(userData.producePer * value);
                userData.producePer += value;
                break;
            case  c_prop.effectTypeKey.attack:          //提升攻击
                value = Math.round(userData.attack * value);
                userData.attack += value;
                break;
            case  c_prop.effectTypeKey.defence:          //提升防御
                value = Math.round(userData.defence * value);
                userData.defence += value;
                break;
            case  c_prop.effectTypeKey.hp:           //提升血量
                value = Math.round(userData.hp * value);
                userData.hp += value;
                break;
            case  c_prop.effectTypeKey.crit:             //提升暴击
                value = Math.round(userData.crit * value);
                userData.crit += value;
                break;
            case  c_prop.effectTypeKey.buyGoldRate:             //炼金术倍率
                var secondProduce = userUtils.getSecondProduce(userData);
                var goldGet = Math.round(formula.calBuyGoldGet(secondProduce,userData.lvl) * value);
                userUtils.addGold(userData,goldGet);
                break;
            case  c_prop.effectTypeKey.getComHero:             //英雄类别从玩家当前拥有的普通英雄中随机
                var randomComHeroId = userUtils.getRandomComHeroId(userData);
                userUtils.addHero(userData, randomComHeroId, value);
                break;
        }
    } else {      //固定值
        var value = c_effect[effectId].value;      //效果值
        switch (type) {
            case c_prop.effectTypeKey.offEarnRate:       //离线收益增加百分比
                userData.offEarn += value;
                break;
            case  c_prop.effectTypeKey.pkAbsence:        //名单不会出现在排位赛
                //todo
                break;
            case  c_prop.effectTypeKey.seeDetails:       //可查看排位赛人员的详细信息
                //todo
                break;
            case  c_prop.effectTypeKey.getHero:         //当前拥有类型的小弟随机增加一种xx数量
                var StochasticHreoId = exports.calStochastic(userData);
                userUtils.addHero(userData, StochasticHreoId, value);
                break;
            case  c_prop.effectTypeKey.copyWipeRate:         //提升刷野倍率
                userData.copyWipeRate += value;
                break;
            case  c_prop.effectTypeKey.producePer:           //提升金币生产倍率
                userData.producePer += value;
                break;
            case  c_prop.effectTypeKey.attack:          //提升攻击
                userData.attack += value;
                break;
            case  c_prop.effectTypeKey.defence:          //提升防御
                userData.defence += value;
                break;
            case  c_prop.effectTypeKey.hp:           //提升血量
                userData.hp += value;
                break;
            case  c_prop.effectTypeKey.crit:             //提升暴击
                userData.crit += value;
                break;
            case  c_prop.effectTypeKey.buyGoldRate:             //炼金术倍率
                var secondProduce = userUtils.getSecondProduce(userData);
                var goldGet = formula.calBuyGoldGet(secondProduce,userData.lvl) * value;
                userUtils.addGold(userData,goldGet);
                break;
            case  c_prop.effectTypeKey.getComHero:             //英雄类别从玩家当前拥有的普通英雄中随机
                var randomComHeroId = userUtils.getRandomComHeroId(userData);
                userUtils.addHero(userData, randomComHeroId, value);
                break;
        }
    }
    //存效果数据
    if (c_event[eventId].conTime != 0) {
        var nowTime = new Date();
        var calTime = nowTime.getTime();
        var conTime = c_event[eventId].conTime;       //效果持续时间
        calTime += conTime * 1000;
        var endTime = new Date(calTime);
        userData.conEffectData.push([effectId,nowTime,endTime,value]);
    }
}

//exports.eventBuy(uwClient,1,66,function(err,data){console.log(err,data)})
