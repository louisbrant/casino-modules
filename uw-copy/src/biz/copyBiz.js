/**
 * Created by Administrator on 2014/5/9.
 */
var uwData = require("uw-data");
var c_vip = uwData.c_vip;
var c_game = uwData.c_game;
var t_copy = uwData.t_copy;
var t_item = uwData.t_item;
var c_prop = uwData.c_prop;
var c_open = uwData.c_open;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var t_copyLoot = uwData.t_copyLoot;
var t_guildCopy = uwData.t_guildCopy;
var t_guildCopyBoss = uwData.t_guildCopyBoss;
var c_bossHurtRate = uwData.c_bossHurtRate;
var t_monster = uwData.t_monster;
var c_guildFuncCfg = uwData.c_guildFuncCfg;
var t_paTaTreasury = uwData.t_paTaTreasury;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var UserEntity = require('uw-entity').UserEntity;
var CopyProgressEntity = require("uw-entity").CopyProgressEntity;
var formula = require("uw-formula");
var mainClient = require("uw-db").mainClient;
var g_copyFight = require("uw-global").g_copyFight;
var dsConsts = require("uw-data").dsConsts;
var BossObj = require('uw-log').BossObj;
var g_data = require("uw-global").g_data;

var ds = require("uw-ds").ds;
var fightBiz = require("uw-fight").fightBiz;
var exports = module.exports;
var FightResult = ds.FightResult;

var chatBiz = null;
var gameCommonBiz = null;
var guildPersonalBiz = null;
var propUtils = null;
var userDao = null;
var heroBiz = null;
var copyProgressDao = null;
var copyUtils = null;
var userUtils = null;
var biBiz = null;
var commonUtils = null;
var g_guild = null;
var guildPersonalDao = null;
var mailBiz = null;
var fightUtils = null;

var checkRequire = function(){
    guildPersonalBiz = guildPersonalBiz||require("uw-guild").guildPersonalBiz;
    propUtils = propUtils||require("uw-utils").propUtils;
    userDao = userDao||require("uw-user").userDao;
    heroBiz = heroBiz||require("uw-hero").heroBiz;
    copyProgressDao = copyProgressDao||require("../dao/copyProgressDao");
    copyUtils = copyUtils||require("../biz/copyUtils");
    userUtils = userUtils||require("uw-user").userUtils;
    biBiz = biBiz||require('uw-log').biBiz;
    commonUtils = commonUtils||require("uw-utils").commonUtils;
    gameCommonBiz = gameCommonBiz||require("uw-game-common").gameCommonBiz;
    chatBiz = chatBiz || require("uw-chat").chatBiz;
    g_guild = g_guild || require("uw-global").g_guild;
    guildPersonalDao = guildPersonalDao || require("uw-guild").guildPersonalDao;
    mailBiz = mailBiz || require("uw-mail").mailBiz;
    fightUtils = fightUtils || require("uw-fight").fightUtils;
};

 /**
 * 获取副本数据
 * @param client
 * @param userId
 * @param type   副本类型
 * @param cb
 */
exports.getInfo = function(client,userId,type,cb){
    checkRequire();
    copyProgressDao.select(client,{userId:userId,copyType:type},function(err,copyProgressData){
        if (err) return cb(err);
        if(copyProgressData)  return cb(null,copyProgressData);
        var copyProgress = new CopyProgressEntity();
        /** 用户id **/
        copyProgress.userId = userId;/*用户id*/
        /** 副本类型 **/
        copyProgress.copyType = type;/*副本类型*/
        /** 连胜 **/
        copyProgress.winningStreak = 0;/*连胜*/
        copyProgress.pCopyId = 0;

        /** 已通关子副本列表 **/
        copyProgress.copyObj = {};/*已通关子副本列表{子副本id:节点,子副本id:节点...}*/
        /** 子副本挑战时间列 **/
        copyProgress.timeArr = [];/*子副本挑战时间列*/
        /** 子副本星级 **/
        copyProgress.copyStar = {};/*子副本星级*/
        /** 主副本是否已经通过 **/
        copyProgress.finished = 0;/*主副本是否已经通过*/
        /** 子副本剩余挑战次数 **/
        copyProgress.timesPerDay = {};/*子副本已通关次数*/
        /** 购买次数 **/
        copyProgress.resetCounts = {};/*购买次数{id:次数,id:次数...}*/
        /** 查看数据 **/
        copyProgress.readObj = {};/*查看数据{副本id:是否阅读}*/

        copyProgressDao.insert(client,copyProgress,function(err,data){
            if (err) return cb(err);
            copyProgress.id = data.insertId;
            cb(null,copyProgress);
        });
    });
};

/**
 * 购买挑战次数
 * @param client
 * @param userId
 * @param type   副本类型
 * @param copyId   副本id
 * @param cb
 */
exports.buyCopyCount = function(client,userId,type,copyId,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1)
        },
        function(cb1){
            copyProgressDao.select(client,{userId:userId,copyType:type},cb1)
        }
    ],function(err,data){
        if (err) return cb(err);
        var userData = data[0],copyProgressData = data[1];
        var resetCounts = copyUtils.getBuyCopyCount(copyProgressData,copyId);     //今日购买次数
        var timesPerDay = copyUtils.getReTime(userData,copyProgressData,copyId,type);       //剩余次数
        //if(timesPerDay > 0) return cb("还有挑战次数");

        var costDiamond = 0;        // 购买次数所需钻石
        switch (type){
            case c_prop.copyTypeKey.equip:      //装备副本
                costDiamond = formula.calBuyEquip(resetCounts);
                break;
            case c_prop.copyTypeKey.hell:      //Boss副本
                var vipExt = c_vip[userData.vip||0].bossCount - c_vip[0].bossCount + timesPerDay;
                if(vipExt > 0) return cb("还有挑战次数");
                var buyBossCount = c_vip[userData.vip||0].buyBossCount;
                if(resetCounts > buyBossCount) return cb("超过购买次数");
                costDiamond = formula.calBuyBoss(resetCounts);
                break;
            case c_prop.copyTypeKey.state:      //境界副本
                costDiamond = formula.calBuyRealm(resetCounts);
                break;
            case c_prop.copyTypeKey.paTa:      //爬塔
                costDiamond = formula.calPaTaAward(resetCounts,userData.highPaTa);
                break;
        }
        //判断被扣除钻石
        if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));//钻石不足
        //添加次数
        copyProgressData.timesPerDay[copyId] = timesPerDay + 1;
        copyProgressData.resetTime = new Date();
        copyProgressData.resetCounts[copyId] = resetCounts;
        //扣除钻石
        userUtils.reduceDiamond(userData,costDiamond,consts.diamondConsumeType.user_5,"");

        //需要更新的数据
        var updateUserData = {
            diamond:userData.diamond,
            giveDiamond : userData.giveDiamond,
            buyDiamond : userData.buyDiamond
        };
        var updateCopyData = {
            resetTime:copyProgressData.resetTime,
            timesPerDay : copyProgressData.timesPerDay,
            resetCounts:copyProgressData.resetCounts,
            refreshTime:copyProgressData.refreshTime
        };
        async.parallel([
            function(cb2){
                userDao.update(client,updateUserData,{id:userId},cb2)
            },
            function(cb2){
                copyProgressDao.update(client,updateCopyData,{id:copyProgressData.id},cb2)
            }
        ],function(err,data2) {
            if (err) return cb(err);
            cb(null, [userData,copyProgressData,costDiamond])
        });
    });
};


/**
 * 购买装备入场卷
 * @param client
 * @param userId
 * @param cb
 */
