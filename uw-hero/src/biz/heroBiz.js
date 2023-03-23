/**
 * Created by Administrator on 2014/5/16.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var formula = require("uw-formula");
var c_prop = uwData.c_prop;
var c_open = uwData.c_open;
var t_hero = uwData.t_hero;
var t_skill = uwData.t_skill;
var c_realm = uwData.c_realm;
var c_compound = uwData.c_compound;
var t_item = uwData.t_item;
var t_wing = uwData.t_wing;
var t_wingStrength = uwData.t_wingStrength;
var t_strengthRefine = uwData.t_strengthRefine;
var t_robot = uwData.t_robot;
var t_itemEquip = uwData.t_itemEquip;
var c_lvl = uwData.c_lvl;
var c_vip = uwData.c_vip;
var c_gem = uwData.c_gem;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var chatBiz = require("uw-chat").chatBiz;
var heroDao = require("../dao/heroDao");
var heroPropHelper = require("./heroPropHelper");
var HeroEntity = require("uw-entity").HeroEntity;
var biBiz = require('uw-log').biBiz;
var RealmObj = require('uw-log').RealmObj;
var WingObj = require('uw-log').WingObj;
var genuineQiObj = require('uw-log').genuineQiObj;

var ds = require("uw-ds").ds;

var exports = module.exports;

var userUtils;
var userDao;
var demonLotusDao;
var checkRequire = function(){
     userUtils = require("uw-user").userUtils;
     userDao = require("uw-user").userDao;
     chatBiz = chatBiz || require("uw-chat").chatBiz;
    demonLotusDao = demonLotusDao || require("uw-demon-lotus").demonLotusDao;
};

/**
 * 根据tempId组获取英雄数据
 * @param client
 * @param userId
 * @param tempIds
 * @param cb
 * @returns {*}
 */
exports.getListByTempIds = function (client, userId, tempIds, cb) {
    tempIds = tempIds || [];
    if (tempIds.length <= 0) return cb(null, []);
    heroDao.list(client, " userId = ? and tempId in (?)", [tempIds], cb);
};


/**
 * 技能升级
 * @param client
 * @param userId
 * @param tempId
 * @param index
 * @param cb
 * @returns {*}
 */
exports.upSkill = function(client,userId,tempId,index,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            heroDao.select(client,{tempId: tempId, userId: userId},cb1)
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0], heroData = data[1];
        if(!heroData.skillLvlArr) heroData.skillLvlArr = [];
        var skillLvl = heroData.skillLvlArr[index]||1;      //当前技能等级
        var needLvlArr = c_game.skillRate[4].split(",");      //开启技能需要等级
        var skillNeedLvl = needLvlArr[index];
        //var cdLimit = c_game.skillRate[5];      //CD上限
        var needGold = c_lvl[skillLvl].skillNeedGold;
        if(userData.lvl < skillNeedLvl) return cb("等级不足");
        if(skillLvl >= userData.lvl) return cb("技能等级不能超过角色等级");
        //var skillCd = userData.skillCd;     //技能CD
        var nowTime = new Date();
        //var newSkillCd = skillCd||0;
        //var lastSkillTime = userData.lastSkillTime;     //最后点技能时间
        //if(lastSkillTime){
        //    var skillTime = lastSkillTime.addSeconds(skillCd);      //当前技能时间
        //    newSkillCd =  parseInt((skillTime.getTime() - nowTime.getTime())/1000);
        //    if(skillCd > cdLimit){
        //        if(newSkillCd > 0)  return cb("技能还在CD中");
        //    }else{
        //        if(newSkillCd > cdLimit)  return cb("技能还在CD中");
        //    }
        //    if(newSkillCd < 0) newSkillCd = 0;
        //}

        if(userData.gold < needGold) return cb("金币不足");
        //消耗金币
        userData.gold -= c_lvl[skillLvl].skillNeedGold;
        //技能添加
        heroData.skillLvlArr[index] = skillLvl + 1;
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);
        //var addCd = formula.calSkillCd(skillLvl);
        //userData.skillCd = newSkillCd + addCd;
        //userData.lastSkillTime = nowTime;
        //更新
        var upUserData = {
            gold:userData.gold
            //skillCd:userData.skillCd,
            //lastSkillTime:userData.lastSkillTime
        };
        var upHeroData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            skillLvlArr:heroData.skillLvlArr
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
            cb(null, [upUserData,upHeroData,c_lvl[skillLvl + 1].skillNeedGold]);
        });
    });
};

/**
 * 清除技能CD
 * @param client
 * @param userId
 * @param cb
 * @returns {*}
 */
exports.clearSkillCd = function(client,userId,cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if(err) return cb(err);
        var newSkillCd = 0;     //当前cd时间
        var nowTime = new Date();
        var skillCd = userData.skillCd;
        if(!skillCd || skillCd == 0 || skillCd == null) return cb("CD时间为空,不需要清除");
        var lastSkillTime = userData.lastSkillTime;     //最后点技能时间
        var skillTime = lastSkillTime.addSeconds(skillCd);      //当前技能时间
        newSkillCd =  parseInt((skillTime.getTime() - nowTime.getTime())/1000);
        if(newSkillCd < 0) newSkillCd = 0;

        var needDiamond = formula.calSkillDiamond(newSkillCd);      //所需钻石
        if(userData.diamond < needDiamond) return cb("元宝不足");
        //清除CD
        userData.skillCd = 0;
        userData.lastSkillTime = nowTime;
        //钻石扣除
        userUtils.reduceDiamond(userData,needDiamond,consts.diamondConsumeType.user_7,"");

        //需要更新的数据
        var updateData = {
            diamond:userData.diamond,
            giveDiamond : userData.giveDiamond,
            buyDiamond : userData.buyDiamond,
            skillCd : userData.skillCd,
            lastSkillTime : userData.lastSkillTime
        };
        userDao.update(client,updateData,{id:userId},function(err,data){
           if(err) return cb(err);
            cb(null, [updateData,needDiamond]);
        });
    });
}

/**
 * 装备符文块
 * @param client
 * @param userId
 * @param tempId 英雄id
 * @param index 符文块下标
 * @param cb
 * @returns {*}
 */
exports.wearRune = function(client,userId,tempId,index,cb){
    checkRequire();
    //if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
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
        var realmLvl = heroData.realmLvl==0?0:heroData.realmLvl;
        if(!heroData.realmArr) heroData.realmArr = [];
        var runeId = c_realm[realmLvl].reqItems[index];     //符文块id
        if(heroData.realmArr[index] == runeId) return cb("已装备过该物品");
        var bag = userData.bag||{};
        if(!bag[runeId] || bag[runeId] == 0) return cb("没有该物品");
        var needLvl = t_item[runeId].level;     //装备需要等级
        if(userData.lvl < needLvl) return cb("等级不足");
        var delBagItems = {};

        //装备
        heroData.realmArr[index] = runeId;
        heroData.realmLvl = realmLvl;
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);
        //去除背包符文
        userData.bag[runeId] -= 1;
        delBagItems[runeId] = 1;
        if(userData.bag[runeId] == 0) delete userData.bag[runeId];

        var realmCount = 0;
        if(heroData.realmArr.length > 0){
            for(var j = 0;j<heroData.realmArr.length;j++){
                if(heroData.realmArr[j]) realmCount += 1;
            }
        }
        heroData.realmSumLvl = parseInt(heroData.realmLvl) * 100 + realmCount;         //境界等级 * 100 + 已装备个数

        //更新
        var upUserData = {
            bag:userData.bag
        };
        var upHeroData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            realmArr:heroData.realmArr,
            realmLvl:heroData.realmLvl,
            realmSumLvl:heroData.realmSumLvl
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
            cb(null, [upHeroData,delBagItems]);
        });
    });
}

/**
 * 装备所有符文块
 * @param client
 * @param userId
 * @param tempId 英雄id
 * @param cb
 * @returns {*}
 */
exports.wearAllRune = function(client,userId,tempId,cb){
    checkRequire();
    //if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
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
        var realmLvl = heroData.realmLvl==0?0:heroData.realmLvl;
        if(!heroData.realmArr) heroData.realmArr = [];
        var runeIdArr = c_realm[realmLvl].reqItems;     //符文块id数组
        var delBagItems = {};
        for(var i = 0;i<runeIdArr.length;i++){
            var runeId = runeIdArr[i];     //符文块id
            if(heroData.realmArr[i] == runeId) continue;
            var needLvl = t_item[runeId].level;     //装备需要等级
            if(userData.lvl < needLvl) continue;
            var bag = userData.bag||{};
            if(!bag[runeId] || bag[runeId] == 0){
                if(!c_compound[runeId]) continue;
                //var bagItems = {};
                var compoundNeedObj = {};       //合成所需物品
                //var compoundNeedGold = c_compound[runeId].reqJinbi;;       //合成所需金币
                var reqItems1 = c_compound[runeId].reqItems1;
                if(reqItems1 != 0) compoundNeedObj[reqItems1] = c_compound[runeId].reqCount1;
                var reqItems2 = c_compound[runeId].reqItems2;
                if(reqItems2 != 0) compoundNeedObj[reqItems2] = c_compound[runeId].reqCount2;
                var reqItems3 = c_compound[runeId].reqItems3;
                if(reqItems3 != 0) compoundNeedObj[reqItems3] = c_compound[runeId].reqCount3;
                var reqItems4 = c_compound[runeId].reqItems4;
                if(reqItems4 != 0) compoundNeedObj[reqItems4] = c_compound[runeId].reqCount4;

                //if(gold < compoundNeedGold) return cb("金币不足")
                //判断合成材料
                var isContinue = false;
                for(var key in compoundNeedObj){
                    var ownCount = bag[key]||0;        //拥有所需合成材料的数量
                    if(!ownCount || ownCount < compoundNeedObj[key]) {
                        isContinue = true;
                        continue;
                    }
                }
                if(isContinue) continue;
                //扣除材料
                for(var key in compoundNeedObj){
                    bag[key] -= compoundNeedObj[key];
                    if(!delBagItems[key]) delBagItems[key] = 0;
                    delBagItems[key] += compoundNeedObj[key];
                    if(bag[key] == 0) delete bag[key];
                }
                //获取合成物品
                bag[runeId] = 1;
                //bagItems[runeId] = 1;
            }

            //装备
            heroData.realmArr[i] = runeId;
            heroData.realmLvl = realmLvl;
            heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
            heroData.combat =  heroPropHelper.calCombat(userData,heroData);
            //去除背包符文
            userData.bag[runeId] -= 1;
            if(!delBagItems[runeId]) delBagItems[runeId] = 0;
            delBagItems[runeId] += 1;
            if(userData.bag[runeId] == 0) delete userData.bag[runeId];
        }

        var realmCount = 0;
        if(heroData.realmArr.length > 0){
            for(var j = 0;j<heroData.realmArr.length;j++){
                if(heroData.realmArr[j]) realmCount += 1;
            }
        }
        heroData.realmSumLvl = parseInt(heroData.realmLvl) * 100 + realmCount;         //境界等级 * 100 + 已装备个数

        //更新
        var upUserData = {
            bag:userData.bag
        };
        var upHeroData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            realmArr:heroData.realmArr,
            realmLvl:heroData.realmLvl,
            realmSumLvl:heroData.realmSumLvl
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
            cb(null, [upHeroData,delBagItems]);
        });
    });
}

