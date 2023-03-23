/**
 * Created by Administrator on 2014/5/9.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var c_honor = uwData.c_honor;
var c_effect = uwData.c_effect;
var c_prop = uwData.c_prop;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var UserEntity = require('uw-entity').usere;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var commonUtils = require("uw-utils").commonUtils;
var shopBiz = require("uw-shop").shopBiz;
var pkBiz = require("uw-fight").pkBiz;
var formula = require("uw-formula");
var exports = module.exports;

var userDao = null;
var userUtils = null;
var crystalDao = null;
var arenaDao = null;
var checkRequire = function(){
    userDao = require("uw-user").userDao;
    userUtils = require("uw-user").userUtils;
    crystalDao = require("uw-crystal").crystalDao;
    arenaDao = require("uw-arena").arenaDao;
};

/**
 * 获取用户成就信息
 * @param client
 * @param userId
 * @param cb
 */
exports.getInfo = function(client, userId, cb){
    checkRequire();
    async.parallel([
        function(cb1){
            crystalDao.select(client,{userId:userId},cb1);
        },
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            arenaDao.select(client,{userId:userId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var crystalData = data[0],userData = data[1],arenaData = data[2];
        //刷新用户完成成就情况
        _calCondition(userData,crystalData,arenaData);
        userDao.update(client,{honorData:userData.honorData},{id:userId},function(err,updateUser){
            if (err) return cb(err);
            cb(null, userData.honorData);        //返回用户所完成的成就
        });
    });
};

/**
 * 用户领取成就奖励
 * @param client
 * @param userId
 * @param honorId
 * @param cb
 */
exports.getAward = function(client,userId,honorId,cb){
    if(!c_honor[honorId]) return cb("没有该成就数据");
    checkRequire();
    async.parallel([
        function(cb1){
            crystalDao.select(client,{userId:userId},cb1);
        },
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            arenaDao.select(client,{userId:userId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var crystalData = data[0],userData = data[1],arenaData = data[2];
        userUtils.calGold(userData);
        _calCondition(userData,crystalData,arenaData);
        var honorData = userData.honorData;
        //判断是否完成
        if(!honorData[honorId])  return cb("未完成该成就");
        //判断是否领取
        if(honorData[honorId][1] === 1)  return cb("已领取过该成就奖励");

        //计算金币、砖石奖励
        var prize = c_honor[honorId].prize;
        var getDiamond = 0;
        for(var i = 0; i < prize.length; i++ ){
            if(prize[i]){
                if(prize[i][0] === 1){       //金币
                    userUtils.addGold(userData,prize[i][1]);
                }
                if(prize[i][0] === 2){       //砖石
                    var locDiamond = prize[i][1];
                    getDiamond+=locDiamond;
                    userUtils.addDiamond(userData,locDiamond);
                }
            }
        }
        honorData[honorId][1] = 1;
        //计算效果奖励
        var effectId = c_honor[honorId].effectId;       //效果ID
        _isEffectType(effectId,userData);
        userUtils.calHeroProduceFix(userData);
        //todo
        var updateData = {
            honorData:honorData,
            heroData:userData.heroData,
            attack:userData.attack,
            crit:userData.crit,
            defence:userData.defence,
            hp:userData.hp,
            heroSum:userData.heroSum,
            heroStarSum:userData.heroStarSum,
            producePer:userData.producePer,
            produceFix:userData.produceFix,
            copyWipeRate:userData.copyWipeRate,
            offEarn:userData.offEarn,
            gold:userData.gold,
            goldAddCount:userData.goldAddCount,
            lastCalGoldTime:userData.lastCalGoldTime,
            diamond:userData.diamond
        };
        userDao.update(client,updateData,{id:userId},function(err,data){
            if (err) return cb(err);
            cb(null, [updateData,getDiamond]);        //返回用户数据
        });
    });
};

/**
 * 结算百分比类效果扣除时照成的收益加成错误修改
 * @param client
 * @param cb
 */
exports.bugAlter = function(client,cb){
    checkRequire();
    userDao.list(client, " shopData is not null",[],function(err,userList) {
        if (err) return cb(err);
        async.map(userList,function(userData,cb1){
            var honorData = userData.honorData;
            var conEffectData = userData.conEffectData||[];
            var userId = userData.id;
            var num = 0;
            userData.producePer = 0;
            userData.offEarn = 0;
            for(var i = 0;i < conEffectData.length;i++){
                var conEffectKey = conEffectData[i][0];
                if(!c_effect[conEffectKey]){
                    conEffectData.splice(i,1);
                }else{
                    if(c_effect[conEffectKey].type == c_prop.effectTypeKey.offEarnRate){        //离线收益
                        if(c_effect[conEffectKey].valueType === 0){        //万分率
                            var value = c_effect[conEffectKey].value / 10000;      //效果值
                            userData.conEffectData[i][3] = value;
                            userData.offEarn = value;
                        }else{      //固定值
                            var value = c_effect[conEffectKey].value;      //效果值
                            userData.conEffectData[i][3] = value;
                            userData.offEarn = value
                        }
                    }
                    if(c_effect[conEffectKey].type == c_prop.effectTypeKey.producePer){         //金币效益
                        if(c_effect[conEffectKey].valueType === 0){        //万分率
                            var value = c_effect[conEffectKey].value / 10000;      //效果值
                            num +=value;
                            userData.conEffectData[i][3] = value;
                        }else{      //固定值
                            var value = c_effect[conEffectKey].value;      //效果值
                            num +=value;
                            userData.conEffectData[i][3] = value;
                        }
                    }
                }
            }

            for (var honorKey in honorData) {
                honorKey = Number(honorKey);
                var effectId = c_honor[honorKey].effectId;
                if(effectId != 0){
                    if(honorData[honorKey][1] == 1){
                        if(c_effect[effectId].type == c_prop.effectTypeKey.producePer){
                            if(c_effect[effectId].valueType === 0){        //万分率
                                var value = c_effect[effectId].value / 10000;      //效果值
                                num += value;
                            }else{      //固定值
                                var value = c_effect[effectId].value;      //效果值
                                num += value;
                            }
                        }
                    }
                }
            }
            userData.producePer = num;
            var updateData = {
                offEarn:userData.offEarn,
                producePer: userData.producePer,
                conEffectData:userData.conEffectData
            };
            userDao.update(client, updateData, {id: userId}, cb1);
        },function(err,data){
            if (err) return cb(err);
            console.log("执行完毕!");
            console.log("一共[%s]条数据!",userList.length);
        });
    });
};

/*****************************************************************private********************************************************************/

//计算完成情况
var _calCondition = function(userData,crystalData,arenaData){
//刷新用户完成成就情况
    for(var key in c_honor){
        if(!(key in userData.honorData)){        //判断用户是否有该成就记录
            if(c_honor[key].need1){     //判断配置表是否有条件1
                _isCondition(key ,c_honor[key].need1, userData,crystalData,arenaData)
            }
            if(c_honor[key].need2){     //判断配置表是否有条件1
                _isCondition(key ,c_honor[key].need1, userData,crystalData,arenaData)
            }
            if(c_honor[key].need3){     //判断配置表是否有条件3
                _isCondition(key ,c_honor[key].need1, userData,crystalData,arenaData)
            }
        }
    }
};

/**
 * 判断成就完成条件
 * @param condition
 * @param userData
 */
var _isCondition = function(key ,condition, userData,crystalData,arenaData){
    var userId = userData.id;
    var honorType = condition[0];
    var honorNeed = condition[1];
    switch (honorType){
        case  c_prop.honorGetTypeKey.heroNum:     //小弟总数量
            var heroNumData = shopBiz.heroNum(userData, userId);
            if (heroNumData >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.produceNum:      //金币生产速度达到
            var produce = userUtils.getSecondProduce(userData);
            if(produce >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.goldNum:     //获得的金币总量
            var goldAddCount = userData.goldAddCount;
            if(goldAddCount >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.userLvl:     //召唤师等级
            var userLvl = userData.lvl;
            if(userLvl >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.heroType:        //小弟类型数量
            var heroTypeCount = Object.keys(userData.heroData).length;
            if (heroTypeCount >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.userRank:        //段位达到等级
            var getSectionData = pkBiz.getSection(userData);
            if (getSectionData[2] >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.pkWinCount:      //排位赛胜利场次
            var pkWinCount = userData.pkWinCount;
            if(pkWinCount >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.pkLoseCount:     //排位赛失败场次
            var pkLostCount = userData.pkCount - userData.pkWinCount;
            if(pkLostCount >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.attack:      //攻击
            var attack = userData.attack;
            if(attack >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.defence:     //防御
            var defence = userData.defence;
            if(defence >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.hp:      //血量
            var hp = userData.hp;
            if(hp >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.crit:        //暴击
            var crit = userData.crit;
            if(crit >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.crystalId:        //水晶总数
            if(!crystalData) break;
            var crystalId = crystalData.crystalId;
            if(crystalId >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
        case  c_prop.honorGetTypeKey.arenaWinCount:        //累计胜场
        if(!arenaData) break;
        var arenaWinCount = arenaData.winCount;
        if(arenaWinCount >= honorNeed){
            userData.honorData[key] = [1,0];
        }
        break;
        case  c_prop.honorGetTypeKey.arenaMaxConWinCount:        //连胜场数
            if(!arenaData) break;
            var arenaMaxConWinCount = arenaData.maxConWinCount;
            if(arenaMaxConWinCount >= honorNeed){
                userData.honorData[key] = [1,0];
            }
            break;
    }
};

/**
 * 判断效果类型
 * @param effectId
 * @param userData
 */
var _isEffectType = function(effectId, userData){
    if(effectId != 0){
        var effectType = c_effect[effectId].type;       //效果值类型
        var valueType = c_effect[effectId].valueType;       //效果值类型
        if(valueType === 0){        //万分率
            var value = c_effect[effectId].value / 10000;      //效果值
            switch (effectType) {
                case c_prop.effectTypeKey.offEarnRate:       //离线收益增加百分比
                    value = Math.round(userData.offEarn*value);
                    userData.offEarn +=  value;
                    break;
                case  c_prop.effectTypeKey.pkAbsence:     //名单不会出现在排位赛
                    //todo
                    break;
                case  c_prop.effectTypeKey.seeDetails:     //可查看排位赛人员的详细信息
                    //todo
                    break;
                case  c_prop.effectTypeKey.getHero:        //当前拥有类型的小弟随机增加一种xx数量
                    var StochasticHreoId = exports.calStochastic(userData);
                    userUtils.addHero(userData,StochasticHreoId,value);
                    break;
                case  c_prop.effectTypeKey.copyWipeRate:      //提升刷野倍率
                    value = Math.round(userData.copyWipeRate*value);
                    userData.copyWipeRate += value;
                    break;
                case  c_prop.effectTypeKey.producePer:     //提升金币生产倍率
                    value = Math.round(userData.producePer*value);
                    userData.producePer += value;
                    break;
                case  c_prop.effectTypeKey.attack:      //提升攻击
                    value = Math.round(userData.attack*value);
                    userData.attack += value;
                    break;
                case  c_prop.effectTypeKey.defence:      //提升防御
                    value = Math.round(userData.defence*value);
                    userData.defence += value;
                    break;
                case  c_prop.effectTypeKey.hp:      //提升血量
                    value = Math.round(userData.hp*value);
                    userData.hp += value;
                    break;
                case  c_prop.effectTypeKey.crit:      //提升暴击
                    value = Math.round(userData.crit*value);
                    userData.crit += value;
                    break;
            }
        }else{      //固定值
            var value = c_effect[effectId].value;      //效果值
            switch (effectType) {
                case c_prop.effectTypeKey.offEarnRate:       //离线收益增加百分比
                    userData.offEarn +=  value;
                    break;
                case  c_prop.effectTypeKey.pkAbsence:     //名单不会出现在排位赛
                    //todo
                    break;
                case  c_prop.effectTypeKey.seeDetails:     //可查看排位赛人员的详细信息
                    //todo
                    break;
                case  c_prop.effectTypeKey.getHero:        //当前拥有类型的小弟随机增加一种xx数量
                    var StochasticHreoId = exports.calStochastic(userData);
                    userUtils.addHero(userData,StochasticHreoId,value);
                    break;
                case  c_prop.effectTypeKey.copyWipeRate:      //提升刷野倍率
                    userData.copyWipeRate += value;
                    break;
                case  c_prop.effectTypeKey.producePer:     //提升金币生产倍率
                    userData.producePer += value;
                    break;
                case  c_prop.effectTypeKey.attack:      //提升攻击
                    userData.attack += value;
                    break;
                case  c_prop.effectTypeKey.defence:      //提升防御
                    userData.defence += value;
                    break;
                case  c_prop.effectTypeKey.hp:      //提升血量
                    userData.hp += value;
                    break;
                case  c_prop.effectTypeKey.crit:      //提升暴击
                    userData.crit += value;
                    break;
            }
        }
    }
};