exports.buyEquipTessera = function(client,userId,cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if (err) return cb(err);
        var items = {};
        var itemsArr = [];
        var bagItems = {};
        var equipBagItems = {};
        var costDiamond = t_item[c_prop.spItemIdKey.equipTessera].price;        //价格

        //判断被扣除钻石
        if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));//钻石不足
        //添加物品
        items[c_prop.spItemIdKey.equipTessera] = 1;
        itemsArr = userUtils.saveItems(userData,items);
        //扣除钻石
        userUtils.reduceDiamond(userData,costDiamond,consts.diamondConsumeType.user_6,"");

        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);

        //需要更新的数据
        var updateData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag,
            prestige: userData.prestige
        };
        userDao.update(client,updateData,{id:userId},function(err,data) {
            if (err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            cb(null, [updateData,bagItems,equipBagItems,costDiamond])
        });
    });
};

/**
 * 购买境界入场卷
 * @param client
 * @param userId
 * @param cb
 */
exports.buyRealmTessera = function(client,userId,cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if (err) return cb(err);
        var items = {};
        var itemsArr = [];
        var bagItems = {};
        var equipBagItems = {};
        var costDiamond = t_item[c_prop.spItemIdKey.realmTessera].price;        //价格

        //判断被扣除钻石
        if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));//钻石不足
        //添加物品
        items[c_prop.spItemIdKey.realmTessera] = 1;
        itemsArr = userUtils.saveItems(userData,items);
        //扣除钻石
        userUtils.reduceDiamond(userData,costDiamond,consts.diamondConsumeType.user_6,"");

        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);

        //需要更新的数据
        var updateData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag,
            prestige: userData.prestige
        };
        userDao.update(client,updateData,{id:userId},function(err,data) {
            if (err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            cb(null, [updateData,bagItems,equipBagItems,costDiamond]);
        });
    });
};



/**
 * 计算副本影响英雄
 * @param copyInfo
 * @param userData
 * @param heroList
 */
exports.calCopyHeroes = function(copyInfo, userData,  heroList){
    checkRequire();
    //英雄数据改变
    for (var i = 0; i < heroList.length; i++) {
        var heroData = heroList[i];
        //经验计算升级
        if (copyInfo.expc) {
            heroBiz.calAddExpc(heroData, copyInfo.expc, userData.lvl);
        }
    }
};


/**
 * 计算副本掉落
 * @param copyTemp
 * @param isWipe 是否扫荡
 * @returns {{}}
 */
exports.calCopyLootItems = function (copyTemp, isWipe) {
    checkRequire();

    var copyId = copyTemp.id;
    var lootInfo = t_copyLoot[copyId];
    var items = {};
    if (!lootInfo) return items;
    var lootItemArr = isWipe ? lootInfo.wipeItems : lootInfo.lootItems;
    if(lootItemArr){
        for (var i = 0; i < lootItemArr.length; i++) {
            var locItemInfo = lootItemArr[i];
            var locItemId = locItemInfo[0];
            if(!locItemId) continue;
            var locRate = locItemInfo[1];
            var locMinCount = locItemInfo[2];
            var locMaxCount = locItemInfo[3];
            if (Math.random() * 10000 > locRate) continue;
            var locAddNum = 0 | (Math.random() * (locMaxCount - locMinCount + 1));
            locAddNum+=locMinCount;
            if(locAddNum<=0) continue;
            var locItemCount = items[locItemId]||0;
            items[locItemId] = locItemCount+ locAddNum;
        }
    }

    return items;
};

//副本开始
exports.start = function(client,userId,copyId,biCost,cb){
    checkRequire();
    biCost = parseInt(biCost);
    var t_copyData = t_copy[copyId];
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1)
        },
        function(cb1){
            exports.getInfo(client,userId,t_copyData.type,cb1)
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0], copyProgressData = data[1];
        //判断次数

        if(t_copyData.type==c_prop.copyTypeKey.normal){
            //普通boss ，重置连胜
            //判断连胜
            //if(copyProgressData.winningStreak<t_copyData.monsterCount) return cb("连胜条件没达到");}

            if(copyId==1){
                if(copyProgressData.copyObj[2]) return cb("第1个副本进度异常");
            } else if(copyId>=2){
                var preCopyId = commonUtils.getLastKey(copyProgressData.copyObj);
                if(copyId!=preCopyId){
                    return cb("副本进度异常");
                }
            }
        }else if(t_copyData.type==c_prop.copyTypeKey.paTa){
            var paTaOpen = c_open.paTa.lvlRequired;
            if(userData.lvl < paTaOpen) return cb(getMsg(c_msgCode.towerNotOpen),paTaOpen);
            //领取当前关卡的奖励后才能挑战下一层
            var section = c_game.towerCopy[0].split(",");       //爬塔副本id区间
            if(copyId != section[0]){
                var awardArr = copyProgressData.copyObj[copyId-1]||[];        //{copyId:[最低血量,是否领取],copyId:[最低血量,是否领取],.....}
                if(!awardArr[1] || awardArr[1] != 1) return cb("请先领取关卡奖励！");
            }
        }else{
            //开启条件
            /*0,或者空值:无条件
            1等级
            2普通副本通关
            3境界要求
            999不开启
            4VIP等级*/
            var conds = t_copyData.cond||[];
            for(var i = 0;i<conds.length;i++){
                var locCond = conds[i]||[];
                var locType = locCond[0];
                var locValue = locCond[1];
                if(locType==1){
                    var lvl = userData.lvl;
                    if(locValue > lvl) return cb(getMsg(c_msgCode.noRoleLvl),locValue);
                }
                if(locType==999){
                    return cb("副本暂未开启");
                }
                if(locType==4){
                    var vip = userData.vip;
                    if(locValue > vip) return cb("vip等级不足");
                }
            }

            //装备副本,消耗挑战次数
            var vipExt = 0;
            switch (t_copyData.type){
                case c_prop.copyTypeKey.equip:
                    vipExt = c_vip[userData.vip].equipCount - c_vip[0].equipCount;
                    break;
                case c_prop.copyTypeKey.hell:
                    vipExt = c_vip[userData.vip].bossCount - c_vip[0].bossCount;
                    break;
                case c_prop.copyTypeKey.state:
                    vipExt = c_vip[userData.vip].realmCount - c_vip[0].realmCount;
                    break;
                case c_prop.copyTypeKey.vip:
                    var copyVip  = copyUtils.getCopyVip(copyId);
                    if(copyVip==7 ) vipExt = c_vip[userData.vip].copyCountV7;
                    if(copyVip==10 ) vipExt = c_vip[userData.vip].copyCountV10;
                    if(copyVip==14 ) vipExt = c_vip[userData.vip].copyCountV14;
                    if(copyVip==17 ) vipExt = c_vip[userData.vip].copyCountV17;
                    if(copyVip==19 ) vipExt = c_vip[userData.vip].copyCountV19;
                    break;
            }
            var reNum = copyUtils.getReTime(userData,copyProgressData,copyId,t_copyData.type);
            if(reNum+vipExt<=0) return cb("次数不足");
        }
        var costDiamondRecord = [t_copyData.type];
        var needItemId = 0;
        if (t_copyData.type == c_prop.copyTypeKey.equip) {
            //装备副本,装备入场券
            needItemId = c_prop.spItemIdKey.equipTessera;
        } else if (t_copyData.type == c_prop.copyTypeKey.hell) {
            //boss试炼副本,boss令牌
            var bossTessera = userData.bag[c_prop.spItemIdKey.bossTessera]||0;
            var replaceCount = userUtils.getTodayCount(userData,c_prop.userRefreshCountKey.bossTesseraReplace);     //获取今日替代令使用次数
            if(bossTessera > 0 || replaceCount >= c_game.bossTesseraReplace[1]){
                needItemId = c_prop.spItemIdKey.bossTessera;
            }else{
                needItemId = c_prop.spItemIdKey.bossTesseraReplace;
            }
        } else if (t_copyData.type == c_prop.copyTypeKey.state) {
            //境界副本，入场券
            needItemId = c_prop.spItemIdKey.realmTessera;
        }

        var delBagItems = {};
        var costObj = {};//biLog消耗
        if(needItemId){
            var ownNum = userData.bag[needItemId]||0;
            var ownNumJudgment = 1;
            if(needItemId == c_prop.spItemIdKey.bossTesseraReplace) ownNumJudgment = c_game.bossTesseraReplace[0];
            if(ownNum<ownNumJudgment){
                var needDiamond = t_item[needItemId].price;
                if(needItemId == c_prop.spItemIdKey.bossTesseraReplace) needDiamond = t_item[c_prop.spItemIdKey.bossTessera].price;
                //判断元宝
                if(userData.diamond<needDiamond) return cb(getMsg(c_msgCode.noDiamond));
                costDiamondRecord[1] = needDiamond;
                biCost += needDiamond;

                userUtils.reduceDiamond(userData,needDiamond);
            }else{
                userUtils.delBag(userData.bag,needItemId,ownNumJudgment);
                delBagItems[needItemId] = ownNumJudgment;
                costObj[needItemId] = ownNumJudgment;
                if(needItemId == c_prop.spItemIdKey.bossTesseraReplace) userUtils.addTodayCount(userData,c_prop.userRefreshCountKey.bossTesseraReplace,1);     //添加今日替代令使用次数
            }
        }
        if(biCost>0 && t_copyData.type == c_prop.copyTypeKey.hell) costObj[c_prop.spItemIdKey.diamond] = biCost;
        if (t_copyData.type == c_prop.copyTypeKey.hell) g_data.setBossCost(userId, costObj);

        var updateUser = {
            bag:userData.bag,
            diamond:userData.diamond,
            giveDiamond:userData.giveDiamond,
            buyDiamond:userData.buyDiamond,
            counts:userData.counts,
            countsRefreshTime:userData.countsRefreshTime
        };
        var updateCopyProgress = {
            winningStreak:copyProgressData.winningStreak
        };

        g_data.setPkEnemyId(userId, copyId);

        async.parallel([
            function(cb1){
                userDao.update(client,updateUser,{id:userId},cb1)
            },
            function(cb1){
                copyProgressDao.update(client,updateCopyProgress,{userId:userId,copyType:t_copyData.type},cb1)
            }
        ],function(err,data){
            if(err) return cb(err);
            var copyLoot = fightBiz.getAndInitNextLoot(userId,copyId,true,userData.lvl,false);
            var keys = Object.keys(copyLoot);
            var lastKey = keys[keys.length-1];
            g_copyFight.newData(userId,lastKey);
            var vData = [];
            delete updateUser.bag;
            cb(null,[updateUser,updateCopyProgress,copyLoot,vData,delBagItems,costDiamondRecord]);
        });
    });

};