/**
 * 升级境界
 * @param client
 * @param userId
 * @param tempId
 * @param cb
 * @returns {*}
 */
exports.upRealm = function(client,userId,tempId,cb){
    checkRequire();
    //if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
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
        if(err) return cb(err);
        var realmLvl = heroData.realmLvl==0?0:heroData.realmLvl;       //境界等级
        var realmArr = heroData.realmArr||[];       //符文块数组
        if(realmArr.length < 6) return cb("请先穿满境界装备");
        for(var i = 0; i < realmArr.length; i++){
            if(realmArr[i] ==null) return cb("请先穿满境界装备");
        }
        var reqItems = c_realm[realmLvl].reqItems;     //所需符文块
        for(var i = 0; i < reqItems.length; i++){
            if(reqItems[i] != realmArr[i]) return cb("装备有误");
        }

        var realmObj = new RealmObj();
        realmObj.type = c_prop.biLogTypeKey.realm; /** 类型 **/
        realmObj.serverId = userData.serverId; /** 服务器 **/
        realmObj.accountId = userData.accountId; /** 账号id **/
        realmObj.userId = userData.id; /** 用户id **/
        realmObj.nickName = userData.nickName; /** 昵称 **/
        realmObj.tempId = tempId; /** 职业id **/
        realmObj.happenTime = (new Date()).toFormat("YYYY-MM-DD HH24:MI:SS"); /** 时间 **/
        realmObj.costObj = {}; /** 消耗物品 **/
        realmObj.oldRealmLvl = realmLvl;  /** 元神原本等级 **/
        realmObj.newRealmLvl = realmLvl+1;  /** 元神当前等级 **/
        biBiz.realmBi(JSON.stringify(realmObj));

        //升级境界
        heroData.realmLvl = realmLvl + 1;
        heroData.realmArr = [];
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);

        //推送系统消息(oldma)
        //第一个%s：玩家名
        //第二个%s：境界名字
        chatBiz.addSysData(17,[userData.nickName,c_realm[heroData.realmLvl].name,heroData.realmLvl]);
        chatBiz.addSysData(18,[userData.nickName,c_realm[heroData.realmLvl].name,heroData.realmLvl]);

        var realmCount = 0;
        if(heroData.realmArr.length > 0){
            for(var j = 0;j<heroData.realmArr.length;j++){
                if(heroData.realmArr[j]) realmCount += 1;
            }
        }
        heroData.realmSumLvl = parseInt(heroData.realmLvl) * 100 + realmCount;         //境界等级 * 100 + 已装备个数

        var updataData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            realmLvl:heroData.realmLvl,
            realmArr:heroData.realmArr,
            realmSumLvl:heroData.realmSumLvl
        };
        heroDao.update(client, updataData, {id: heroData.id}, function(err,data){
            if(err) return cb(err);
            cb(null,updataData);
        });
    });
}

/**
 * 强化
 * @param client
 * @param userId
 * @param tempId
 * @param index  对应装备下标
 * @param cb
 * @returns {*}
 */
exports.strength = function(client,userId,tempId,index,cb){
    checkRequire();
    //if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
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
        if(!userData.bag) userData.bag={};
        if(!heroData.intensifyArr) heroData.intensifyArr=[];
        var bag = userData.bag;
        var strengthNum = bag[c_prop.spItemIdKey.intensify]||0;     //拥有强化石数量
        var strengthLvl = heroData.intensifyArr[index]||0;      //当前强化等级
        var strengthLimit = c_game.initCfg[2];      //强化上限
        var cLvlId = 1;
        if(strengthLvl != 0) cLvlId = strengthLvl;
        var costGold = c_lvl[cLvlId].equipStrengthGold;
        var costStrengthNum = c_lvl[cLvlId].equipStrengthNum;
        if(strengthLvl >= strengthLimit) return cb("已达到强化上限");
        if(userData.gold<costGold) return cb("金币不足");
        if(strengthNum < costStrengthNum) return cb("强化石不足");
        var delBagItems = {};

        //强化等级+1
        heroData.intensifyArr[index] = strengthLvl + 1;
        //扣除金币、强化石
        userData.gold -= costGold;
        userData.bag[c_prop.spItemIdKey.intensify] = strengthNum - costStrengthNum;
        delBagItems[c_prop.spItemIdKey.intensify] = costStrengthNum;
        if(userData.bag[c_prop.spItemIdKey.intensify] == 0) delete userData.bag[c_prop.spItemIdKey.intensify];


        //推送系统消息(oldma)
        //第一个%s：玩家名
        //第二个%s：装备颜色
        //第三个%s：装备名字
        //第四个%s：装备强化等级
        var locItemUid = heroData.equipData[index];
        var locBagData = userData.equipBag[locItemUid]||{};
        //物品基础属性
        var locHeroItemId = locBagData[0];
        var color = t_item[locHeroItemId].color;       //装备颜色  1~6 白~红
        chatBiz.addSysData(5,[userData.nickName,color,t_item[locHeroItemId].name,strengthLvl + 1]);
        chatBiz.addSysData(29,[userData.nickName,color,t_item[locHeroItemId].name,strengthLvl + 1]);

        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);

        //更新
        var upUserData = {
            bag:userData.bag,
            gold:userData.gold
        };
        var upHeroData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            intensifyArr:heroData.intensifyArr
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
            cb(null, [upUserData,upHeroData,delBagItems,costGold]);
        });
    });
}

/**
 * 升星
 * @param client
 * @param userId
 * @param tempId
 * @param index  对应装备下标
 * @param cb
 * @returns {*}
 */
exports.upStar = function(client,userId,tempId,index,cb){
    checkRequire();
    //if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
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
        if(!userData.bag) userData.bag={};
        if(!heroData.starArr) heroData.starArr=[];
        if (!heroData.starTopArr) heroData.starTopArr = [];
        var bag = userData.bag;
        var starNum = bag[c_prop.spItemIdKey.starStone]||0;     //拥有升星石数量
        var starLvl = heroData.starArr[index]||0;      //当前升星等级
        //var starLimit = c_game.initCfg[3];      //升星上限
        var cLvlId = 0;
        if(starLvl != 0) cLvlId = starLvl;

        var costGold = c_lvl[cLvlId].upStarGold;
        var costStarNum = c_lvl[cLvlId].upStarNum;
        var starTop = heroData.starTopArr[index]||0;      //当前升星突破重数
        var maxUpStarLvl = c_lvl[starTop].maxUpStarLvl;     //最大升星数级数
        if(starLvl >= maxUpStarLvl) return cb("已达到升星上限");
        if(userData.gold<costGold) return cb("金币不足");
        if(starNum < costStarNum) return cb("升星石不足");
        var delBagItems = {};

        //升星等级+1
        heroData.starArr[index] = starLvl + 1;
        //扣除金币、升星石
        userData.gold -= costGold;
        userData.bag[c_prop.spItemIdKey.starStone] = starNum - costStarNum;
        delBagItems[c_prop.spItemIdKey.starStone] = costStarNum;
        if(userData.bag[c_prop.spItemIdKey.starStone] == 0) delete userData.bag[c_prop.spItemIdKey.starStone];

        //推送系统消息(oldma)
        //第一个%s：玩家名
        //第二个%s：装备颜色
        //第三个%s：装备名字
        //第四个%s：装备强化等级
        var locItemUid = heroData.equipData[index];
        var locBagData = userData.equipBag[locItemUid]||{};
        //物品基础属性
        var locHeroItemId = locBagData[0];
        var color = t_item[locHeroItemId].color;       //装备颜色  1~6 白~红
        chatBiz.addSysData(6,[userData.nickName,color,t_item[locHeroItemId].name,starLvl + 1]);
        chatBiz.addSysData(7,[userData.nickName,color,t_item[locHeroItemId].name,starLvl + 1]);
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);

        //更新
        var upUserData = {
            bag:userData.bag,
            gold:userData.gold
        };
        var upHeroData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            starArr:heroData.starArr
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
            cb(null, [upUserData,upHeroData,delBagItems,costGold]);
        });
    });
}

/**
 * 升星突破
 * @param client
 * @param userId
 * @param tempId
 * @param index  对应装备下标
 * @param cb
 * @returns {*}
 */
