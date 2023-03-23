/**
 * Created by Administrator on 2014/5/16.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var formula = require("uw-formula");
var c_prop = require("uw-data").c_prop;
var c_open = require("uw-data").c_open;
var t_talisman = require("uw-data").t_talisman;
var t_item = require("uw-data").t_item;
var t_talismanLvl = require("uw-data").t_talismanLvl;
var t_talismanRes = require("uw-data").t_talismanRes;
var t_talismanSkill = require("uw-data").t_talismanSkill;
var t_talismanStar = require("uw-data").t_talismanStar;
var t_talismanCom = require("uw-data").t_talismanCom;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var HeroEntity = require("uw-entity").HeroEntity;
var ds = require("uw-ds").ds;

var exports = module.exports;

var heroDao = null;
var heroPropHelper = null;
var userUtils = null;
var userDao = null;
var checkRequire = function(){
    heroDao = heroDao || require("../dao/heroDao");
    heroPropHelper = heroPropHelper || require("./heroPropHelper");
    userUtils = userUtils || require("uw-user").userUtils;
    userDao = userDao || require("uw-user").userDao;
};

//法宝使用
exports.useTrumpItem = function(client,userId,trumpId,cb){
    checkRequire();
    if(!t_talisman[trumpId]) return cb("数据异常");
    var job = t_talisman[trumpId].job;     //法宝职业
    async.parallel([
        function(cb1){
            userDao.select(client, {id: userId}, cb1);
        },
        function(cb1){
            heroDao.list(client," userId = ? order by id asc",[userId],cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0],heroList = data[1];
        var openLvl = c_open.openTrump.lvlRequired;
        if(userData.lvl < openLvl) return cb(getMsg(c_msgCode.talismanNotOpen));

        //判断物品需要等级
        var needLvl = t_item[trumpId].level;
        if(userData.lvl < needLvl) return cb("需要"+needLvl+"级才能激活该法宝!");

        var exData = userData.exData||{};
        var delBagItems = {};
        var heroObj = {};
        var upHeroDataObj = [{}];        //需要更新的数据；
        var userResArr = [trumpId];
        for(var i = 0;i<heroList.length;i++) {
            var locHero = heroList[i];
            heroObj[locHero.tempId] = JSON.parse(JSON.stringify(locHero));
            var talismanFg = locHero.talismanFg||{};        //法宝共鸣{共鸣id:[0,1],共鸣id:[1,0],...}
            for(var key in talismanFg){
                var resonance = t_talismanRes[key].resonance;
                var talismanFgData = talismanFg[key]||[];
                for(var j = 0; j < talismanFgData.length; j++){
                    if(talismanFgData[j]){
                        if(resonance[j] && userResArr.indexOf(resonance[j]) == -1) userResArr.push(resonance[j]);
                    }
                }
            }
        }
        var heroData = heroObj[job];
        if(!heroData) return cb(getMsg(c_msgCode.noCareer));
        if(heroData.talismanData && heroData.talismanData[trumpId]) return cb("该法宝已激活");
        if(!userData.bag[trumpId] || userData.bag[trumpId] == 0) return cb("背包没有该物品");
        userData.bag[trumpId] -= 1;
        delBagItems[trumpId] = 1;
        if(userData.bag[trumpId] <= 0) delete userData.bag[trumpId];
        //法宝增加
        var baseData = t_talisman[trumpId];
        //var trumpData =[1,baseData.atStart,0,0,{}];
        heroData.talismanData[trumpId] = [1,baseData.atStart,0,0,{}];
        //trumpData[0] = 1; //初始等级
        //trumpData[1] = baseData.atStart + Math.floor((baseData.atEnd - baseData.atStart) * Math.random()); //初始资质
        //trumpData[1] = baseData.atStart; //初始资质
        //trumpData[2] = 0;//初始星级
        //trumpData[3] = 0;//最大历史星级
        //trumpData[4] = {};
       // if(!heroData.talismanData) heroData.talismanData = {};
       // heroData.talismanData[trumpId]  = trumpData;
        //记录法宝共鸣
        var trumpIdResonance = t_talisman[trumpId].resonance;      //所属共鸣编号组
        var talismanFg = heroData.talismanFg||{};
        for(var i = 0; i < trumpIdResonance.length; i++){
            var resonanceId = trumpIdResonance[i];
            if(!resonanceId) break;
            var locTalismanFg = talismanFg[resonanceId]||[];        //[0,1,...]
            var locResonance = t_talismanRes[resonanceId].resonance;        //[法宝id,法宝id，。。。]
            if(t_talisman[locResonance[0]].job==heroData.tempId){
                for(var j = 0; j < locResonance.length; j++){
                    if(!locTalismanFg[j]){      //还未激活
                        if(userResArr.indexOf(locResonance[j]) != -1) locTalismanFg[j] = 1;
                    }
                }
                heroData.talismanFg[resonanceId]=locTalismanFg;
                var isRes = true;
                var resLength = locResonance.length;
                for(var j = 0; j < resLength; j++){
                    if(!locTalismanFg[j]){
                        isRes = false;
                        break;
                    }
                }
                if(isRes){
                    var type = t_talismanRes[resonanceId].type;
                    if(type != c_prop.talismanSkillTypeKey.property){      //记录到exData
                        if(!exData[c_prop.userExDataKey.talismanSkill]) exData[c_prop.userExDataKey.talismanSkill] = {};
                        if(!exData[c_prop.userExDataKey.talismanSkill][type]) exData[c_prop.userExDataKey.talismanSkill][type] = [];
                        exData[c_prop.userExDataKey.talismanSkill][type].push(t_talismanRes[resonanceId].extraPro[0][0]);
                    }
                }
            }
        }
        //属性计算
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat = heroPropHelper.calCombat(userData,heroData);
        //更新
        var upHeroData = {
            id:heroData.id,
            propArr:heroData.propArr,
            combat:heroData.combat,
            talismanFg:heroData.talismanFg,
            talismanData: heroData.talismanData
        };
        upHeroDataObj.push([heroData.id , JSON.parse(JSON.stringify(upHeroData))]);

        for(var key in heroObj){
            var locHeroData = heroObj[key];
            if(locHeroData.id == heroData.id) continue;
            //记录法宝共鸣
            var talismanFg = locHeroData.talismanFg||{};
            var isUp = false;
            for(var k = 0; k < userResArr.length; k++){
                var talisman = t_talisman[userResArr[k]];
                var trumpIdResonance = talisman.resonance;      //所属共鸣编号组
                for(var i = 0; i < trumpIdResonance.length; i++){
                    var resonanceId = trumpIdResonance[i];
                    if(!resonanceId) break;
                    var locTalismanFg = talismanFg[resonanceId]||[];        //[0,1,...]
                    var locResonance = t_talismanRes[resonanceId].resonance;        //[法宝id,法宝id，。。。]
                    if(t_talisman[locResonance[0]].job==locHeroData.tempId){
                        for(var j = 0; j < locResonance.length; j++){
                                    if(!locTalismanFg[j]){      //还未激活
                                        if(userResArr.indexOf(locResonance[j]) != -1) {
                                            locTalismanFg[j] = 1;
                                            isUp = true;
                                        }
                            }
                        }
                        locHeroData.talismanFg[resonanceId]=locTalismanFg;
                        var isRes = true;
                        var resLength = locResonance.length;
                        for(var j = 0; j < resLength; j++){
                            if(!locTalismanFg[j]){
                                isRes = false;
                                break;
                            }
                        }
                        if(isRes){
                            //共鸣技能
                            var type = t_talismanRes[resonanceId].type;
                            if(type != c_prop.talismanSkillTypeKey.property){      //记录到exData
                                if(!exData[c_prop.userExDataKey.talismanSkill]) exData[c_prop.userExDataKey.talismanSkill] = {};
                                if(!exData[c_prop.userExDataKey.talismanSkill][type]) exData[c_prop.userExDataKey.talismanSkill][type] = [];
                                exData[c_prop.userExDataKey.talismanSkill][type].push(t_talismanRes[resonanceId].extraPro[0][0]);
                            }else{
                                isUp = true;
                                //属性计算
                                locHeroData.propArr =  heroPropHelper.calHeroProp(userData,locHeroData);
                                locHeroData.combat = heroPropHelper.calCombat(userData,locHeroData);
                            }
                        }
                    }
                }
            }
            if(isUp){
                //更新
                var upHeroData1 = {
                    id:locHeroData.id,
                    propArr:locHeroData.propArr,
                    combat:locHeroData.combat,
                    talismanFg:locHeroData.talismanFg,
                    talismanData: locHeroData.talismanData
                };
                upHeroDataObj.push([locHeroData.id , JSON.parse(JSON.stringify(upHeroData1))]);
            }
        }

        //更新背包
        var upUserData = {
            bag: userData.bag,
            exData:userData.exData
        };
        upHeroDataObj[0] = [-1,JSON.parse(JSON.stringify(upUserData))];

        async.mapLimit(upHeroDataObj,1, function (upData, cb1) {
            if(upData[0] == -1){
                userDao.update(client, upData[1], {id: userId}, cb1);
            }else{
                heroDao.update(client, upData[1], {id: upData[1].id}, cb1);
            }
        }, function(err,data){
            if(err) return cb(err);
            upHeroDataObj.splice(0,1);
            cb(null, [upHeroDataObj,delBagItems,upUserData]);
        });
    });
};

//法宝穿戴
exports.changeTrump = function(client,userId,tempId,trumpId,cb) {
    checkRequire();
    var talisman = t_talisman[trumpId];
    if(!talisman) return cb("数据异常");
    if(talisman.job != tempId) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },      function(cb1){
            heroDao.select(client,{userId:userId,tempId:tempId},cb1);
        }
    ],function(err,data){
        if(err)return err;
        var userData = data[0],heroData = data[1];
        var trumpBag = heroData.talismanData || {};

        var trumpData = trumpBag[trumpId];
        var talismanAdornId = heroData.talismanAdorn;//已经穿戴的法宝的ID
        if(talismanAdornId == trumpId)return cb("已装备该法宝");
        if(!trumpData) return cb("没有该法宝");
        var trumpLvl = trumpBag[trumpId];
        if(userData.lvl < trumpLvl) return cb("等级不够");
        heroData.talismanAdorn = trumpId;

        //更新
        var upHeroData = {
            id:heroData.id,
            talismanAdorn:heroData.talismanAdorn
        };
        heroDao.update(client,upHeroData,{id:heroData.id},function(err,upData) {
            if (err) return cb(err);
            cb(null,[upHeroData]);
        });
    })
};


//升级法宝
exports.upTrumpLvl = function(client,userId,tempId,trumpId,cb) {
    checkRequire();
    var talisman = t_talisman[trumpId];
    if(!talisman) return cb("数据异常");
    if(talisman.job != tempId) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            heroDao.select(client,{userId:userId,tempId:tempId},cb1);
        }
    ],function(err,data){
        //content
        var userData = data[0],heroData = data[1];
        var talismanData = heroData.talismanData || {};
        var trumpData = talismanData[trumpId];
        if(!trumpData) return cb("没有该法宝");
        //if(userData.lvl <=  trumpData[0]) return cb("等级不足");

        var upLvlData = t_talismanLvl[trumpId + trumpData[0]];
        var nextUpLvlData = t_talismanLvl[trumpId + trumpData[0] + 1];
        if(!nextUpLvlData) return cb("已经满级了");
        if(nextUpLvlData.userLv > userData.lvl) return cb("人物等级不足");

        var bag = userData.bag;
        var delBagItems = {};

        for(var val in upLvlData.needItems){
            var needItemsId = upLvlData.needItems[val][0];
            var needItemsNum = upLvlData.needItems[val][1];
            var ownItemsNum = bag[needItemsId] || 0;
            if(ownItemsNum < needItemsNum) return cb("升级材料不足");
            userData.bag[needItemsId] -= needItemsNum;
            if(userData.bag[needItemsId] <= 0) delete userData.bag[needItemsId];
            delBagItems[needItemsId] = needItemsNum;
        }
        trumpData[0] += 1;
        heroData.talismanData[trumpId] = trumpData;

        //属性计算
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat = heroPropHelper.calCombat(userData,heroData);

        var upUserData = {
            bag:userData.bag
        };

        var upHeroData = {
            id:heroData.id,
            propArr:heroData.propArr,
            combat:heroData.combat,
            talismanFg:heroData.talismanFg,
            talismanData: heroData.talismanData
        };

        async.parallel([
            function (cb1) {
                userDao.update(client, upUserData, {id: userId}, cb1);
            },
            function (cb1) {
                heroDao.update(client, upHeroData, {id: heroData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            delete upUserData.bag;
            cb(null, [upHeroData,delBagItems]);
        });
    });
};

//法宝洗炼
exports.baptizeTrump = function(client,userId,tempId,trumpId,isCheck,cb) {
    checkRequire();
    var talisman = t_talisman[trumpId];
    if(!talisman) return cb("数据异常");
    if(talisman.job != tempId) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            heroDao.select(client,{userId:userId,tempId:tempId},cb1);
        }
    ],function(err,data){
        var userData = data[0],heroData = data[1];
        var bag = userData.bag || {};
        var talismanData = heroData.talismanData || {};     //法宝数据{法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}],法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}],....}
        var trumpData = talismanData[trumpId];
        if(!trumpData) return cb("还未拥有该法宝");
        var maxBaptizeTrump = t_talisman[trumpId].atEnd + t_talismanStar[trumpId + trumpData[3]].aptitude;
        if(trumpData[1] >= maxBaptizeTrump) return cb("已经达到最大资质");

        var cosDiamond = 0;
        var needItemsId = c_game.trumpCfg[0];
        var needItemsNum = c_game.trumpCfg[1];
        var delBagItems = {};
        if(!bag[needItemsId] || bag[needItemsId] < needItemsNum) return cb("洗炼材料不足");
        if(isCheck){
            var needDiamond =  c_game.trumpCfg[4];
            cosDiamond = needDiamond;
            if(userData.diamond < needDiamond) return cb("元宝不足");
            userUtils.reduceDiamond(userData,needDiamond);
        }
        userData.bag[needItemsId] -= needItemsNum;
        delBagItems[needItemsId] = needItemsNum;
        if(userData.bag[needItemsId] <= 0) delete userData.bag[needItemsId];
        var baptizeValue = trumpData[1] || 0;
        var prob = formula.calTrumpPro(baptizeValue,maxBaptizeTrump)*100;
        var rad = _getRandomNumber(1,100);
        var value = 0;
        var result = 0;
        if(rad<=prob){
            value =formula.calTrumpAdd(baptizeValue,maxBaptizeTrump);
            result = baptizeValue + value;
            if(result > maxBaptizeTrump) result = maxBaptizeTrump;
        }else{
            if(!isCheck){
                value = -formula.calTrumpSub(baptizeValue,maxBaptizeTrump);
                result = baptizeValue + value;
                if(result < 0) result = 0;
            }else{
                result = trumpData[1];
                value = 0;
            }
        }
        trumpData[1] = result;
        //if(rad<=prob){
        //    value =formula.calTrumpAdd(baptizeValue,maxBaptizeTrump);
        //    trumpData[1] = baptizeValue + value;
        //    trumpData[5] = 0;
        //    if(trumpData[1] > maxBaptizeTrump) trumpData[1] = maxBaptizeTrump;
        //    heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        //
        //}else{
        //    value = formula.calTrumpSub(baptizeValue,maxBaptizeTrump);
        //    trumpData[5] = baptizeValue - value;
        //    if(trumpData[5] < 0) trumpData[5] = 0;
        //    value = -value;
        //}


        heroData.talismanData[trumpId] = trumpData;
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat = heroPropHelper.calCombat(userData,heroData);

        var upUserData = {
            diamond : userData.diamond,
            bag:userData.bag
        };

        var upHeroData = {
            id:heroData.id,
            propArr:heroData.propArr,
            combat:heroData.combat,
            talismanFg:heroData.talismanFg,
            talismanData: heroData.talismanData
        };
        async.parallel([
            function (cb1) {
                userDao.update(client, upUserData, {id: userId}, cb1);
            },
            function (cb1) {
                heroDao.update(client, upHeroData, {id: heroData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            delete upUserData.bag;
            cb(null, [upHeroData,delBagItems,value,cosDiamond]);
        });
    });
};

//法宝洗炼确认
exports.confirmBaptizeTrump = function(client,userId,tempId,trumpId,cb) {
    checkRequire();
    var talisman = t_talisman[trumpId];
    if(!talisman) return cb("数据异常");
    if(talisman.job != tempId) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            heroDao.select(client,{userId:userId,tempId:tempId},cb1);
        }
    ],function(err,data){
        var userData = data[0],heroData = data[1];

        var talismanData = heroData.talismanData || {};     //法宝数据{法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}],法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}],....}
        var trumpData = talismanData[trumpId];
        if(!trumpData) return cb("还未拥有该法宝");

        heroData.talismanData[trumpId][1] = heroData.talismanData[trumpId][5];
        heroData.talismanData[trumpId][5] = 0;
        //属性计算
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat = heroPropHelper.calCombat(userData,heroData);

        var upHeroData = {
            id:heroData.id,
            propArr:heroData.propArr,
            combat:heroData.combat,
            talismanFg:heroData.talismanFg,
            talismanData: heroData.talismanData
        };

        heroDao.update(client, upHeroData, {id: heroData.id}, function (err, data) {
                if (err) return cb(err);
                cb(null, [upHeroData]);
            });
    });
};

exports.cancelBaptizeTrump = function(client,userId,tempId,trumpId,cb) {
    checkRequire();
    var talisman = t_talisman[trumpId];
    if(!talisman) return cb("数据异常");
    if(talisman.job != tempId) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            heroDao.select(client,{userId:userId,tempId:tempId},cb1);
        }
    ],function(err,data){
        var userData = data[0],heroData = data[1];
        var talismanData = heroData.talismanData || {};     //法宝数据{法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}],法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}],....}
        var trumpData = talismanData[trumpId];
        if(!trumpData) return cb("还未拥有该法宝");
        var needDiamond =  c_game.trumpCfg[4];
        if(userData.diamond < needDiamond) return cb("元宝不足");
        userUtils.reduceDiamond(userData,needDiamond);

        heroData.talismanData[trumpId][5] = 0;

        var updateData = {
            diamond: userData.diamond,
        };

        var upHeroData = {
            id:heroData.id,
            talismanData : heroData.talismanData
        };

        async.parallel([
            function (cb1) {
                userDao.update(client, updateData, {id: userId}, cb1);
            },
            function (cb1) {
                heroDao.update(client, upHeroData, {id: heroData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [upHeroData,needDiamond]);
        });
    });
};

//法宝升星
exports.upTrumpStar = function(client,userId,tempId,trumpId,cb) {
    checkRequire();
    var talisman = t_talisman[trumpId];
    if(!talisman) return cb("数据异常");
    if(talisman.job != tempId) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client, {id: userId}, cb1);
        },
        function(cb1){
            heroDao.select(client, {tempId: tempId, userId: userId}, cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0], heroData = data[1];

        var bag = userData.bag || {};
        var exData = userData.exData || {};
        var talismanData = heroData.talismanData || {};     //法宝数据{法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}],法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}],....}
        var trumpData = talismanData[trumpId];
        if(!trumpData) return cb("还未拥有该法宝");
        var lvl = trumpData[0]||1;      //当前等级
        var starLvl = trumpData[2]||0;      //当前升星等级
        var lvlLimit = t_talismanLvl[parseInt(trumpId)+parseInt(lvl)].starLimit;      //等级上限
        if(starLvl >= lvlLimit) return cb("当前开启最大星级为"+ lvlLimit +"星");
        var starLimit = c_game.trumpCfg[2];      //升星上限
        if(starLvl >= starLimit) return cb("已达到升星上限");

        var delBagItems = {};
        var t_talismanStarId = parseInt(trumpId) + parseInt(starLvl);
        var needItems = t_talismanStar[t_talismanStarId].needItems;
        for(var i = 0; i < needItems.length; i++){
            var itemId = needItems[i][0];
            var itemCount = needItems[i][1];
            if(!bag[itemId] || bag[itemId] < itemCount) return cb("升星材料不足");
            userData.bag[itemId] -= itemCount;
            delBagItems[itemId] = itemCount;
            if(userData.bag[itemId] == 0) delete userData.bag[itemId];
        }
        heroData.talismanData[trumpId][2] = starLvl + 1;
        var maxStar = heroData.talismanData[trumpId][3]||0;
        var isHighStar = false;
        if((starLvl + 1)>maxStar){
            heroData.talismanData[trumpId][3] = starLvl + 1;
            isHighStar = true;
        }

        //是否获得技能
        var isGetSkill = false;
        var skillId = t_talismanStar[t_talismanStarId].skillId;
        if(skillId){
            var getPro = t_talismanStar[t_talismanStarId].getPro;
            var randomNum = _getRandomNumber(1,10000);
            if(randomNum <= getPro) {        //获得
                isGetSkill = true;
                var type = t_talismanSkill[skillId].type;
                if(type != c_prop.talismanSkillTypeKey.property){      //记录到exData
                    if(!exData[c_prop.userExDataKey.talismanSkill]) exData[c_prop.userExDataKey.talismanSkill] = {};
                    if(!exData[c_prop.userExDataKey.talismanSkill][type]) exData[c_prop.userExDataKey.talismanSkill][type] = [];
                    exData[c_prop.userExDataKey.talismanSkill][type].push(skillId);
                }
                var skillObj = trumpData[4]||{};      //{星级:技能id,星级:技能id,...}
                skillObj[starLvl + 1] = skillId;
                heroData.talismanData[trumpId][4] = skillObj;
                heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
                heroData.combat =  heroPropHelper.calCombat(userData,heroData);
            }
        }

        //更新
        var upUserData = {
            bag:userData.bag,
            exData:userData.exData
        };
        var upHeroData = {
            id:heroData.id,
            propArr:heroData.propArr,
            combat:heroData.combat,
            talismanData:heroData.talismanData
        };
        async.parallel([
            function (cb1) {
                userDao.update(client, upUserData, {id: userId}, cb1);
            },
            function (cb1) {
                heroDao.update(client, upHeroData, {id: heroData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            delete upUserData.bag;
            cb(null, [upHeroData,delBagItems,isGetSkill,upUserData,isHighStar]);
        });
    });
};

//法宝重铸
exports.recastTrump = function(client,userId,tempId,trumpId,cb) {
    checkRequire();

    var talisman = t_talisman[trumpId];
    if(!talisman) return cb("数据异常");
    if(talisman.job != tempId) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            heroDao.select(client,{userId:userId,tempId:tempId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0], heroData = data[1];

        var exData = userData.exData||{};
        var talismanData = heroData.talismanData || {};     //法宝数据{法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}],法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}],....}
        var trumpData = talismanData[trumpId];
        if(!trumpData) return cb("还未拥有该法宝");
        var starLvl = trumpData[2]||0;      //当前升星等级
        if(starLvl <= 0) return cb("已降至最低星级");

        //减星
        heroData.talismanData[trumpId][2] = 0;      //starLvl - 1;
        //是否扣除技能
        var isUp = false;
        var skillObj = trumpData[4]||{};      //{星级:技能id,星级:技能id,...}
        //if(skillObj[starLvl]){      //需要扣除技能
        //    var skillId = skillObj[starLvl];
        //    var type = t_talismanSkill[skillId].type;
        //    if(type != c_prop.talismanSkillTypeKey.property){      //记录到exData
        //        if(exData[c_prop.userExDataKey.talismanSkill] && exData[c_prop.userExDataKey.talismanSkill][type] && exData[c_prop.userExDataKey.talismanSkill][type].indexOf(skillId) != -1){
        //            var skillArr = exData[c_prop.userExDataKey.talismanSkill][type];
        //            for(var i = 0 ;i<skillArr.length;i++){
        //                if(skillId == skillArr[i]){
        //                    isUp = true;
        //                    skillArr.splice(i,1);
        //                }
        //            }
        //        }
        //    }
        //    delete skillObj[starLvl];
        //    heroData.talismanData[trumpId][4] = skillObj;
        //    heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        //    heroData.combat =  heroPropHelper.calCombat(userData,heroData);
        //}
        for(var key in skillObj){
            var skillId = skillObj[key];
            var type = t_talismanSkill[skillId].type;
            if(type != c_prop.talismanSkillTypeKey.property){      //记录到exData
                if(exData[c_prop.userExDataKey.talismanSkill] && exData[c_prop.userExDataKey.talismanSkill][type] && exData[c_prop.userExDataKey.talismanSkill][type].indexOf(skillId) != -1){
                    var skillArr = exData[c_prop.userExDataKey.talismanSkill][type];
                    for(var i = 0 ;i<skillArr.length;i++){
                        if(skillId == skillArr[i]){
                            isUp = true;
                            skillArr.splice(i,1);
                        }
                    }
                }
            }
        }
        heroData.talismanData[trumpId][4] = {};
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);

        //更新
        var upHeroData = {
            id:heroData.id,
            propArr:heroData.propArr,
            combat:heroData.combat,
            talismanData:heroData.talismanData
        };

        var upUserData = {
            exData:userData.exData
        };
        async.parallel([
            function (cb1) {
                if(isUp){
                    userDao.update(client, upUserData, {id: userId}, cb1);
                }else{
                   cb1();
                }
            },
            function (cb1) {
                heroDao.update(client, upHeroData, {id: heroData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [upHeroData,upUserData,isUp]);
        });
    })
};

//法宝合成
exports.compoundTrump = function(client,userId,tempId,trumpId,cb) {
    checkRequire();
    var talisman = t_talisman[trumpId];
    if(!talisman) return cb("数据异常");
    if(talisman.job != tempId) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            heroDao.select(client,{userId:userId,tempId:tempId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0], heroData = data[1];

        var talismanAdorn = heroData.talismanAdorn || 0;
        var talismanData = heroData.talismanData || {};     //法宝数据{法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}],法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}],....}
        var bagItems = {};
        var compoundNeedObj = {};       //合成所需物品
        var talismanCom = t_talismanCom[trumpId];
        if(!talismanCom) return cb("数据异常");
        var reqItems1 = talismanCom.reqItems1;
        if(reqItems1) compoundNeedObj[reqItems1] = [talismanCom.reqCount1,talismanCom.needLvl1,talismanCom.needStar1];       //[数量,要求等级,要求星级]
        var reqItems2 = talismanCom.reqItems2;
        if(reqItems2) compoundNeedObj[reqItems2] = [talismanCom.reqCount2,talismanCom.needLvl2,talismanCom.needStar2];
        var reqItems3 = talismanCom.reqItems3;
        if(reqItems3) compoundNeedObj[reqItems3] = [talismanCom.reqCount3,talismanCom.needLvl3,talismanCom.needStar3];

        //判断合成材料
        for(var key in compoundNeedObj){
            var trumpData = talismanData[key];
            if(!trumpData) return cb(getMsg(c_msgCode.noSynthesis));
            var trumpLvl = trumpData[0]|| 1;
            if(trumpLvl < compoundNeedObj[key][1]) return cb(getMsg(c_msgCode.lowLevelTalismen));
            var trumpStar = trumpData[2]|| 0;
            if(trumpStar < compoundNeedObj[key][2]) return cb(getMsg(c_msgCode.lowStarTailsmen));
            delete heroData.talismanData[key];
            if(talismanAdorn == key) heroData.talismanAdorn = 0;
        }
        //获取合成物品
        var isUpUser = false;
        if(talismanData[trumpId]){       //如果存在 直接放入背包
            isUpUser = true;
            userData.bag[trumpId] = 1;
            bagItems[trumpId] = 1;
        }else{      //直接穿戴
            var randomNum = _getRandomNumber(t_talisman[trumpId].atStart,t_talisman[trumpId].atEnd);
            heroData.talismanData[trumpId] = [1,randomNum,0,0,{}];        //法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...}]
        }

        //属性计算
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);

        //更新
        var updateData ={
            bag:userData.bag
        };
        var upHeroData = {
            id:heroData.id,
            propArr:heroData.propArr,
            combat:heroData.combat,
            talismanAdorn:heroData.talismanAdorn,
            talismanData:heroData.talismanData
        };
        async.parallel([
            function (cb1) {
                if(isUpUser){
                    userDao.update(client, updateData, {id: userId}, cb1);
                }else{
                    cb1();
                }
            },
            function (cb1) {
                heroDao.update(client, upHeroData, {id: heroData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [upHeroData,bagItems]);
        });
    });
};

/*****************************************************************************************************/


//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    start = parseInt(start);
    end = parseInt(end);
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};