//副本结束
exports.end = function(client,userId,copyId,isWin ,fightData, cb){
    checkRequire();
    var star = fightData[dsConsts.FightData.star]||0;
    var t_copyData = t_copy[copyId];

    var oldKey = g_data.getPkEnemyId(userId);
    if (oldKey != copyId) return cb("无效的数据!");

    g_data.setPkEnemyId(userId, -111);

    //todo 校验战斗数据
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            exports.getInfo(client,userId,t_copyData.type,cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0], copyProgressData = data[1];
        var bossObj = new BossObj();
        bossObj.type = c_prop.biLogTypeKey.boss;
        bossObj.serverId = userData.serverId;
        bossObj.accountId = userData.accountId;
        bossObj.userId = userData.id;
        bossObj.nickName = userData.nickName;
        bossObj.happenTime = (new Date()).toFormat("YYYY-MM-DD HH24:MI:SS");
        bossObj.getObj = {};
        var costObj = g_data.getBossCost(userId);
        bossObj.costObj = costObj;
        bossObj.bossId = copyId;  /** 挑战bossId **/
        bossObj.isWin = isWin?1:0;  /** 挑战是否胜利 **/
        if(!isWin) {
            if(t_copyData.type==c_prop.copyTypeKey.hell) biBiz.bossBi(JSON.stringify(bossObj));
            if(t_copyData.type==c_prop.copyTypeKey.paTa){
                if(!copyProgressData.copyObj[copyId]) copyProgressData.copyObj[copyId] = [];
                var residueHp = fightData[dsConsts.FightData.residueHp]||0;
                var nowResidueHp = copyProgressData.copyObj[copyId][0]||t_monster[t_copy[copyId].bossID].maxHp;
                if(residueHp<=0) residueHp = 1;
                if(residueHp && residueHp < nowResidueHp) exports.setPaTaResidueHp(client,userId,copyId,residueHp,function(){});        //记录最低血量
            }
            return cb(null,[null,null]);
        }
        if(t_copyData.type==c_prop.copyTypeKey.normal){
            copyProgressData.winningStreak = 0;

            //普通boss ，自动下一个副本
            copyProgressData.copyObj[copyId+1] = 1;

            gameCommonBiz.calHighCopyId(client, userData.nickName,copyId ,function(){});

            //第一个%s：玩家名
            //第二个%s：普通副本名
            chatBiz.addSysData(16,[userData.nickName,t_copyData.name,copyId]);
        }else if(t_copyData.type==c_prop.copyTypeKey.paTa){
            if(!copyProgressData.copyObj[copyId]) copyProgressData.copyObj[copyId] = [];
            copyProgressData.copyObj[copyId][0] = -1;
        }else{
            //装备副本,消耗挑战次数
            var vipExt = 0;
            switch (t_copyData.type){
                case c_prop.copyTypeKey.equip:
                    vipExt = c_vip[userData.vip].equipCount - c_vip[0].equipCount;
                    break;
                case c_prop.copyTypeKey.hell:
                    vipExt = c_vip[userData.vip].bossCount - c_vip[0].bossCount;
                    break;
                case c_prop.copyTypeKey.state:
                    vipExt = c_vip[userData.vip].realmCount - c_vip[0].realmCount;
                    break;
                case c_prop.copyTypeKey.vip:
                    var copyVip  = copyUtils.getCopyVip(copyId);
                    if(copyVip==7 ) vipExt = c_vip[userData.vip].copyCountV7;
                    if(copyVip==10 ) vipExt = c_vip[userData.vip].copyCountV10;
                    if(copyVip==14 ) vipExt = c_vip[userData.vip].copyCountV14;
                    if(copyVip==17 ) vipExt = c_vip[userData.vip].copyCountV17;
                    if(copyVip==19 ) vipExt = c_vip[userData.vip].copyCountV19;
                    break;
            }

            var reNum = copyUtils.getReTime(userData,copyProgressData,copyId,t_copyData.type);
            if(reNum+vipExt<=0) return cb("次数不足");

            copyUtils.setTimesPerDay(copyProgressData,copyId,reNum-1);
            //copyProgressData.refreshTime = new Date();
            var oldStar = copyProgressData.copyStar[copyId]||0;
            if(star>oldStar) copyProgressData.copyStar[copyId] = star;
        }


        var updateCopyProgress = {
            winningStreak:copyProgressData.winningStreak,
            copyObj:copyProgressData.copyObj,
            timesPerDay:copyProgressData.timesPerDay,
            refreshTime:copyProgressData.refreshTime,
            copyStar:copyProgressData.copyStar
        };

        var g_fightData = g_copyFight.getData(userId);
        if(!g_fightData) return cb("无数据，验证失败");
        var lootUID = g_fightData[0];
        if(!lootUID) return cb("无数据，验证失败");
        async.parallel([
            function(cb1){
                fightBiz.pickLoot(client,userId,[[copyId,lootUID,true]],true,cb1);
            },
            function(cb1){
                copyProgressDao.update(client,updateCopyProgress,{userId:userId,copyType:t_copyData.type},cb1)
            },
            function(cb1){
                _addAct(client,userId,t_copyData.type,cb1);
            }
        ],function(err,data){
            if(err) return cb(err);
            var updateUser = data[0][0];
            var bagItems = data[0][2];
            var equipBagItems = data[0][3];
            var getDiamond = data[0][4];
            g_copyFight.delData(userId);

            bossObj.getObj = bagItems;
            if(t_copyData.type==c_prop.copyTypeKey.hell) biBiz.bossBi(JSON.stringify(bossObj));

            var actData = data[2];
            var guildData = actData[0];
            var guildPersonalData = actData[1];

            cb(null,[updateUser,updateCopyProgress,bagItems,equipBagItems,guildData,guildPersonalData,getDiamond]);
        });
    });

};