exports.starTop = function(client,userId,tempId,index,cb){
    checkRequire();
    //if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client, {id: userId}, cb1);
        },
        function(cb1){
            heroDao.select(client, {tempId: tempId, userId: userId}, cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0],heroData=data[1];
        if(!heroData.starArr) heroData.starArr=[];
        if(!heroData.starTopArr) heroData.starTopArr=[];
        var bag = userData.bag;
        var starNum = bag[c_prop.spItemIdKey.starStone]||0;     //拥有升星石数量
        var starLvl = heroData.starArr[index]||0;      //当前升星等级
        var starTop = heroData.starTopArr[index]||0;      //当前升星突破重数
        if(!c_lvl[starTop+1].upStarTop) return cb("当前升星突破重数已打上限");
        var maxUpStarLvl = c_lvl[starTop].maxUpStarLvl;     //最大升星数级数
        if(maxUpStarLvl > starLvl) return cb("当前还可以继续升星");
        var topCosNum = c_lvl[starTop].topCosNum;     //突破消耗升星石数
        var topCosGold = c_lvl[starTop].topCosGold;     //突破消耗金币
        var succeedPro = c_lvl[starTop].succeedPro;     //突破成功率
        if(userData.gold<topCosGold) return cb("金币不足");
        if(starNum < topCosNum) return cb("升星石不足");

        var isSucceed = false;
        var randomNum = _getRandomNumber(1,10000);
        if(!heroData.starTopArr[index]) heroData.starTopArr[index] = 0;
        if(randomNum <= succeedPro) {        //成功
            isSucceed = true;
            heroData.starTopArr[index] += 1;
        }

        //扣除金币、升星石
        var delBagItems = {};
        userData.gold -= topCosGold;
        userData.bag[c_prop.spItemIdKey.starStone] = starNum - topCosNum;
        delBagItems[c_prop.spItemIdKey.starStone] = topCosNum;
        if(userData.bag[c_prop.spItemIdKey.starStone] == 0) delete userData.bag[c_prop.spItemIdKey.starStone];

        heroData.propArr = heroPropHelper.calHeroProp(userData, heroData);
        heroData.combat = heroPropHelper.calCombat(userData, heroData);
        //更新
        var upUserData = {
            bag:userData.bag,
            gold:userData.gold
        };
        var upHeroData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            starTopArr:heroData.starTopArr
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
            cb(null, [upUserData,upHeroData,delBagItems,[isSucceed]]);
        });
    });
};

/**
 * 宝石升级
 * @param client
 * @param userId
 * @param tempId
 * @param index
 * @param cb
 */
exports.upGem = function(client,userId,tempId,index,cb){
    checkRequire();
    //if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client, {id: userId}, cb1);
        },
        function(cb1){
            heroDao.select(client, {tempId: tempId, userId: userId}, cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], heroData = data[1];
        if(!userData.bag) userData.bag={};
        var bag = userData.bag;
        if(!heroData.gemArr) heroData.gemArr = [];
        var gemInitialIndex = index;
        if(index > 7) gemInitialIndex = index -4;
        var gemId = heroData.gemArr[index]||c_game.gemInitial[gemInitialIndex];
        var gemIdLimit = c_game.gemLimit[gemInitialIndex];      //宝石id上限
        var gemLvlLimitStart = parseInt(c_game.gemLvlLimit[0].split(",")[0]);       //宝石等级限制开始等级
        var itemID = c_gem[gemId].itemID;       //需要宝石碎片id
        var count = c_gem[gemId].count;       //需要宝石碎片数量
        var gemLvl = c_gem[gemId].gemLvl + 1;       //宝石等级
        var gemCount = bag[itemID]||0;      //拥有宝石碎片数量
        if(gemId >= gemIdLimit) return cb("已升到最高等级");
        var lastgemLvlLimit = c_game.gemLvlLimit[c_game.gemLvlLimit.length -1].split(",");
        if(gemLvl >= gemLvlLimitStart){
            if(gemLvl >= lastgemLvlLimit[0]){
                if(userData.lvl < lastgemLvlLimit[1]) return cb("等级不足");
            }
            for(var i = 0; i < c_game.gemLvlLimit.length;i++){
                if(parseInt(c_game.gemLvlLimit[i].split(",")[0]) > gemLvl){
                    if(userData.lvl < parseInt(c_game.gemLvlLimit[i-1].split(",")[1])) return cb("等级不足");
                    break;
                }
            }
        }
        if(gemCount<count) return cb("宝石碎片数量不足");
        var delBagItems = {};

        //英雄宝石等级+1
        heroData.gemArr[index] = gemId + 1;
        //扣除宝石碎片
        userData.bag[itemID] = gemCount - count;
        delBagItems[itemID] = count;
        if(userData.bag[itemID] == 0) delete userData.bag[itemID];
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);

        if(heroData.gemArr.length > 0){
            var gemSumLvl = 0;
            for(var j = 0;j<heroData.gemArr.length;j++){
                var gemId = heroData.gemArr[j];
                if(gemId){
                    if(gemId < 100){
                        gemSumLvl += parseInt(gemId);
                    }else{
                        gemSumLvl += parseInt((gemId.toString().substr(gemId.toString().length - 2)));
                    }
                }
            }
            heroData.gemSumLvl = gemSumLvl;
        }

        //更新
        var upUserData = {
            bag:userData.bag
        };
        var upHeroData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            gemArr:heroData.gemArr,
            gemSumLvl:heroData.gemSumLvl
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
            cb(null, [upHeroData,delBagItems]);
        });

    });
}

/**
 * 翅膀激活
 * @param client
 * @param userId
 * @param tempId
 * @param cb
 */
exports.wingActivate = function(client,userId,tempId,cb){
    checkRequire();
    if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client, {id: userId}, cb1);
        },
        function(cb1){
            heroDao.select(client,{tempId: tempId, userId: userId}, cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], heroData = data[1];
        var wingArr = heroData.wingArr;
        if(wingArr[1]) return cb("翅膀已激活");

        heroData.wingArr = [0,1,0,0];
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);

        var wingSumLvl = heroData.wingArr[1] || 0;
        var starSum = heroData.wingArr[2] || 0;
        heroData.wingSumLvl = parseInt(wingSumLvl) * 100 + parseInt(starSum);       //翅膀等级*100+星数

        //更新
        var upHeroData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            wingArr:heroData.wingArr,
            wingSumLvl:heroData.wingSumLvl
        };
        heroDao.update(client, upHeroData, {id: heroData.id}, function(err,data){
            if (err) return cb(err);
            cb(null, upHeroData);
        });
    });
};

/**
 * 翅膀培养
 * @param client
 * @param userId
 * @param tempId
 * @param fosType       //培养类型
 * @param cb
 */
exports.wingFos = function(client,userId,tempId,fosType,cb){
    checkRequire();
    if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client, {id: userId}, cb1);
        },
        function(cb1){
            heroDao.select(client, {tempId: tempId, userId: userId}, cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], heroData = data[1];
        if(!userData.bag) userData.bag={};
        var bag = userData.bag;
        var lvl = userData.lvl;
        if(lvl < c_game.wingCrit[6]) return cb("角色达到一定等级才可激活");
        if(!heroData.wingArr) heroData.wingArr = [0,1,0,0];     //初始翅膀数据 [id,等级,星级,当前星经验]
        var wingId = heroData.wingArr[0]||0;
        var oldWingId = wingId;
        var wingLvl = heroData.wingArr[1]||1;
        var wingStar = heroData.wingArr[2]||0;
        var wingExp = heroData.wingArr[3]||0;
        var idLimit = c_game.initCfg[4];
        if(wingStar >= 10) return cb("请先升级再继续培养");
        if(wingId >= idLimit) return cb("翅膀等级已到上限");
        var critMul  = c_game.wingCrit[1];    //经验暴击倍率
        var critPro  = c_game.wingCrit[2];    //经验暴击概率
        //不同培养获得不同经验
        var gainExp = 0;        //获得经验
        var conMoney = 0;        //消耗货币
        var delBagItems = {};
        var wingShowArr = [];
        var costGold = 0;
        var costDiamond = 0;
        var costObj = {};
        switch (fosType){
            case c_prop.wingFosTypeKey.comFoster:       //普通培养
                gainExp = c_game.wingCrit[5];
                conMoney = c_game.wingCrit[4];
                if(userData.gold < conMoney) return cb("金币不足");
                userData.gold -= conMoney;
                costGold = conMoney;
                costObj[c_prop.spItemIdKey.gold] = conMoney;
                break;
            case c_prop.wingFosTypeKey.advFoster:       //高级培养
                gainExp = c_game.wingCrit[0];
                conMoney = c_game.wingCrit[3];
                if(bag[c_prop.spItemIdKey.plumage] && bag[c_prop.spItemIdKey.plumage] > 0){
                    bag[c_prop.spItemIdKey.plumage] -=1;
                    delBagItems[c_prop.spItemIdKey.plumage] = 1;
                    if(bag[c_prop.spItemIdKey.plumage] == 0) delete bag[c_prop.spItemIdKey.plumage];
                    costObj[c_prop.spItemIdKey.plumage] = 1;
                }else{
                    if(userData.diamond < conMoney) return cb("元宝不足");
                    userUtils.reduceDiamond(userData,conMoney);
                    costDiamond = conMoney;
                    costObj[c_prop.spItemIdKey.diamond] = conMoney;
                }
                break;
            default :
                return cb("未知类型");
                break;
        }
        //获得经验是否暴击
        var randomNum = _getRandomNumber(1,10000);
        var isCrit = false;
        if(randomNum <= critPro){
            gainExp = critMul*gainExp;
            isCrit = true;
        }
        wingShowArr[0] = gainExp;
        wingShowArr[1] = isCrit;
        gainExp += wingExp;
        //计算所得经验可升几星
        var starLvl = 0;        //获得星级
        for(var i = wingId; i < idLimit; i++){
            if(gainExp < t_wing[i].needExp) break;
            if((starLvl + wingStar) >= 10) break;
            starLvl +=1;
            gainExp -=t_wing[i].needExp;
        }
        var wingObj = new WingObj();
        if(starLvl > 0){
            wingObj.type = c_prop.biLogTypeKey.wing; /** 类型 **/
            wingObj.serverId = userData.serverId; /** 服务器 **/
            wingObj.accountId = userData.accountId; /** 账号id **/
            wingObj.userId = userData.id; /** 用户id **/
            wingObj.nickName = userData.nickName; /** 昵称 **/
            wingObj.tempId = tempId; /** 职业id **/
            wingObj.happenTime = (new Date()).toFormat("YYYY-MM-DD HH24:MI:SS"); /** 时间 **/
            wingObj.costObj = costObj; /** 消耗物品 **/
            wingObj.oldWingId = wingId;    /** 翅膀原本id **/
            wingObj.oldWingLvl = wingLvl;   /** 翅膀原本等级 **/
            wingObj.oldWingStar = wingStar;  /** 翅膀原本星级 **/
            wingObj.newWingId = wingId+starLvl;    /** 翅膀当前id **/
            wingObj.newWingLvl = wingLvl;   /** 翅膀当前等级 **/
            wingObj.newWingStar = wingStar+starLvl;  /** 翅膀当前星级 **/
            biBiz.wingBi(JSON.stringify(wingObj));
        }
        wingId += starLvl;
        wingExp = gainExp;
        wingStar += starLvl;
        if((starLvl + wingStar) >= 10) wingExp = 0;
        heroData.wingArr[0] = wingId;
        heroData.wingArr[1] = wingLvl;
        heroData.wingArr[2] = wingStar;
        heroData.wingArr[3] = wingExp;
        //heroData.wingArr = [wingId,wingLvl,wingStar,wingExp];
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);

        //推送系统消息(oldma)

        if(oldWingId!=wingId){
            //第一个%s：玩家名
            //第二个%s：翅膀名
            chatBiz.addSysData(8,[userData.nickName,t_wing[wingId].name,wingId]);
            chatBiz.addSysData(9,[userData.nickName,t_wing[wingId].name,wingId]);
        }

        chatBiz.addSysData(10,[userData.nickName,isCrit]);

        var wingSumLvl = heroData.wingArr[1] || 0;
        var starSum = heroData.wingArr[2] || 0;
        heroData.wingSumLvl = parseInt(wingSumLvl) * 100 + parseInt(starSum);       //翅膀等级*100+星数

        //更新
        var upUserData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond:userData.buyDiamond,
            giveDiamond:userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag
        };
        var upHeroData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            wingArr:heroData.wingArr,
            wingSumLvl:heroData.wingSumLvl
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
            delete upUserData.equipBag;
            cb(null, [upUserData,upHeroData,delBagItems,wingShowArr[0],wingShowArr[1],costGold,costDiamond]);
        });
    });
}