//记录爬塔最低血量
exports.setPaTaResidueHp = function(client,userId,copyId,residueHp,cb){
    checkRequire();
    copyProgressDao.selectCols(client," id,copyObj ", " userId = ? and copyType = ?",[userId,c_prop.copyTypeKey.paTa],function(err,copyProgressData){
        if(err) return cb(err);
        if(!copyProgressData.copyObj[copyId]) copyProgressData.copyObj[copyId] = [];
        copyProgressData.copyObj[copyId][0] = residueHp;
        copyProgressDao.update(client, {copyObj: copyProgressData.copyObj}, {id: copyProgressData.id}, cb);
    });
};

var _addAct = function(client,userId,copyType,cb){
    switch (copyType){
        case c_prop.copyTypeKey.equip:
            guildPersonalBiz.otherAct(client, userId,2, cb);
            break;
        case c_prop.copyTypeKey.hell:
            guildPersonalBiz.otherAct(client, userId,4, cb);
            break;
        case c_prop.copyTypeKey.state:
            guildPersonalBiz.otherAct(client, userId,3, cb);
            break;
        default:
            cb(null,[null,null]);
            break;
    }
};

/**
 * 更新连胜
 * @param client
 * @param userId
 * @param copyId
 * @param cb
 */
exports.updateWinningStreak = function(client,userId,copyId,cb){
    checkRequire();
    var t_copyData = t_copy[copyId];
    var copyType = t_copyData.type;
    copyProgressDao.select(client,{userId: userId, copyType: copyType},function(err,copyProgressData){
        if(err) return cb(err);
        //普通副本，连胜+
        var updateCopyProgress = null;
        if(copyType == c_prop.copyTypeKey.normal){
            if(copyProgressData.winningStreak<t_copyData.monsterCount){
                copyProgressData.winningStreak++;
                updateCopyProgress = {winningStreak:copyProgressData.winningStreak};
            }
        }
        if(!updateCopyProgress) return cb(null,updateCopyProgress);

        copyProgressDao.update(client,updateCopyProgress,{id: copyProgressData.id},function(err,data){
            if(err) return cb(err);
            cb(null,updateCopyProgress);
        });

    });
};

/**
 * 更新连胜
 * @param client
 * @param userId
 * @param copyId
 * @param cb
 */
exports.setRead = function(client,userId,copyId,cb){
    checkRequire();
    var t_copyData = t_copy[copyId];
    var copyType = t_copyData.type;
    copyProgressDao.select(client,{userId: userId, copyType: copyType},function(err,copyProgressData){
        if(err) return cb(err);
        copyProgressData.readObj[copyId] = 1;
        var updateCopyProgress = {
            readObj:copyProgressData.readObj
        };
        copyProgressDao.update(client,updateCopyProgress,{id: copyProgressData.id},function(err,data){
            if(err) return cb(err);
            cb(null,updateCopyProgress);
        });

    });
};

//公会副本开始
exports.guildStart = function(client,userId,copyId,bossId,cb){
    checkRequire();
    bossId = parseInt(bossId);
    var type = c_prop.copyTypeKey.guild;
    if(!t_guildCopy[copyId] || !t_guildCopyBoss[bossId]) return cb("数据异常");
    var section = t_guildCopy[copyId].section;
    if(bossId<section[0]||bossId>section[1]) return cb("数据异常");
    async.parallel([
        //function(cb1){
        //    userDao.select(client,{id:userId},cb1)
        //},
        function(cb1){
            exports.getInfo(client,userId,type,cb1)
        },
        function (cb1) {
            guildPersonalDao.selectCols(client," guildId ", {userId: userId}, cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var copyProgressData = data[0],mPersonalData = data[1];     //userData = data[0],

        var refreshTime = copyProgressData.refreshTime;
        var guildData = g_guild.getGuild(mPersonalData.guildId);
        if (!guildData) return cb(getMsg(c_msgCode.outGuildBoss));
        if(!guildData.guildCopyData) guildData.guildCopyData = {};
        //开启条件
        var openLvl = t_guildCopy[copyId].openLvl;
        if(openLvl > guildData.lvl) return cb("行会等级不足");
        var needProgress = c_game.guildCopyCfg[2];
        for(var i =section[0];i<=section[1];i++){
            if(bossId > i){
                if(!guildData.guildCopyData[i]) return cb("上一个boss进度还未完成");
                var progress1 = guildData.guildCopyData[i][0]||0;
                if(progress1<needProgress) return cb("上一个boss进度还未完成");
            }
        }
        //判断当前进度
        if(!guildData.guildCopyData[bossId]) guildData.guildCopyData[bossId] = [];
        var progress2 = guildData.guildCopyData[bossId][0]||0;
        if(progress2>=needProgress) return cb("该BOSS已被击杀，不可继续挑战！");


        //消耗挑战次数
        //var vipExt = c_vip[userData.vip].guildFbCount - c_vip[0].guildFbCount;
        //var reNum = copyUtils.getReTime(userData,copyProgressData,bossId,type);
        //if(reNum+vipExt<=0) return cb("次数不足");

        //判断cd
        var pCopyId = copyProgressData.pCopyId||0;     //cd秒数
        if(refreshTime) {
            //判断cd
            var timeLimit = c_game.guildCopyCfg[3];
            var second = (new Date().getTime() - refreshTime.getTime()) / 1000;
            if(pCopyId >= timeLimit){
                if(second < pCopyId) return cb("CD中！");
                //if ((pCopyId - second) > timeLimit) return cb("CD中！");
            }
        }

        g_data.setPkEnemyId(userId, copyId+""+bossId);

        cb(null,[]);
    });
};

//公会副本结束
exports.guildEnd = function(client,userId,copyId,bossId,isWin, cb){
    checkRequire();
    isWin = isWin?1:0;  /** 挑战是否胜利 **/
    var nowTime = new Date();
    var type = c_prop.copyTypeKey.guild;
    if(!t_guildCopy[copyId] || !t_guildCopyBoss[bossId]) return cb("数据异常");
    var section = t_guildCopy[copyId].section;
    if(bossId<section[0]||bossId>section[1]) return cb("数据异常");
    var index = parseInt(bossId)-parseInt(section[0])+1;


    var oldKey = g_data.getPkEnemyId(userId);
    var mKey = copyId+""+bossId;
    if (oldKey != mKey) return cb("无效的数据!");

    //todo 校验伤害数据
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            exports.getInfo(client,userId,type,cb1);
        },
        function (cb1) {
            guildPersonalDao.selectCols(client," guildId ", {userId: userId}, cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0], copyProgressData = data[1],mPersonalData = data[2];

        var refreshTime = copyProgressData.refreshTime;     //最后通关副本时间
        var guildData = g_guild.getGuild(mPersonalData.guildId);
        if (!guildData) return cb(null,[{},{},{},{},{},0,0,0,{},getMsg(c_msgCode.outGuildBoss)]);
        if(!guildData.guildCopyData) guildData.guildCopyData = {};
        //开启条件
        var openLvl = t_guildCopy[copyId].openLvl;
        if(openLvl > guildData.lvl) return cb(null,[{},{},{},{},{},0,0,0,{},"行会等级不足"]);
        var needProgress = c_game.guildCopyCfg[2];
        for(var i =section[0];i<=section[1];i++){
            if(bossId > i){
                if(!guildData.guildCopyData[i]) return cb(null,[{},{},{},{},{},0,0,0,{},"上一个boss进度还未完成"]);
                var progress1 = guildData.guildCopyData[i][0]||0;
                if(progress1<needProgress) return cb(null,[{},{},{},{},{},0,0,0,{},"上一个boss进度还未完成"]);
            }
        }
        //判断当前进度
        //var progress2 = guildData.guildCopyData[bossId][0]||0;
        //if(progress2>=needProgress) return cb(null,[{},{},{},{},{},0,0,0,{},"该BOSS已被击杀，不可继续挑战！"]);

        //消耗挑战次数
        //var vipExt = c_vip[userData.vip].guildFbCount - c_vip[0].guildFbCount;
        //var reNum = copyUtils.getReTime(userData,copyProgressData,bossId,type);
        //if(reNum+vipExt<=0) return cb("次数不足");
        //copyUtils.setTimesPerDay(copyProgressData,bossId,reNum-1);

        //判断cd
        var second = 0;
        var pCopyId = copyProgressData.pCopyId||0;     //cd秒数
        if(refreshTime) {
            //判断cd
            var timeLimit = c_game.guildCopyCfg[3];
            second = (new Date().getTime()-refreshTime.getTime())/1000;
            if(pCopyId >= timeLimit){
                if(second < pCopyId) return cb(null,[{},{},{},{},{},0,0,0,{},"CD中！"]);
            }
            //if((pCopyId - second) > timeLimit) return cb(null,[{},{},{},{},{},0,0,0,{},"CD中！"]);
            var resetTime = guildData.resetTime;
            if (resetTime) {
                if (refreshTime < resetTime && nowTime > resetTime) {
                    copyProgressData.timesPerDay = {};
                }
            }
        }
        var cdSecond = c_game.guildCopyCfg[0];
        var count = copyProgressData.timesPerDay[bossId]||0;
        copyProgressData.timesPerDay[bossId] = count+1;
        copyProgressData.refreshTime = nowTime;
        copyProgressData.pCopyId = pCopyId - second + cdSecond;
        if(second > pCopyId) copyProgressData.pCopyId = cdSecond;

        var bossAward = {};
        var chapterAward = [{}];
        var guildCopyData = guildData.guildCopyData || {};
        if(!guildCopyData[bossId]) guildCopyData[bossId] = [];
        var guildCopyArr = guildCopyData[bossId];
        if(!guildCopyArr[1]) guildCopyArr[1] = [];
        var participationData = guildCopyArr[1];        //参与成员数据
        //胜利
        if(isWin){
            //记录参与
            if(participationData.indexOf(userId) == -1) participationData.push(userId);
            //计算进度
            var pg = guildCopyArr[0] || 0;
            var addProgress = 1;        //胜利累加次数
            if(pg<needProgress) {
                if ((pg + addProgress) >= needProgress) {       //完成boss进度
                    guildCopyArr[0] = needProgress;
                    //todo 行会宝库获得
                    //奖励直接通过邮件获得
                    bossAward = _getBossAward(bossId);
                    chapterAward = _getChapterAward(bossId,needProgress,guildCopyData);
                } else {
                    guildCopyArr[0] = pg + addProgress;
                }
            }

            //计算获得
            var bagItems = {};
            var equipBagItems = {};
            var getDiamond = 0;
            var award =  t_guildCopyBoss[bossId].award;
            var item = {};
            if(award.length>0){
                var itemsArr = [];
                for(var i = 0;i<award.length;i++){
                    item[award[i][0]] = award[i][1];
                    if(award[i][0] == c_prop.spItemIdKey.diamond) getDiamond+=award[i][1];
                }
                itemsArr = userUtils.saveItems(userData,item);
                if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
                if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
            }
        }

        var updateCopyProgress = {
            timesPerDay:copyProgressData.timesPerDay,
            refreshTime:copyProgressData.refreshTime,
            pCopyId:copyProgressData.pCopyId
        };

        var updateData ={
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag,
            prestige: userData.prestige
        };
        g_guild.setGuild(guildData.id, guildData);
        async.parallel([
            function(cb1){
                userDao.update(client,updateData,{id:userId},cb1);
            },
            function(cb1){
                copyProgressDao.update(client,updateCopyProgress,{userId:userId,copyType:type},cb1)
            },
            function(cb1){
                if(Object.keys(bossAward).length>0){
                    exports.sendGuildCopyAward(client,mPersonalData.guildId,c_prop.mailTypeKey.guildBoss,participationData,t_monster[bossId].name,bossAward, cb1);
                }else{cb1();}
            },
            function(cb1){
                if(Object.keys(chapterAward[0]).length>0){
                    exports.sendGuildCopyAward(client,mPersonalData.guildId,c_prop.mailTypeKey.guildChapter,chapterAward[2],chapterAward[1],chapterAward[0], cb1);
                }else{cb1();}
            }
        ],function(err,data){
            if(err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            cb(null,[updateData,updateCopyProgress,bagItems,equipBagItems,guildData,getDiamond,isWin,guildCopyArr[0],item,""]);
        });
    });

};

//行会副本领取奖励
exports.guildCopyAward = function(client,userId,type,typeId,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            exports.getInfo(client,userId,type,cb1);
        },
        function (cb1) {
            guildPersonalDao.select(client, {userId: userId}, cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], copyProgressData = data[1], mPersonalData = data[2];

        var guildData = g_guild.getGuild(mPersonalData.guildId);
        if (!guildData) return cb("请先加入行会！");
        var guildCopyData = guildData.guildCopyData;
        var award = [];
        var prizeData = {};   //领取数据
        var clearTime = "";
        var joinTime = mPersonalData.joinTime;
        var refreshTime = copyProgressData.refreshTime;     //最后一次通关子副本时间
        if(!refreshTime|| !refreshTime.equalsDay(new Date())) {
            copyProgressData.refreshTime = new Date();
            copyProgressData.isPickAward = [];
            copyProgressData.isPickChests = [];
        }
        if(type == c_prop.guildCopyKey.boss){
            var guildCopyBoss = t_guildCopyBoss[typeId];
            if(!guildCopyBoss) return cb("数据异常！");
            if(!guildCopyData[typeId] || guildCopyData[typeId][0] < 10000) return cb("该boss进度还未完成！");
            clearTime = guildCopyData[typeId][1].toString();
            prizeData = copyProgressData.isPickAward[0]||{};
            award = guildCopyBoss.lastShotAward;
            if(joinTime && joinTime > new Date(clearTime)) return cb("不满足领取条件！");
            if(prizeData[typeId] && prizeData[typeId] == 1) return cb("已领取过改奖励！");
            if(!copyProgressData.isPickAward[0]) copyProgressData.isPickAward[0] = {};
            copyProgressData.isPickAward[0][typeId] == 1;
        }else if(type == c_prop.guildCopyKey.chapter){
            var guildCopy = t_guildCopy[typeId];
            if(!guildCopy) return cb("数据异常！");
                var start = guildCopy.section[0];
                var end = guildCopy.section[1];
                clearTime = guildCopyData[start][1].toString();
                for(var i = start;i<=end;i++){
                    if(guildCopyData[i][1] > new Date(clearTime)) clearTime = guildCopyData[i][1].toString();
                    if(!guildCopyData[i] || guildCopyData[i][0] < 10000)  return cb("还有boss进度未完成！");
                }
            prizeData = copyProgressData.isPickChests[0]||{};
            award = guildCopy.award;
            if(joinTime && joinTime > new Date(clearTime)) return cb("不满足领取条件！");
            if(prizeData[typeId] && prizeData[typeId] == 1) return cb("已领取过改奖励！");
            if(!copyProgressData.isPickChests[0]) copyProgressData.isPickChests[0] = {};
            copyProgressData.isPickChests[0][typeId] == 1;
        }else{
            return cb("数据异常！");
        }
        var isUpGp = false;
        if(!joinTime){
            isUpGp = true;
            mPersonalData.joinTime = new Date();
        }

        //领奖
        var items = {};
        var bagItems = {};
        var equipBagItems = {};
        for(var i = 0;i < award.length;i++){
            items[award[i][0]] = award[i][1];
        }
        var itemsArr = userUtils.saveItems(userData,items);
        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);

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

        var upCopyProgressData = {
            refreshTime:copyProgressData.refreshTime,
            isPickAward:copyProgressData.isPickAward,
            isPickChests:copyProgressData.isPickChests
        };

        async.parallel([
            function(cb1){
                copyProgressDao.update(client,upCopyProgressData,{id:copyProgressData.id},cb1);
            },
            function(cb1){
                userDao.update(client,updateData,{id:userId},cb1);
            },
            function(cb1){
                if(isUpGp){
                    guildPersonalDao.update(client,{joinTime:mPersonalData.joinTime},{id:mPersonalData.id},cb1);
                }else{cb1();}
            }
        ],function(err,data){
            if(err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            cb(null,[updateData,upCopyProgressData,bagItems,equipBagItems]);
        });
    });
};