/**
 * 翅膀升级
 * @param client
 * @param userId
 * @param tempId
 * @param cb
 */
exports.upWing = function(client,userId,tempId,cb){
    checkRequire();
    if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
    async.parallel([
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        },
        function (cb1) {
            heroDao.select(client, {tempId: tempId, userId: userId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0], heroData = data[1];
        var wingArr = heroData.wingArr;      //翅膀数据 [id,等级,星级,当前星经验]
        var idLimit = c_game.initCfg[4];
        if(wingArr[2] < 10) return cb("未满足升级条件");
        if((wingArr[0] + 1) >= idLimit) return cb("翅膀等级已到上限");

        var wingObj = new WingObj();
        var wingId = heroData.wingArr[0];
        var wingLvl = heroData.wingArr[1];
        wingObj.oldWingId = wingId;    /** 翅膀原本id **/
        wingObj.oldWingLvl = wingLvl;   /** 翅膀原本等级 **/
        wingObj.oldWingStar = heroData.wingArr[2];  /** 翅膀原本星级 **/
        wingObj.type = c_prop.biLogTypeKey.wing; /** 类型 **/
        wingObj.serverId = userData.serverId; /** 服务器 **/
        wingObj.accountId = userData.accountId; /** 账号id **/
        wingObj.userId = userData.id; /** 用户id **/
        wingObj.nickName = userData.nickName; /** 昵称 **/
        wingObj.tempId = tempId; /** 职业id **/
        wingObj.happenTime = (new Date()).toFormat("YYYY-MM-DD HH24:MI:SS"); /** 时间 **/
        wingObj.costObj = {}; /** 消耗物品 **/
        wingObj.newWingId = wingId+1;    /** 翅膀当前id **/
        wingObj.newWingLvl = wingLvl+1;   /** 翅膀当前等级 **/
        wingObj.newWingStar = 0;  /** 翅膀当前星级 **/
        biBiz.wingBi(JSON.stringify(wingObj));

        //升级
        heroData.wingArr[0] +=1;
        heroData.wingArr[1] +=1;
        heroData.wingArr[2] = 0;
        heroData.wingArr[3] = 0;
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);

        var wingSumLvl = heroData.wingArr[1] || 0;
        var starSum = heroData.wingArr[2] || 0;
        heroData.wingSumLvl = parseInt(wingSumLvl) * 100 + parseInt(starSum);       //翅膀等级*100+星数

        var updateHero = {
            wingArr:heroData.wingArr,
            combat:heroData.combat,
            propArr:heroData.propArr,
            wingSumLvl:heroData.wingSumLvl
        };

        //更新
        heroDao.update(client, {wingArr:heroData.wingArr,propArr:heroData.propArr}, {id: heroData.id}, function(err,data){
            if(err) return cb(err);
            cb(null, updateHero);
        });
    });
};

/**
 * 翅膀一键升阶
 * @param client
 * @param userId
 * @param tempId
 * @param fosType       //培养类型
 * @param isUseDiamond //是否使用元宝
 * @param cb
 */

exports.wingFos2Top = function(client, userId, tempId, fosType, isUseDiamond,cb){
    checkRequire();
    if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client, {id: userId}, cb1);
        },
        function(cb1){
            heroDao.select(client, {tempId: tempId, userId: userId}, cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], heroData = data[1];
        if(!userData.bag) userData.bag={};
        var bag = userData.bag;
        var lvl = userData.lvl;
        if(lvl < c_game.wingCrit[6]) return cb("角色达到一定等级才可激活");
        if(!heroData.wingArr) heroData.wingArr = [0,1,0,0];     //初始翅膀数据 [id,等级,星级,当前星经验]
        var wingId = heroData.wingArr[0]||0;
        var oldWingId = wingId;
        var wingLvl = heroData.wingArr[1]||1;
        var wingStar = heroData.wingArr[2]||0;
        var wingExp = heroData.wingArr[3]||0;
        var idLimit = c_game.initCfg[4];
        if(wingStar >= 10) return cb("请先升级再继续培养");
        if(wingId >= idLimit) return cb("翅膀等级已到上限");
        var critMul  = c_game.wingCrit[1];    //经验暴击倍率
        var critPro  = c_game.wingCrit[2];    //经验暴击概率
        //不同培养获得不同经验
        var totalGainExp = 0;
        totalGainExp += wingExp;
        var conMoney = 0;        //消耗货币
        var delBagItems = {};
        var wingShowArr = [0,0]; //增加经验，暴击次数
        var costGold = 0;
        var costDiamond = 0;
        var costObj = {};
        var fosNum = 0
        var globalStarLvl = 0;
        for(var nowStar = wingStar;nowStar <10;) {
            var gainExp = 0;   //获得经验
            switch (fosType) {
                case c_prop.wingFosTypeKey.comFoster:       //普通培养
                    gainExp = c_game.wingCrit[5];
                    conMoney = c_game.wingCrit[4];
                    if (userData.gold < conMoney) {
                        if(fosNum ==0){
                            return cb(getMsg(c_msgCode.noGolds));
                        }else {
                            return _over(client, totalGainExp, [wingStar, wingLvl,wingId, oldWingId], wingShowArr, delBagItems, [costGold, costDiamond], isCrit,userData, heroData, cb);
                        }
                    }
                    userData.gold -= conMoney;
                    costGold += conMoney;
                    costObj[c_prop.spItemIdKey.gold] = conMoney;
                    break;
                case c_prop.wingFosTypeKey.advFoster:       //高级培养
                    gainExp = c_game.wingCrit[0];
                    conMoney = c_game.wingCrit[3];
                    if (bag[c_prop.spItemIdKey.plumage] && bag[c_prop.spItemIdKey.plumage] > 0) {
                        bag[c_prop.spItemIdKey.plumage] -= 1;
                        var locNum = delBagItems[c_prop.spItemIdKey.plumage] || 0;
                        delBagItems[c_prop.spItemIdKey.plumage] = locNum + 1;
                        if (bag[c_prop.spItemIdKey.plumage] == 0) delete bag[c_prop.spItemIdKey.plumage];
                        costObj[c_prop.spItemIdKey.plumage] = 1;
                    } else {
                        if(isUseDiamond) {
                            if (userData.diamond < conMoney) {
                                if (fosNum == 0) {
                                    return cb(getMsg(c_msgCode.noDiamond));
                                } else {
                                    return _over(client, totalGainExp, [wingStar, wingLvl, wingId, oldWingId], wingShowArr, delBagItems, [costGold, costDiamond], isCrit, userData, heroData, cb);
                                }
                            }
                            userUtils.reduceDiamond(userData, conMoney);
                            costDiamond += conMoney;
                            costObj[c_prop.spItemIdKey.diamond] = conMoney;
                        }else {
                            if(fosNum == 0){
                                return cb("羽毛不足");
                            }else {
                                return _over(client, totalGainExp, [wingStar, wingLvl, wingId, oldWingId], wingShowArr, delBagItems, [costGold, costDiamond], isCrit, userData, heroData, cb);
                            }
                        }
                    }
                    break;
                default :
                    return cb("未知类型");
                    break;
            }
            //获得经验是否暴击
            var randomNum = _getRandomNumber(1, 10000);
            var isCrit = false;
            if (randomNum <= critPro) {
                gainExp = critMul * gainExp;
                isCrit = true;
                wingShowArr[1] += 1;
            }
            totalGainExp += gainExp;
            wingShowArr[0] += totalGainExp;
            fosNum ++;

            //计算所得经验可升几星
            var starLvl = 0;        //获得星级
            for (var i = wingId; i < idLimit; i++) {
                if (totalGainExp< t_wing[i].needExp) break;
                if ((starLvl + wingStar) >= 10) break;
                starLvl += 1;
                globalStarLvl +=1;
                nowStar = starLvl + wingStar;
                totalGainExp -= t_wing[i].needExp;
            }

            var wingObj = new WingObj();
            if(starLvl > 0){
                wingObj.type = c_prop.biLogTypeKey.wing; /** 类型 **/
                wingObj.serverId = userData.serverId; /** 服务器 **/
                wingObj.accountId = userData.accountId; /** 账号id **/
                wingObj.userId = userData.id; /** 用户id **/
                wingObj.nickName = userData.nickName; /** 昵称 **/
                wingObj.tempId = tempId; /** 职业id **/
                wingObj.happenTime = (new Date()).toFormat("YYYY-MM-DD HH24:MI:SS"); /** 时间 **/
                wingObj.costObj = costObj; /** 消耗物品 **/
                wingObj.oldWingId = wingId;    /** 翅膀原本id **/
                wingObj.oldWingLvl = wingLvl;   /** 翅膀原本等级 **/
                wingObj.oldWingStar = wingStar;  /** 翅膀原本星级 **/
                wingObj.newWingId = wingId+starLvl;    /** 翅膀当前id **/
                wingObj.newWingLvl = wingLvl;   /** 翅膀当前等级 **/
                wingObj.newWingStar = wingStar+starLvl;  /** 翅膀当前星级 **/
                biBiz.wingBi(JSON.stringify(wingObj));
            }
            wingId += starLvl;
            wingStar += starLvl;
        }


        //wingId += starLvl;
        wingExp = totalGainExp;
        //wingStar += starLvl;
        if(wingStar >= 10) wingExp = 0;
        heroData.wingArr[0] = wingId;
        heroData.wingArr[1] = wingLvl;
        heroData.wingArr[2] = wingStar;
        heroData.wingArr[3] = wingExp;
        //heroData.wingArr = [wingId,wingLvl,wingStar,wingExp];
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);

        //推送系统消息(oldma)

        if(oldWingId!=wingId){
            //第一个%s：玩家名
            //第二个%s：翅膀名
            chatBiz.addSysData(8,[userData.nickName,t_wing[wingId].name,wingId]);
            chatBiz.addSysData(9,[userData.nickName,t_wing[wingId].name,wingId]);
        }

        chatBiz.addSysData(10,[userData.nickName,isCrit]);

        var wingSumLvl = heroData.wingArr[1] || 0;
        var starSum = heroData.wingArr[2] || 0;
        heroData.wingSumLvl = parseInt(wingSumLvl) * 100 + parseInt(starSum);       //翅膀等级*100+星数

        //更新
        var upUserData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond:userData.buyDiamond,
            giveDiamond:userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag
        };
        var upHeroData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            wingArr:heroData.wingArr,
            wingSumLvl:heroData.wingSumLvl
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
            delete upUserData.equipBag;
            cb(null, [upUserData,upHeroData,delBagItems,wingShowArr[0],wingShowArr[1],costGold,costDiamond]);
        });
    });
};