//行会副本重置
exports.guildCopyReset = function(client,userId,cb){
    checkRequire();
    guildPersonalDao.select(client, {userId: userId}, function (err, mPersonalData) {
        if (err) return cb(err);
        if (!mPersonalData.guildId) return cb(getMsg(c_msgCode.outGuild));
        var guildData = g_guild.getGuild(mPersonalData.guildId);
        if (!guildData) return cb(getMsg(c_msgCode.outGuild));
        if (c_guildFuncCfg[mPersonalData.position].resetCopy == 0) return cb("没有权限");

        var resetCount = guildData.resetCount;
        var resetTime = guildData.resetTime;
        var countLimit = c_game.guildCopyCfg[1];
        if(resetTime && new Date() < new Date(resetTime).clone().addDays(countLimit)) return cb(getMsg(c_msgCode.noReset));

        //重置
        guildData.guildCopyData = {};
        guildData.resetTime = new Date();
        guildData.resetCount = resetCount + 1;
        var updateGuildData = {
            guildCopyData: guildData.guildCopyData,
            resetTime: guildData.resetTime,
            resetCount: guildData.resetCount
        };
        g_guild.setGuild(guildData.id, guildData);
        cb(null, updateGuildData);
    });
};

/**
 * 公会副本清除CD
 * @param client
 * @param userId
 * @param bossId
 * @param cb
 */
exports.clearGuildCopy = function(client,userId,bossId,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1)
        },
        function(cb1){
            copyProgressDao.select(client,{userId:userId,copyType:c_prop.copyTypeKey.guild},cb1)
        }
    ],function(err,data){
        if (err) return cb(err);
        var userData = data[0],copyProgressData = data[1];
        var nowTime = new Date();
        var refreshTime = copyProgressData.refreshTime;
        var type = c_prop.copyTypeKey.guild;
        var resetCounts = copyUtils.getBuyCopyCount(copyProgressData,type);     //今日购买次数

        //cd
        var pCopyId = copyProgressData.pCopyId||0;     //cd秒数
        if(refreshTime) {
            var second = (nowTime.getTime()-refreshTime.getTime())/1000;
            pCopyId -= second;
        }
        if(pCopyId <= 0) return cb("没有需要清除的CD");
        var costDiamond = formula.calGuildCopyCd(pCopyId);        // 购买次数所需钻石
        //判断被扣除钻石
        if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));//钻石不足
        //添加次数
        copyProgressData.resetTime = nowTime;
        copyProgressData.resetCounts[type] = resetCounts;
        //扣除cd
        copyProgressData.pCopyId = 0;
        copyProgressData.refreshTime = nowTime;
        //扣除钻石
        userUtils.reduceDiamond(userData,costDiamond);

        //需要更新的数据
        var updateUserData = {
            diamond:userData.diamond,
            giveDiamond : userData.giveDiamond,
            buyDiamond : userData.buyDiamond
        };
        var updateCopyData = {
            resetTime:copyProgressData.resetTime,
            resetCounts:copyProgressData.resetCounts,
            pCopyId:copyProgressData.pCopyId,
            refreshTime:copyProgressData.refreshTime
        };
        async.parallel([
            function(cb2){
                userDao.update(client,updateUserData,{id:userId},cb2)
            },
            function(cb2){
                copyProgressDao.update(client,updateCopyData,{id:copyProgressData.id},cb2)
            }
        ],function(err,data2) {
            if (err) return cb(err);
            cb(null, [userData,copyProgressData,costDiamond])
        });
    });
};

/**
 * 发送奖励
 * @param client
 * @param cb
 */
exports.sendGuildCopyAward = function (client,guildId,mailType,participationData,name,items, cb) {
    checkRequire();
    if(guildId == 0 || Object.keys(items).length<=0) return cb();
    guildPersonalDao.listCols(client, " userId ", " guildId = ? AND userId IN (?) ",[guildId,participationData], function (err, gpList) {
        if (err) return cb(err);
        var max = 1000;//分1000一批插入
        var groupList = [];
        var tempCount = 0;
        var tempList = [];
        for (var i = 0; i < gpList.length; i++) {
            var locData = gpList[i];
            var mailEntity = mailBiz.createEntityByType(locData.userId, mailType, [name], items);
            mailEntity.addTime = new Date();
            tempList.push(mailEntity);
            if (tempCount >= max) {
                tempCount = 0;
                groupList.push(tempList.concat([]));
                tempList.length = 0;
            }
            tempCount++;
        }
        if (tempList.length > 0) {
            groupList.push(tempList.concat([]));
        }

        async.mapLimit(groupList, 1, function (group, cb1) {
            mailBiz.addMailByList(client, group, cb1);
        }, cb);
    });
};

//爬塔领取奖励
exports.paTaAward = function(client,userId,copyId,cb){
    checkRequire();
    var section = c_game.towerCopy[0].split(",");       //爬塔副本id区间
    if(copyId<section[0] || copyId>section[1]) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1)
        },
        function(cb1){
            copyProgressDao.select(client,{userId:userId,copyType:c_prop.copyTypeKey.paTa},cb1)
        }
    ],function(err,data){
        if (err) return cb(err);
        var userData = data[0],copyProgressData = data[1];

        if(!copyProgressData.copyObj[copyId]) copyProgressData.copyObj[copyId] = [];
        var awardArr = copyProgressData.copyObj[copyId];        //{copyId:[最低血量,是否领取],copyId:[最低血量,是否领取],.....}
        if(!awardArr[0] || awardArr[0] != -1) return cb("还未通关该boss");
        if(awardArr[1] && awardArr[1] == 1) return cb("已领取过该奖励！");
        var items = {};
        var award = t_paTaTreasury[copyId].award;
        for(var i = 0; i < award.length; i++){
            items[award[i][0]] = award[i][1];
        }

        //获得物品
        var getDiamond = 0;
        var bagItems = {};
        var equipBagItems = {};
        if(items[c_prop.spItemIdKey.diamond]) getDiamond = items[c_prop.spItemIdKey.diamond];
        var itemsArr = userUtils.saveItems(userData, items);
        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
        //改变状态
        copyProgressData.copyObj[copyId][1] = 1;

        //需要更新的数据
        var updateData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag
        };
        var updateCopyData = {
            copyObj:copyProgressData.copyObj
        };
        async.parallel([
            function(cb2){
                userDao.update(client,updateData,{id:userId},cb2)
            },
            function(cb2){
                copyProgressDao.update(client,updateCopyData,{id:copyProgressData.id},cb2)
            }
        ],function(err,data2) {
            if (err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            cb(null, [userData,copyProgressData,bagItems,equipBagItems,getDiamond])
        });
    });
};

//镇妖塔宝库抽奖
exports.paTaTreasury = function(client,userId,cb){
    checkRequire();
    var type = c_prop.copyTypeKey.paTa;
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1)
        },
        function(cb1){
            copyProgressDao.select(client,{userId:userId,copyType:type},cb1)
        }
    ],function(err,data){
        if (err) return cb(err);
        var userData = data[0],copyProgressData = data[1];

        var costDiamond = 0;
        var paTaOpen = c_open.paTa.lvlRequired;
        if(userData.lvl < paTaOpen) return cb(getMsg(c_msgCode.towerNotOpen),paTaOpen);
        var highPaTa = userData.highPaTa||0;       //爬塔最高层数
        if(highPaTa<1) return cb(getMsg(c_msgCode.noLevelDown));
        var reNum = copyUtils.getReTime(userData,copyProgressData,type,type);       //剩余次数
        if(reNum<=0){
            var lotteryCounts = copyUtils.getBuyCopyCount(copyProgressData,type);     //今日购买次数
            costDiamond = formula.calPaTaAward(lotteryCounts,userData.highPaTa);
            //判断被扣除钻石
            if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));//钻石不足
            //扣除钻石
            userUtils.reduceDiamond(userData,costDiamond);
            copyProgressData.resetTime = new Date();
            copyProgressData.resetCounts[type] = lotteryCounts;
        }
        //计算抽奖剩余次数
        copyProgressData.timesPerDay[type] = parseInt(reNum)-1;

        //计算抽奖物品
        var items = {};

        //必掉金币
        var willFall = {};
        willFall[c_prop.spItemIdKey.gold] = parseInt(c_game.lotteryWillFall[0]);
        items = propUtils.mergerProp(items,willFall);

        var section = c_game.towerCopy[0].split(",");       //爬塔副本id区间
        var highCopyId = highPaTa -1 + parseInt(section[0]);
        var treasury = t_paTaTreasury[highCopyId].treasury;     //宝库内容
        var weightArr = [];
        var create = [].concat(treasury);
        for (var i = 0; i < create.length; i++) {
            weightArr.push(create[i][2]);
        }
        var weightIndex = commonUtils.getWeightRandom(weightArr);
        items[create[weightIndex][0]] = create[weightIndex][1];
        //额外获得
        var exData = t_paTaTreasury[highCopyId].exData||[];     //额外掉落
        for(var i = 0; i < exData.length; i++){
            var randomPro = exData[i][2];
            var randomNum = _getRandomNumber(1,10000);
            if(randomNum <= randomPro) items[exData[i][0]] = exData[i][1];
        }

        var bagItems = {};
        var equipBagItems = {};
        var itemsArr = userUtils.saveItems(userData, items);
        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);

        //需要更新的数据
        var updateData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag
        };
        var updateCopyData = {
            refreshTime:copyProgressData.refreshTime,
            resetTime:copyProgressData.resetTime,
            resetCounts:copyProgressData.resetCounts,
            timesPerDay:copyProgressData.timesPerDay
        };
        async.parallel([
            function(cb2){
                userDao.update(client,updateData,{id:userId},cb2)
            },
            function(cb2){
                copyProgressDao.update(client,updateCopyData,{id:copyProgressData.id},cb2)
            }
        ],function(err,data2) {
            if (err) return cb(err);
            var troHorLamp = t_paTaTreasury[highCopyId].troHorLamp;
            if(troHorLamp) {
                for(var i = 0;i<troHorLamp.length;i++){
                    var zmdItemId = troHorLamp[i][0];
                    var zmdItemCount = troHorLamp[i][1];
                    if(bagItems[zmdItemId] && bagItems[zmdItemId] == zmdItemCount){
                        var zmdItemName = "";
                        if(t_item[zmdItemId]) zmdItemName = t_item[zmdItemId].name;
                        chatBiz.addSysData(79,[userData.nickName,zmdItemName,zmdItemCount]);
                        chatBiz.addSysData(80,[userData.nickName,zmdItemName,zmdItemCount]);
                    }
                }
            }
            delete updateData.bag;
            delete updateData.equipBag;
            cb(null, [userData,copyProgressData,bagItems,equipBagItems,costDiamond])
        });
    });
};