/**
 * 翅膀强化
 * @param client
 * @param userId
 * @param tempId
 * @param part       //部位  1：左  2：右
 * @param isReplace       //是否元宝替代  否：false  是：true
 * @param cb
 */
exports.wingStrength = function(client,userId,tempId,part,isReplace,cb){
    checkRequire();
    if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client, {id: userId}, cb1);
        },
        function(cb1){
            heroDao.select(client, {tempId: tempId, userId: userId}, cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], heroData = data[1];
        var needDiamond = 0;
        var delBagItems = {};
        if(!userData.bag) userData.bag={};
        var bag = userData.bag;
        var plumage = bag[c_prop.spItemIdKey.plumage]||0;       //羽毛数量
        if(!heroData.wingArr) heroData.wingArr = [0,1,0,0,0,0];     //翅膀[id,等级,星级,当前星经验,左翅强化等级,右翅强化等级]
        var wingLvl = heroData.wingArr[1]||1;
        var openLvl = c_game.wingCrit[7];   //翅膀强化开启等级
        if(wingLvl < openLvl) return cb("翅膀等级"+openLvl+"开启强化功能");
        var lvl = 0;
        var index = 0;
        if(part == c_prop.wingStrengthKey.left){
            lvl = heroData.wingArr[4]||0;      //左翅强化等级
            index = 4;
        }else if(part == c_prop.wingStrengthKey.right){
            lvl = heroData.wingArr[5]||0;     //右翅强化等级
            index = 5;
        }else{
            return cb("翅膀强化位置错误");
        }
        //var id = parseInt(part.toString() + (lvl).toString);
        var needPlumage = t_wingStrength[lvl].consume;
        if(!t_wingStrength[lvl]) return cb("翅膀强化等级已到上限");
        if(t_wingStrength[lvl].needWingLvl > wingLvl) return cb("翅膀到达"+t_wingStrength[lvl].needWingLvl+"阶后可继续强化");

        //消耗判断、结算
        if(needPlumage > plumage){
            if(isReplace) {     //元宝替代
                needDiamond = (needPlumage - plumage)*5;
                if(needDiamond>userData.diamond) return cb(getMsg(c_msgCode.noDiamond));
                bag[c_prop.spItemIdKey.plumage] -=plumage;
                delBagItems[c_prop.spItemIdKey.plumage] = plumage;
                if(bag[c_prop.spItemIdKey.plumage] == 0) delete bag[c_prop.spItemIdKey.plumage];
                userUtils.reduceDiamond(userData,needDiamond);
            }else{
                return cb(getMsg(c_msgCode.notEnoughFeather));
            }
        }else{
            bag[c_prop.spItemIdKey.plumage] -=needPlumage;
            delBagItems[c_prop.spItemIdKey.plumage] = needPlumage;
            if(bag[c_prop.spItemIdKey.plumage] == 0) delete bag[c_prop.spItemIdKey.plumage];
        }

        var isSucceed = false;
        var isCrit = false;
        var isDemote = false;
        var succeedPro  = t_wingStrength[lvl].successPro;    //成功概率
        var randomNum = _getRandomNumber(1,10000);
        if(!heroData.wingArr[index]) heroData.wingArr[index] = 0;
        if(randomNum <= succeedPro){        //成功
            isSucceed = true;
            heroData.wingArr[index] += 1;
            var critPro  = t_wingStrength[lvl].critPro;    //暴击概率
            var randomNum1 = _getRandomNumber(1,10000);
            if(randomNum1 <= critPro){      //加2级
                if(t_wingStrength[lvl+2] && t_wingStrength[lvl+2].needWingLvl <= wingLvl) {
                    isCrit = true;
                    heroData.wingArr[index] += 1;
                }
            }
        }else{      //失败
            var demotePro  = t_wingStrength[lvl].demotePro;    //掉级概率
            var randomNum2 = _getRandomNumber(1,10000);
            if(randomNum2 <= demotePro){
                isDemote = true;
                heroData.wingArr[index] -= 1;
                if(heroData.wingArr[index] < 0) heroData.wingArr[index] = 0;
            }
        }

        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);

        //推送系统消息(oldma)
        //if(oldWingId!=wingId){
        //    //第一个%s：玩家名
        //    //第二个%s：翅膀名
        //    chatBiz.addSysData(8,[userData.nickName,t_wing[wingId].name,wingId]);
        //    chatBiz.addSysData(9,[userData.nickName,t_wing[wingId].name,wingId]);
        //}
        //
        //chatBiz.addSysData(10,[userData.nickName,isCrit]);

        //更新
        var upUserData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond:userData.buyDiamond,
            giveDiamond:userData.giveDiamond,
            bag: userData.bag
        }
        var upHeroData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            wingArr:heroData.wingArr
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
            cb(null, [upUserData,upHeroData,delBagItems,needDiamond,[isSucceed,heroData.wingArr[index],isCrit,isDemote]]);
        });
    });
};

/**
 * 装备精炼
 * @param client
 * @param userId
 * @param tempId
 * @param index  对应装备下标
 * @param cb
 */
exports.equipRefine = function(client,userId,tempId,index,cb){
    checkRequire();
    //if(tempId == c_prop.heroJobKey.ys) return cb("数据异常");
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
        var delBagItems = {};
        if(!userData.bag) userData.bag={};
        if(!heroData.refineArr) heroData.refineArr=[];
        var bag = userData.bag;
        var strengthNum = bag[c_prop.spItemIdKey.intensify]||0;     //拥有强化石数量
        var strengthLvl = heroData.intensifyArr[index]||0;      //当前强化等级
        var refineLvl = heroData.refineArr[index]||0;      //当前精炼等级
        var openLvl = c_game.equipRefineCfg[0];
        if(openLvl > strengthLvl) return cb(getMsg(c_msgCode.reinforceRequire,openLvl));
        if(!t_strengthRefine[refineLvl+1]) return cb("精炼等级已达最高");
        var needStrLvl = t_strengthRefine[refineLvl].needStrLvl;
        if(needStrLvl > strengthLvl) return cb("本装备栏强化至"+needStrLvl+"时可继续精炼");

        var costGold = t_strengthRefine[refineLvl].consumeGold;
        var costStrengthNum = t_strengthRefine[refineLvl].consumeStr;
        var succeedPro = t_strengthRefine[refineLvl].succeedPro;
        if(userData.gold<costGold) return cb("金币不足");
        if(strengthNum < costStrengthNum) return cb("强化石不足");

        var isSucceed = false;
        var isCrit = false;
        var isDemote = false;
        var randomNum = _getRandomNumber(1,10000);
        if(!heroData.refineArr[index]) heroData.refineArr[index] = 0;
        if(randomNum <= succeedPro) {        //成功
            isSucceed = true;
            heroData.refineArr[index] += 1;
            var critPro  = t_strengthRefine[refineLvl].critPro;    //暴击概率
            var randomNum1 = _getRandomNumber(1,10000);
            if(randomNum1 <= critPro){      //加2级
                if(t_strengthRefine[refineLvl+2] && t_strengthRefine[refineLvl+2].needStrLvl <= strengthLvl) {
                    isCrit = true;
                    heroData.refineArr[index] += 1;
                }
            }
        }else{      //失败
            var demotePro  = t_strengthRefine[refineLvl].demotePro;    //掉级概率
            var randomNum2 = _getRandomNumber(1,10000);
            if(randomNum2 <= demotePro){
                isDemote = true;
                heroData.refineArr[index] -= 1;
                if(heroData.refineArr[index] < 0) heroData.refineArr[index] = 0;
            }
        }

        //扣除金币、强化石
        userData.gold -= costGold;
        userData.bag[c_prop.spItemIdKey.intensify] = strengthNum - costStrengthNum;
        delBagItems[c_prop.spItemIdKey.intensify] = costStrengthNum;
        if(userData.bag[c_prop.spItemIdKey.intensify] == 0) delete userData.bag[c_prop.spItemIdKey.intensify];

        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat =  heroPropHelper.calCombat(userData,heroData);

        //更新
        var upUserData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond:userData.buyDiamond,
            giveDiamond:userData.giveDiamond,
            bag: userData.bag
        };
        var upHeroData = {
            propArr:heroData.propArr,
            combat:heroData.combat,
            refineArr:heroData.refineArr
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
            cb(null, [upUserData,upHeroData,delBagItems,[isSucceed,heroData.refineArr[index],isCrit,isDemote]]);
        });
    });
};