//副本扫荡
exports.copyWipe = function(client,userId,copyId,cb){
    checkRequire();
    var t_copyData = t_copy[copyId];
    var type = t_copyData.type;
    if(type != c_prop.copyTypeKey.equip && type != c_prop.copyTypeKey.state) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1)
        },
        function(cb1){
            exports.getInfo(client,userId,type,cb1)
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0], copyProgressData = data[1];

        //判断星数
        var copyStar = copyProgressData.copyStar;
        if(!copyStar[copyId] || copyStar[copyId] < 3) return cb(getMsg(c_msgCode.notPerfect));

        //装备副本,消耗挑战次数
        var vipExt = 0;
        var needItemId = 0;
        var cosDiamond = 0;
        var delBagItems = {};
        switch (type){
            case c_prop.copyTypeKey.equip:
                //装备副本,装备入场券
                needItemId = c_prop.spItemIdKey.equipTessera;
                vipExt = c_vip[userData.vip].equipCount - c_vip[0].equipCount;
                break;
            case c_prop.copyTypeKey.state:
                //境界副本，入场券
                needItemId = c_prop.spItemIdKey.realmTessera;
                vipExt = c_vip[userData.vip].realmCount - c_vip[0].realmCount;
                break;
        }
        var reNum = copyUtils.getReTime(userData,copyProgressData,copyId,type);
        var  residue = reNum+vipExt;        //剩余次数
        if(residue<=0) return cb("次数不足");

        //消耗道具、次数
        if(!needItemId) return cb("数据异常");
        var needItemCount = parseInt(userData.bag[needItemId]);
        var wipeCount = residue;      //扫荡次数
        if(needItemCount > 0){      //优先消耗光道具
            if(needItemCount < residue) wipeCount = needItemCount;
            userData.bag[needItemId] -= wipeCount;
            delBagItems[needItemId] = wipeCount;
            if(userData.bag[needItemId] == 0) delete userData.bag[needItemId];
        }else{      //消耗元宝
            cosDiamond = parseInt(t_item[needItemId].price)*residue;
            if(userData.diamond<cosDiamond) return cb(getMsg(c_msgCode.noDiamond));
            userUtils.reduceDiamond(userData,cosDiamond);
        }
        copyUtils.setTimesPerDay(copyProgressData,copyId,reNum-wipeCount);

        var items = {};
        var userExp = 0;
        var monsterId = t_copyData.bossID;
        var temUserExp = t_monster[monsterId].userExp;
        for(var i = 0;i<wipeCount;i++){
            var temItems = {};
            //物品
            var lootId = t_copyData.bossLoot;
            var temItemsArr = fightUtils.getLootItems(lootId);
            for(var j = 0;j<temItemsArr.length;j++){
                temItems[temItemsArr[j][0]] = temItemsArr[j][1];
            }
            items = propUtils.mergerProp(items,temItems);
            //获取经验
            userExp +=temUserExp;
        }
        var userExpRate =  fightUtils.getBuffExpcRate();
        //多倍经验
        userExp = userExp * userExpRate;

        //计算物品、经验
        var itemsArr = [];
        var bagItems = {};
        var equipBagItems = {};
        itemsArr = userUtils.saveItems(userData, items);
        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
        userUtils.addUserExpc(userData,userExp);

        //更新

        var updateCopyProgress = {
            timesPerDay:copyProgressData.timesPerDay,
            refreshTime:copyProgressData.refreshTime
        };

        var updateData = {
            lvl:userData.lvl,
            expc:userData.expc,
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag,
            prestige: userData.prestige,
            rebirthExp: userData.rebirthExp,
            genuineQi:userData.genuineQi,
            medalData: userData.medalData
        };
        async.parallel([
            function(cb1){
                userDao.update(client, updateData, {id: userId},cb1);
            },
            function(cb1){
                copyProgressDao.update(client,updateCopyProgress,{userId:userId,copyType:type},cb1)
            }
        ],function(err,data){
            if(err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            var addArr = [];
            for(var i=0;i<wipeCount;i++){
                addArr.push(function(cb1){
                    _addAct(client,userId,type,cb1);
                });
            }
            async.series(addArr,function(){
                cb(null,[updateData,updateCopyProgress,bagItems,equipBagItems,delBagItems,wipeCount,cosDiamond,type,items]);
            });
        });
    });
};

/*****************************************************************************************************/

var _fightWithMonster = function(client, userData, copyProgress, copyId, cb){
    var t_copyData = t_copy[copyId];
    var nodeIndex = copyProgress.copyObj[copyId]||0;
    var enemyMembers =  copyUtils.getMonsterMembers(copyId,nodeIndex);
    heroBiz.getSelfFightMembers(client, userData, function(err,data){
        if(err) return cb(err);
        var fightResult = null;
        var nodeType = t_copyData.nodeType[nodeIndex];
        if(nodeType==1){
            fightResult = new ds.FightResult();
            fightResult.winStatus = consts.winStatus.win;
        }else{
            var selfMembers = data[0],heroList = data[1];
            fightResult =  multFightBiz.fight(selfMembers,enemyMembers);
        }
        return cb(null, [fightResult,heroList]);
    });
};

//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};

//获取扫荡掉落物品
var _getWipeItems = function(copyInfo){
    var items = {};
    var lootIds = copyInfo.lootIds;
    for(var i = 0; i < lootIds.length; i++){
        var wipeItems = t_copyLoot[lootIds[i]].wipeItems;
        for(var i1 = 0; i1 < wipeItems.length; i1++){
            if(wipeItems[i1][0] != 0){
                var itemId = wipeItems[i1][0];      //物品id
                var probability = wipeItems[i1][1];     //概率
                var upper = wipeItems[i1][2];        //物品数量下限  1
                var lower = wipeItems[i1][3];       //物品数量上限   2
                if(probability == 10000){
                    items[itemId] = _getRandomNumber(upper,lower);
                }else{
                    if(probability >= _getRandomNumber(0,10000)){
                        items[itemId] = _getRandomNumber(upper,lower);
                    }
                }
            }
        }
    }
    return items;
};

//获取伤害奖励
var _getDamageAward = function(bossId,damage){
    var award = [];
    var guildCopyBoss = t_guildCopyBoss[bossId];
    if(damage>= guildCopyBoss.needDamage1){
        if(damage>= guildCopyBoss.needDamage10){
            return guildCopyBoss.award10;
        }
        for(var i = 1;i<=10;i++){
            var needDamageStr = "needDamage" + i.toString();
            if(damage < guildCopyBoss[needDamageStr]){
                var awardStr = "award" + (i-1).toString();
                award = guildCopyBoss[awardStr];
                break;
            }
        }
    }
    return award;
};

//获取BOSS奖励
var _getBossAward = function(id){
    var items = {};
    var award = t_guildCopyBoss[id].lastShotAward;
    for(var i = 0;i<award.length;i++){
        items[award[i][0]] = award[i][1];
    }
    return items;
};

//获取章节奖励
var _getChapterAward = function(bossId,needProgress,guildCopyData){
    var items = {};
    var participationData = [];
    for(var key in t_guildCopy){
        var guildCopy = t_guildCopy[key];
        var start = guildCopy.section[0];
        var end = guildCopy.section[1];
        if(bossId>=start &&bossId<=end){
            for(var i = start;i<= end;i++){
                if(i != bossId && !guildCopyData[i]) return [items];
                if(i != bossId && guildCopyData[i][0] < needProgress) return [items];
                var properArr = guildCopyData[i][1];
                for(var j = 0;j< properArr.length;j++){
                    var userId = properArr[j];
                    if(participationData.indexOf(userId)==-1) participationData.push(userId);
                }
            }
            var award = guildCopy.award;
            for(var i = 0;i<award.length;i++){
                items[award[i][0]] = award[i][1];
            }
            break;
        }
    }
    return [items,guildCopy.name,participationData];
};

//计算进度
var _getGuildProgress = function(hurt,bossId,index){
    var returnHurt = 0;
    var needHurt = t_guildCopyBoss[bossId].needDamage1;
    if(hurt<needHurt) return returnHurt;
    var start = "guildStartHurt" + index.toString();
    var end = "guildEndHurt" + index.toString();
    var guildProgress = "guildProgress" + index.toString();
    for(var key in c_bossHurtRate){
        var locData = c_bossHurtRate[key];
        var locStartHurt = locData[start];
        var locEndHurt = locData[end];
        var locRate = locData[guildProgress];
        if(hurt>=locStartHurt&&hurt<=locEndHurt){
            returnHurt += (hurt-locStartHurt)*locRate;
            break;
        }else{
            returnHurt += (locEndHurt-locStartHurt)*locRate;
        }
    }
    return parseInt(returnHurt);
};

//获取本周周日日期
var _getDateStr = function(){
    var today=new Date();
    var weekday=today.getDay();
    var weekday=new Date(1000*60*60*24*(7-weekday) + today.getTime());
    var y = weekday.getFullYear();
    var m = weekday.getMonth()+1;//获取当前月份的日期
    m=parseInt(m,10);
    if(m<10){
        m="0"+m;
    }
    var d = weekday.getDate();
    d=parseInt(d,10);
    if(d<10){
        d="0"+d;
    }
    return new Date(y+"-"+m+"-"+d+" 23:59:59");
};