exports.callHero = function (client, userId, tempId, sex,cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        },
        function (cb1) {
            heroDao.listCols(client, "id,tempId", "userId = ?", [userId] , cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0], heroList = data[1];
        if(heroList.length>=4) return cb("角色已全部解锁！");
        for(var i = 0;i<heroList.length;i++){
            var locHero = heroList[i];
            if (locHero.tempId == tempId) return cb("已经拥有该英雄");//预防重复
        }

        var needLvl = 0;
        //var needDiamond = 99999999;
        var openRole = 99999999;

        //openRole
        /*
         参数1：第二角色的开启等级
         参数2：需要花费元宝
         参数3：第三角色的开启等级
         参数1：需要花费元宝
         */
        if(tempId == c_prop.heroJobKey.ys){
            if(heroList.length<3) return cb(getMsg(c_msgCode.careerNotOpen));
            needLvl = c_game.fourRole[0];
            var needRebirthLvl = c_game.fourRole[1];
            var needInfuseExpc = c_game.fourRole[2];
            var needRebirthLvl1 = c_game.fourRole[11];
            if(userData.rebirthLvl < needRebirthLvl){       //不足二转
                if(userData.rebirthLvl < needRebirthLvl1) return cb("转生等级不足");
                if(!c_vip[userData.vip].openRole4) return cb("vip等级不足");
            }
            //if(userData.lvl < needLvl || userData.rebirthLvl < needRebirthLvl) return cb("转生等级不足");
            if(userData.infuseExpc < needInfuseExpc) return cb("注入经验不足");
            userUtils.addFourRoleExpc(userData, -needInfuseExpc,0);
        }else {
            if (heroList.length == 1) {
                needLvl = c_open.openRole2.lvlRequired;
                openRole = c_vip[userData.vip].openRole2;
            } else if (heroList.length == 2) {
                needLvl = c_open.openRole3.lvlRequired;
                openRole = c_vip[userData.vip].openRole3;
            }

            if (userData.lvl < needLvl) {
                if (openRole == 0) return cb("VIP等级不足");
                //if (userData.diamond < needDiamond) return cb(getMsg(c_msgCode.noDiamond));
                //userUtils.reduceDiamond(userData, needDiamond);
            }
        }

        //var updateUser = {
        //    diamond:userData.diamond
        //};
        //async.parallel([
        //    function (cb1) {
        //        userDao.update(client, updateUser, {id: userId}, cb1);
        //    },
        //    function (cb1) {
        //        exports.createByTempId(client, userId, tempId, sex,cb1);
        //    }
        //], function (err, data) {
        //    if (err) return cb(err);
        //    cb(null, [updateUser, data[1], userData.nickName, heroList.length + 1,needDiamond]);
        //});
        exports.createByTempId(client, userData, tempId, sex, heroList.length,function(err,data){
            if(err) return cb(err);
            cb(null, [data, userData.nickName, heroList.length + 1]);
        });
    });
};

//保存出战列表
exports.saveFightList = function(client,userId,fightArr,cb){
    checkRequire();
    //heroDao.listCols(client, "id,fightSort", "userId = ?", [userId] , function(err,heroList){
        //if (err) return cb(err);
    async.parallel([
        function (cb1) {
            userDao.selectCols(client,"id,lvl,vip", "id = ?", [userId] , cb1);
        },
        function (cb1) {
            heroDao.listCols(client, "id,fightSort", "userId = ?", [userId] , cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0], heroList = data[1];

        if(!c_vip[userData.vip].buzhen){
            var openCon = c_open.fightList.lvlRequired;
            if(userData.lvl < openCon) return cb(getMsg(c_msgCode.functionOpen,userData.lvl,userData.vip));
        }

        var returnArr = [];
        async.map(heroList,function(heroData,cb1){
            var index = fightArr.indexOf(heroData.id);
            if(index != -1){
                heroData.fightSort = index;
                heroDao.update(client,{fightSort:index},{id:heroData.id},cb1);
                var upHeroData = {
                    id:heroData.id,
                    fightSort:heroData.fightSort
                };
                returnArr.push(upHeroData);
            }else{
                async.setImmediate(function () {
                    cb1();
                });
            }
        },function(err,data){
            if(err) return cb(err);
            cb(null,returnArr);
        });
    });
};

//开启自动注入
exports.autoInfuseSwitch = function(client,userId,isOpenIn,cb){
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.selectCols(client, "id,vip,isOpenIn,rebirthLvl"," id = ? ",[userId], cb1);
        },
        function (cb1) {
            heroDao.listCols(client, "id,tempId", "userId = ?", [userId] , cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0], heroList = data[1];

        if(heroList.length<3) return cb(getMsg(c_msgCode.careerNotOpen));
        var needRebirthLvl = c_game.fourRole[1];
        var needRebirthLvl1 = c_game.fourRole[11];
        if(userData.rebirthLvl < needRebirthLvl){       //不足二转
            if(userData.rebirthLvl < needRebirthLvl1) return cb("转生等级不足");
            if(!c_vip[userData.vip].openRole4) return cb("vip等级不足");
        }

        if(isOpenIn){
            userData.isOpenIn = 1;
        }else{
            userData.isOpenIn = 0;
        }
        for(var i = 0;i<heroList.length;i++){
            var locHero = heroList[i];
            if (locHero.tempId == c_prop.heroJobKey.ys) userData.isOpenIn = 0;      //预防
        }

        var updateData = {
            isOpenIn:userData.isOpenIn
        };
        userDao.update(client, updateData, {id: userId}, function(err,data){
            if (err) return cb(err);
            return cb(null, updateData);
        });
    });
};

//额外注入
exports.extraInfuse = function(client,userId,type,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.selectCols(client,"id,lvl,nickName,serverId,accountId,vip,diamond,giveDiamond,buyDiamond,genuineQi,rebirthLvl,exData,infuseExpc",{id:userId},cb1);
        },function(cb1){
            demonLotusDao.select(client,{userId:userId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0],demonLotusData = data[1];

        var needRebirthLvl = c_game.fourRole[1];
        var needRebirthLvl1 = c_game.fourRole[11];
        if(userData.rebirthLvl < needRebirthLvl){       //不足二转
            if(userData.rebirthLvl < needRebirthLvl1) return cb("转生等级不足");
            if(!c_vip[userData.vip].openRole4) return cb("vip等级不足");
        }

        var needInfuseExpc = c_game.fourRole[2];
        if(userData.infuseExpc>=needInfuseExpc) return cb("角色开启所需经验数量已足够");

        var startEnd = [];
        var critPro = 0;
        var multiple = 0;
        var cosDiamond = 0;
        var isCrit = false;
        var genuineQiArrs = [];
        var fourRole = c_game.fourRole;
        if(type == c_prop.extraInfuseTypeKey.genuineQi){
            var cosGenqi = fourRole[3];        //注入真气消耗
            var genuineQiArr = userUtils.calGenuineQi(userData,demonLotusData);
            if(genuineQiArr[0] < cosGenqi) return cb(getMsg(c_msgCode.noGas));
            var oldGenuineQi = genuineQiArr[0];
            startEnd = fourRole[6].split(",");      //转化进度
            critPro = fourRole[4];      //暴击倍率（百分比）
            multiple = fourRole[5];      //暴击倍数
            //计算真气
            userUtils.addGenuineQi(userData,-cosGenqi);
            genuineQiArrs = [userData.genuineQi];

            var GenuineQiObj = new genuineQiObj();
            /** 服务器 **/
            GenuineQiObj.serverId = userData.serverId;
            /** 账号id **/
            GenuineQiObj.accountId = userData.accountId;
            /** 用户id **/
            GenuineQiObj.userId = userData.id;
            /** 昵称 **/
            GenuineQiObj.nickName = userData.nickName;
            /** 等级 **/
            GenuineQiObj.lvl = userData.lvl;
            /** 时间 **/
            GenuineQiObj.happenTime = new Date();
            /** 消耗物品 **/
            GenuineQiObj.costObj = {};

            /** 真气 **/
            GenuineQiObj.oldGenuineQi = oldGenuineQi;    /** 原本真气值 **/
            GenuineQiObj.newGenuineQi = userData.genuineQi;   /** 当前真气值 **/
            GenuineQiObj.costType = "第四角色真气注入";   /** 培养类型 **/
            GenuineQiObj.costGenuineQi = cosGenqi;
            biBiz.genuineQiBi(JSON.stringify(GenuineQiObj));
        }else if(type == c_prop.extraInfuseTypeKey.diamond){
            cosDiamond = fourRole[7];        //注入真气消耗
            if(userData.diamond < cosDiamond) return cb(getMsg(c_msgCode.noDiamond));
            startEnd = fourRole[10].split(",");      //转化进度
            critPro = fourRole[8];      //暴击倍率（百分比）
            multiple = fourRole[9];      //暴击倍数
            //计算元宝
            userUtils.reduceDiamond(userData,cosDiamond);
        }else{
            return cb("数据异常");
        }

        //计算注入经验
        var getExpc = _getRandomNumber(parseInt(startEnd[0]), parseInt(startEnd[1]));
        var randomNum = _getRandomNumber(1, 100);
        if (randomNum <= critPro) {
            getExpc = getExpc*multiple;
            isCrit = true;
        }
        userData.infuseExpc += getExpc;
        if(userData.infuseExpc < 0) userData.infuseExpc = 0;

        //更新
        var upUserData = {
            diamond : userData.diamond,
            giveDiamond:userData.giveDiamond,
            buyDiamond:userData.buyDiamond,
            genuineQi:userData.genuineQi,
            infuseExpc:userData.infuseExpc,
            exData:userData.exData
        };
        userDao.update(client, upUserData, {id: userId}, function (err, data) {
            if (err) return cb(err);
            cb(null, [upUserData,genuineQiArrs,isCrit,getExpc,cosDiamond]);
        });
    });
};

/**
 * 创建一个新英雄
 * @param client
 * @param userData
 * @param tempId
 * @param sex
 * @param cb
 */
exports.createByTempId = function (client, userData, tempId, sex, count, cb) {
    checkRequire();
    var userId = userData.id;
    var nowLvl = userData.lvl;
    heroDao.select(client, {tempId: tempId, userId: userId}, function(err,data){
        if (err) return cb(err);
        if(data) return cb(null,data);
        var skillLvlArr = [];
        if(tempId == c_prop.heroJobKey.ys) skillLvlArr = [nowLvl,nowLvl,nowLvl,nowLvl,nowLvl];
        var hero = new HeroEntity();
        /** 用户id **/
        hero.userId = userId;
        /*用户id*/
        /** 模板id **/
        hero.tempId = tempId;
        /*模板id*/
        /** 强化 **/
        hero.intensifyArr = [];/*强化[等级,等级,...] 下标对应装备位置*/
        /** 星级 **/
        hero.starArr = [];/*星级[星级,星级,...] 下标对应装备位置*/
        /** 宝石 **/
        hero.gemArr = [];/*宝石[id,id,id,...]下标对应装备位置*/
        /** 翅膀 **/
        hero.wingArr = [];/*翅膀[id,等级,星级,当前星经验]*/
        /** 装备数据 **/
        hero.equipData = {};/*{&quot;部位&quot;:物品id,....}*/
        /** 技能等级组 **/
        hero.skillLvlArr = skillLvlArr;/*[技能1等级,技能2等级...]*/
        /** 境界符文组 **/
        hero.realmArr = [];/*境界符文组  [0,1,2,3,4,5]*/
        //var userData = {id:userId,lvl:userData.lvl,equipBag:userData.equipBag,rebirthLvl:userData.rebirthLvl,medalData:userData.medalData,propertyData:userData.propertyData};
        hero.propArr =  heroPropHelper.calHeroProp(userData ,hero);
        hero.combat =  heroPropHelper.calCombat(userData,hero);
        hero.fightSort = count;

        hero.sex = sex;
        heroDao.insert(client, hero, function (err, data) {
            if (err) return cb(err);
            hero.id = data.insertId;
            cb(null, hero);
        });
    });

};

/**
 * 获取主角色外观显示
 * @param client
 * @param userId
 * @param cb
 */
exports.getMainHeroDisplay = function(client,userId,cb){
    checkRequire();
    var reData = [];
    userDao.selectCols(client,"id,lvl,equipBag,robotId,isKing,rebirthLvl,medalData,propertyData"," id = ? ",[userId],function(err,userData){
        if (err) return cb(err);
        if(!userData) return cb(null, reData);
        exports.getMainHeroDisplayByUserData(client,userData,cb);
    });

};

/**
 * 获取主角色外观显示
 * @param client
 * @param userData  "id,lvl,equipBag,robotId"
 * @param cb
 */
exports.getMainHeroDisplayByUserData = function(client,userData,cb){
    heroDao.select(client," userId = ? order by id asc",[userData.id],function(err,hero){
        if (err) return cb(err);
        var reData = [];
        if(!hero) return cb(null, reData);
        hero.propArr = heroPropHelper.calHeroProp(userData, hero);
        hero.combat = heroPropHelper.calCombat(userData, hero);
        if(userData.robotId==0){
            //计算装备显示id
            reData[0] = _getClothDisplayID(userData, hero);
            //计算武器显示id
            reData[1] = _getWeaponDisplayID(userData, hero);
            //计算翅膀
            reData[2] = _getWingDisplayID(userData, hero);
            //性别
            reData[3] = hero.sex;
        }else{
            var t_robotData = t_robot[userData.robotId];
            var locDisplayIds = t_robotData.displayIds[0];

            var t_clothData = t_itemEquip[locDisplayIds[1]];
            if(hero.sex==c_prop.sexKey.male){
                reData[0] = t_clothData.displayID.split(",")[0];
            }else{
                reData[0] = t_clothData.displayID.split(",")[1];
            }
            var t_wuqiData = t_itemEquip[locDisplayIds[0]];
            reData[1] = t_wuqiData.displayID;
            var t_wingData = t_wing[locDisplayIds[2]];
            reData[2] = t_wingData.displayID;
        }

        reData[4] = userData.isKing;
        return cb(null, reData);
    });
};

/**
 * 获取主角色外观显示
 * @param client
 * @param userId
 * @param tempId
 * @param cb
 */
exports.getHeroDisplayByTempId = function(client, userId, tempId, cb){
    checkRequire();
    var reData = [];
    userDao.selectCols(client,"id,lvl,equipBag,robotId,isKing,rebirthLvl,medalData,propertyData"," id = ? ",[userId],function(err,userData){
        if (err) return cb(err);
        if(!userData) return cb(null, reData);
        heroDao.list(client," userId = ? and tempId = ? order by id asc",[userId, tempId],function(err,heroList){
            if (err) return cb(err);
            var hero;
            var index = 0;
            for(var i = 0;i<heroList.length;i++){
                var locHero = heroList[i];
                if(locHero.tempId == tempId){
                    hero = locHero;
                    index = i;
                }
            }
            if(!hero) return cb(null, reData);
            if(userData.robotId==0){
                hero.propArr = heroPropHelper.calHeroProp(userData, hero);
                hero.combat = heroPropHelper.calCombat(userData, hero);
                //计算装备显示id
                reData[0] = _getClothDisplayID(userData, hero);
                //计算武器显示id
                reData[1] = _getWeaponDisplayID(userData, hero);
                //计算翅膀
                reData[2] = _getWingDisplayID(userData, hero);
                //性别
                reData[3] = hero.sex;

            }else{
                var t_robotData = t_robot[userData.robotId];
                var locDisplayIds = t_robotData.displayIds[index];

                var t_clothData = t_itemEquip[locDisplayIds[1]];
                if(hero.sex==c_prop.sexKey.male){
                    reData[0] = t_clothData.displayID.split(",")[0];
                }else{
                    reData[0] = t_clothData.displayID.split(",")[1];
                }
                var t_wuqiData = t_itemEquip[locDisplayIds[0]];
                reData[1] = t_wuqiData.displayID;
                var t_wingData = t_wing[locDisplayIds[2]];
                reData[2] = t_wingData.displayID;
            }
            reData[4] = userData.isKing;
            return cb(null, reData);
        });
    });

};

/**
 * 获取战斗英雄
 * @param client
 * @param userData
 * @param cb
 */
exports.getPkList = function(client, userData, cb){
    checkRequire();
    heroDao.list(client," userId = ? order by id asc",[userData.id],function(err,heroList){
        if (err) return cb(err);
        var heroOtherArr = [];
        for(var i = 0;i<heroList.length;i++){
            var locHero = heroList[i];
            var locOther = [];//[衣服显示id,武器显示id,翅膀显示id]
            if(userData.robotId==0){
                locHero.propArr =  heroPropHelper.calHeroProp(userData,locHero);
                locHero.combat =  heroPropHelper.calCombat(userData,locHero);
                //计算装备显示id
                locOther[0] = _getClothDisplayID(userData,locHero);
                //计算武器显示id
                locOther[1] = _getWeaponDisplayID(userData,locHero);
                //计算翅膀
                locOther[2] = _getWingDisplayID(userData,locHero);
            }else{
                var t_robotData = t_robot[userData.robotId];
                var locDisplayIds = t_robotData.displayIds[i];

                var t_clothData = t_itemEquip[locDisplayIds[1]];
                if(locHero.sex==c_prop.sexKey.male){
                    locOther[0] = t_clothData.displayID.split(",")[0];
                }else{
                    locOther[0] = t_clothData.displayID.split(",")[1];
                }
                var t_wuqiData = t_itemEquip[locDisplayIds[0]];
                locOther[1] = t_wuqiData.displayID;
                var t_wingData = t_wing[locDisplayIds[2]];
                locOther[2] = t_wingData.displayID;
            }
            heroOtherArr.push(locOther);
        }
        var fightData = [userData.lvl,userData.equipBag,userData.nickName,userData.isKing,userData.blueDiamond,userData.rebirthLvl, userData.medalTitle, userData.propertyData];
        //[lvl,equipBag,nickName,isKing, bluediamond, rebirthLvl,medalTitle]
        cb(null,[heroList,heroOtherArr,fightData]);
    });
};

//获取英雄显示
exports.getShowHeroData = function(client,userId,cb){
    userDao.selectCols(client,"id,robotId,lvl,equipBag,nickName,isKing, blueDiamond, rebirthLvl,medalData,medalTitle,propertyData"," id = ? ",[userId],function(err,userData){
        if(err) return cb(err);
        exports.getPkList(client, userData, function(err,data){
            if(err) return cb(err);
            cb(null,[data[0],data[1],[userData.lvl,userData.equipBag,userData.nickName,userData.isKing,userData.blueDiamond, userData.rebirthLvl, userData.medalTitle]]);
        });
    });
};

/**
 * 计算属性和战力
 * @param client
 * @param userId
 * @param cb
 */
exports.calPropAndCombat = function(client,userId,cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.selectCols(client,"id,lvl,equipBag,isKing,rebirthLvl,medalData,propertyData","id = ?",[userId],cb1);
        },
        function (cb1) {
            heroDao.list(client, {userId: userId}, cb1);
        }
    ], function (err, data) {
        if(err) return cb(err);
        var userData = data[0], heroList = data[1];
        for(var i = 0;i<heroList.length;i++){
            var locHero = heroList[i];
            locHero.propArr =  heroPropHelper.calHeroProp(userData,locHero);
            locHero.combat =  heroPropHelper.calCombat(userData,locHero);
        }
        async.map(heroList,function(heroData,cb1){
            heroDao.update(client,{propArr:heroData.propArr, combat:heroData.combat},{id:heroData.id},cb1);
        },function(err,data){
            if(err) return cb(err);
            cb(null,heroList);
        });
    });
};

/**
 * 重新计算并且获取英雄列表
 * @param client
 * @param userData
 * @param cb
 */
exports.calAndGetHeroListNotUpdate = function(client,userData,cb) {
    checkRequire();
    heroDao.list(client, {userId: userData.id}, function (err, heroList) {
        if(err) return cb(err);
        for(var i = 0;i<heroList.length;i++){
            var locHero = heroList[i];
            locHero.propArr =  heroPropHelper.calHeroProp(userData,locHero);
            locHero.combat =  heroPropHelper.calCombat(userData,locHero);
        }
        cb(null,heroList);
    });
};

/**
 * 重新计算并且获取英雄列表
 * @param client
 * @param userData
 * @param cb
 */
exports.calAndGetHeroList = function(client,userData,cb) {
    checkRequire();
    heroDao.list(client, {userId: userData.id}, function (err, heroList) {
        if(err) return cb(err);
        var allCombatArr = [];
        for(var i = 0;i<heroList.length;i++){
            var locHero = heroList[i];
            locHero.propArr =  heroPropHelper.calHeroProp(userData,locHero);
            locHero.combat =  heroPropHelper.calCombat(userData,locHero);
            allCombatArr.push(locHero.combat);

            //判断装备丢失
            var equipData = locHero.equipData;
            if(equipData){
                for(var key in equipData){
/*
                    heroEquipIndexKey : {weapon:0,clothes:1,bracelet1:2,ring1:3,paralysisRing:4,reviveRing:5,protectRing:6,harmRing:7,ring2:8,bracelet2:9,helmet:10,necklace:11},
                    heroEquipIndex : {"0":'武器',"1":'衣服',"2":'手镯1',"3":'戒指1',"4":'麻痹戒指',"5":'复活戒指',"6":'护身戒指',"7":'伤害戒指',"8":'戒指2',"9":'手镯2',"10":'头盔',"11":'项链'},
                    */
                    if(key == c_prop.heroEquipIndexKey.weapon
                        ||key == c_prop.heroEquipIndexKey.clothes
                        ||key == c_prop.heroEquipIndexKey.bracelet1
                        ||key == c_prop.heroEquipIndexKey.ring1
                        ||key == c_prop.heroEquipIndexKey.ring2
                        ||key == c_prop.heroEquipIndexKey.bracelet2
                        ||key == c_prop.heroEquipIndexKey.helmet
                        ||key == c_prop.heroEquipIndexKey.necklace
                    ){
                        var uid = equipData[key];
                        if(!userData.equipBag[uid]){
                            delete equipData[key];
                            var missNum =  userData.exData[c_prop.userExDataKey.missEquip]||0;
                            userData.exData[c_prop.userExDataKey.missEquip] = missNum+1;
                        }
                    }

                }
            }
        }


        async.map(heroList,function(heroData,cb1){
            heroDao.update(client,{propArr:heroData.propArr, combat:heroData.combat,equipData:heroData.equipData},{id:heroData.id},cb1);
        },function(err,data){
            if(err) return cb(err);
            cb(null,heroList);
        });
    });
};
/*****************************************************************************************************/

//获取武器显示id
var _getClothDisplayID = function(userData,heroData){
//判断衣服
    var tempID = _getEquipTempIdByPart(userData,heroData,c_prop.heroEquipIndexKey.clothes);
    var displayIDArr = [];

    if(tempID){
        var t_itemEquipData = t_itemEquip[tempID];
        displayIDArr = t_itemEquipData.displayID.split(",");
    }else{
        //如果没有则返回角色默认
        //self.tempId
        var t_heroData = t_hero[heroData.tempId];
        displayIDArr = t_heroData.displayID.split(",");
    }

    if(heroData.sex==c_prop.sexKey.male){
        return displayIDArr[0];
    }else{
        return displayIDArr[1];
    }
};

//获取武器显示id
var _getWeaponDisplayID = function(userData,heroData){
//判断衣服
    var tempID = _getEquipTempIdByPart(userData,heroData,c_prop.heroEquipIndexKey.weapon);
    var displayID = null;

    if(tempID){
        var t_itemEquipData = t_itemEquip[tempID];
        displayID = t_itemEquipData.displayID;
    }
    return displayID;
};

//获取武器显示id
var _getWingDisplayID = function(userData,heroData){
    var wingId = heroData.wingArr[0];
    var wingLvl = heroData.wingArr[1]||0;
    var displayID = null;
    var t_wingData = t_wing[wingId];
    if(t_wingData&&wingLvl>0){
        displayID = t_wingData.displayID;
    }
    return displayID;
};

//根据部位获得装备tempId，如果该部位没有装备则返回null
var _getEquipTempIdByPart = function(userData,heroData,part){
    var equipId = heroData.equipData[part];
    if(!equipId) return null;
    var equipData = userData.equipBag[equipId];
    if(!equipData) return null;
    return equipData[0];
};

//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};
/*
*client
* totaolGainExp
* wing [wingStar, wingLvl,wingId, oldWingId]
* wingShowArr
* delBagItems
* cost [costGold,costDiamond]
* isCrit
* userData
* heroData
* cb
 */
//
var _over = function(client, totalGainExp, wing, wingShowArr,delBagItems, cost,isCrit,userData, heroData, cb) {
    var wingExp = totalGainExp;
    var wingStar = wing[0];
    var wingLvl = wing[1];
    var wingId = wing[2];
    var oldWingId = wing[3];
    var costGold = cost[0];
    var costDiamond = cost[1];
    //wingStar += starLvl;
    if(wingStar >= 10) wingExp = 0;
    heroData.wingArr[0] = wingId;
    heroData.wingArr[1] = wingLvl;
    heroData.wingArr[2] = wingStar;
    heroData.wingArr[3] = wingExp;
    //heroData.wingArr = [wingId,wingLvl,wingStar,wingExp];
    heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
    heroData.combat =  heroPropHelper.calCombat(userData,heroData);

    //推送系统消息(oldma)

    if(oldWingId!=wingId){
        //第一个%s：玩家名
        //第二个%s：翅膀名
        chatBiz.addSysData(8,[userData.nickName,t_wing[wingId].name,wingId]);
        chatBiz.addSysData(9,[userData.nickName,t_wing[wingId].name,wingId]);
    }

    chatBiz.addSysData(10,[userData.nickName,isCrit]);

    //更新
    var upUserData = {
        gold: userData.gold,
        diamond: userData.diamond,
        buyDiamond:userData.buyDiamond,
        giveDiamond:userData.giveDiamond,
        bag: userData.bag,
        equipBag: userData.equipBag
    }
    var upHeroData = {
        propArr:heroData.propArr,
        combat:heroData.combat,
        wingArr:heroData.wingArr
    };
    async.parallel([
        function (cb1) {
            userDao.update(client, upUserData, {id: userData.id}, cb1);
        },
        function (cb1) {
            heroDao.update(client, upHeroData, {id: heroData.id}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        delete upUserData.bag;
        delete upUserData.equipBag;
        cb(null, [upUserData,upHeroData,delBagItems,wingShowArr[0],wingShowArr[1],costGold,costDiamond]);
    });
}

/*


*/
/**
 * 获取主角色外观显示
 * @param client
 * @param userId
 * @param cb
 *//*

var getHeroDisplay = function(client,userId,cb){
    checkRequire();
    var reList = [];
    userDao.selectCols(client,"id,lvl,equipBag"," id = ? ",[userId],function(err,userData){
        if (err) return cb(err);
        if(!userData) return cb(null, reData);
        heroDao.list(client," userId = ? order by id asc",[userId],function(err,heroList){
            if (err) return cb(err);
            for(var i = 0;i<heroList.length;i++){
                var reData = [];
                var hero = heroList[i];
                hero.propArr = heroPropHelper.calHeroProp(userData.lvl, userData.equipBag, hero);
                hero.combat = heroPropHelper.calCombat(userData.lvl, userData.equipBag, hero);
                //计算装备显示id
                reData[0] = _getClothDisplayID(userData, hero);
                //计算武器显示id
                reData[1] = _getWeaponDisplayID(userData, hero);
                //计算翅膀
                reData[2] = _getWingDisplayID(userData, hero);
                //性别
                reData[3] = hero.sex;
                reList.push(reData);
            }

            console.log(reList);
            return cb(null, reList);
        });
    });

};
var uwClient = require("uw-db").uwClient;
getHeroDisplay(uwClient,2201,function(){});*/



