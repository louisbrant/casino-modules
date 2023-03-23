/**
 * Created by Administrator on 2015/9/16.
 */
var exports = module.exports;
var c_prop = require("uw-data").c_prop;
var t_copy = require("uw-data").t_copy;
var t_monster = require("uw-data").t_monster;
var c_game = require("uw-data").c_game;
var g_data = require("uw-global").g_data;
var t_talismanSkill = require("uw-data").t_talismanSkill;

var commonUtils = require("uw-utils").commonUtils;
var fightUtils = require("./fightUtils.js");
var async = require("async");
var g_copyLoot = require("uw-global").g_copyLoot;


var userDao = null;
var userBiz = null;
var userUtils = null;
var copyProgressDao = null;
var propUtils = null;

var checkRequire = function(){
    userDao = require("uw-user").userDao;
    userBiz = require("uw-user").userBiz;
    userUtils = require("uw-user").userUtils;
    copyProgressDao = require("uw-copy").copyProgressDao;
    propUtils = require("uw-utils").propUtils;
};


/**
 * 获取和预掉落数据
 * @param userId
 * @param copyId
 * @param isBoss
 * @param userLvl
 * @param ignoreItems
 * @returns {{}}  {"唯一id":[[物品id,物品数量],..]}
 */
exports.getAndInitNextLoot = function(userId,copyId,isBoss,userLvl,ignoreItems){
    var t_copyData = t_copy[copyId];
    var lootDic = {};
    var lootId = 0;
    var lootCount = 0;
    switch (t_copyData.type){
        case c_prop.copyTypeKey.normal://普通副本
            if(isBoss){
                lootId = t_copyData.bossLoot;
                lootCount = 1;
            }else{
                lootId = t_copyData.loot;
                //lootCount = t_copyData.monsterCount*t_copyData.monsterTotal;
                lootCount = t_copyData.monsterTotal;
            }
            break;
        default ://其他副本只预一个
            lootId = t_copyData.bossLoot;
            lootCount = 1;
            break;
    }
    //randMonsters
    var monsterId = t_copyData.randMonsters[0];

    var monsterLvl = 0;
    if(monsterId){
        var monsterData = t_monster[monsterId];
        if(monsterData){
            monsterLvl = monsterData.level;
        }
    }

    for(var i = 0 ;i<lootCount;i++){
        var itemsArr = null;
        if (!isBoss && monsterLvl && userLvl - monsterLvl > c_game.lootLimit[0]) {
            ignoreItems = true;
        } else {
            itemsArr = fightUtils.getLootItems(lootId);
        }
        if(ignoreItems){
            itemsArr = [];
        }
        var uid = g_copyLoot.newOneItems(userId, copyId, itemsArr,isBoss,ignoreItems);
        lootDic[uid] = itemsArr;
    }

    return lootDic;
};

/**
 * 预加载掉落
 * @param client
 * @param userId
 * @param copyId
 * @param lvl
 * @param cb
 * @returns {*}
 */
exports.preLoot = function(client,userId,copyId,lvl,cb){
    checkRequire();
    var preTimeData = g_data.getPreLootTime(userId);
    var intervalTime = c_game.battleSet[1];
    var isTime5Error = false;
    var isTime1Error = false;
    if(preTimeData){
        var errorNum = preTimeData[0];
        var preTime = preTimeData[1];
        var diffMilliseconds = preTime.getMillisecondsBetween(new Date());

        if(diffMilliseconds<intervalTime*1000-500){
            errorNum++;
            isTime1Error = true;
        }
        //连续5次异常
        if(errorNum>5){
            errorNum = 0;
            isTime5Error = true;
        }
        if (isTime1Error) {
            g_data.setPreLootTime(userId, [errorNum, preTime]);
        } else {
            g_data.setPreLootTime(userId, [errorNum, new Date()]);
        }
    }else{
        g_data.setPreLootTime(userId,[0,new Date()]);
    }
/*
    var onlineLootData = g_data.getOnlineLootData(userId);
    onlineLootData[0] = new Date();

    g_data.setOnlineLootData(userId,onlineLootData);
*/

    var ignoreItems = false;
    if(isTime1Error) {
        //console.error("时间异常，没有掉落1111111111111111111");
        ignoreItems = true;
    }else{
        //console.error("时间正常，有掉落122222222222222222222");
    }

    var lootData = exports.getAndInitNextLoot(userId,copyId,false,lvl,ignoreItems);

    if(isTime5Error){
        userBiz.setTimeError(client, userId, function(){
            cb(null,lootData);
        });
    }else{
        cb(null,lootData);
    }

};

/**
 * 杀死怪物接口，这里会存储金币
 * @param client
 * @param userId
 * @param uidDataArr  [[copyId,uid,isBoss],.....]
 * @param isBoss
 * @param cb
 */
exports.pickLoot = function(client,userId,uidDataArr,isBoss,cb){
    checkRequire();
    //todo 验证数据

    userDao.select(client,{id:userId},function(err,userData){
        if(err) return cb(err);
        var bagItems = {};
        var equipBagItems = {};
        var getDiamond = 0;
        var oldDiamond = userData.diamond;

        if(uidDataArr[0] && uidDataArr[0][0] && t_copy[uidDataArr[0][0]].type == c_prop.copyTypeKey.paTa){
            //记录爬塔最高层数
            var section = c_game.towerCopy[0].split(",");       //爬塔副本id区间
            var highPaTa = uidDataArr[0][0]-parseInt(section[0])+1;
            if(highPaTa>userData.highPaTa) userData.highPaTa = highPaTa;
        }

        var userExpAll = 0;
        var goldsAll = 0;
        for(var i = 0;i<uidDataArr.length;i++){
            var locData = uidDataArr[i];
            var copyId = locData[0],uid = locData[1],isBoss = locData[2];
            if(!g_copyLoot.hasUid(userId, copyId, uid)){
                continue;
            }

            var t_copyData = t_copy[copyId];

            var itemsArrData = g_copyLoot.getItemsByUid(userId, copyId, uid)||[[],false];
            var itemsArr = itemsArrData[0]||[];
            var itemsIsBoss = itemsArrData[1]||false;
            var ignoreItems = itemsArrData[2]||false;
            if(ignoreItems)  continue;

            if(itemsIsBoss!=isBoss) continue;
            var saveItemsArr = [];

            for(var i =0;i<itemsArr.length;i++){
                var locItemData = itemsArr[i];
                if(!locItemData) continue;
                var locItem = {};
                locItem[locItemData[0]] = locItemData[1];
                saveItemsArr = userUtils.saveItems(userData,locItem);
                if(Object.keys(saveItemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,saveItemsArr[0]);
                if(Object.keys(saveItemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,saveItemsArr[1]);

                goldsAll += (locItem[c_prop.spItemIdKey.gold]||0);
            }
            //获取经验
            var monsterId = 1;
            if(isBoss){
                monsterId = t_copyData.bossID;
            }else{
                monsterId = t_copyData.randMonsters[0];
            }

            var userExp = t_monster[monsterId].userExp;
            var userExpRate =  fightUtils.getBuffExpcRate();

            //多倍经验
            userExp = userExp * userExpRate;
            //技能影响
            var skillPro = 0;
            var exData = userData.exData||{};
            if(exData[c_prop.userExDataKey.talismanSkill] && exData[c_prop.userExDataKey.talismanSkill][c_prop.talismanSkillTypeKey.exp]){
                var skillArr =exData[c_prop.userExDataKey.talismanSkill][c_prop.talismanSkillTypeKey.exp];
                for(var i = 0 ;i<skillArr.length;i++){
                    var skillId = skillArr[i];
                    if(t_talismanSkill[skillId]){
                        skillPro += parseInt(t_talismanSkill[skillId].effect[0][0]);
                    }
                }
            }
            userExp = userExp * (skillPro/10000+1);
            userUtils.addUserExpc(userData,userExp);
            userExpAll+=userExp;
            //移除掉落
            g_copyLoot.delByUid(userId, copyId, uid);
        }


        if(!isBoss){
            //_calLootCount(userId,copyId,userExpAll,goldsAll,userData)
        }
        // gold,diamond,buyDiamond,giveDiamond,strength,strengthReTime,bag
        var updateUser = {
            gold:userData.gold,
            bag:userData.bag,
            equipBag:userData.equipBag,
            lvl:userData.lvl,
            expc:userData.expc,
            rebirthExp: userData.rebirthExp,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            onlineLootData:userData.onlineLootData,
            infuseExpc:userData.infuseExpc,
            highPaTa:userData.highPaTa
        };
        getDiamond = userData.diamond - oldDiamond;
        userDao.update(client,updateUser,{id:userId},function(){
            if(err) return cb(err);
            delete updateUser.bag;
            delete updateUser.equipBag;
            cb(null,[updateUser,null,bagItems,equipBagItems,getDiamond]);
        });
    });
};

/**
 * 复活
 * @param client
 * @param userId
 * @param cb
 */
exports.revive = function(client,userId,cb){
    checkRequire();
    //消耗
    userDao.select(client,{id:userId},function(err,userData){
        if(err) return cb(err);
        userData.gold-=100;
        var updateUser = {
            gold: userData.gold
        };

        userDao.update(client,updateUser,{id:userId},function(err,data){
            if(err) return cb(err);
            cb(null,updateUser);
        });
    });
};


var _calLootCount = function(userId,copyId,expc,getGold,userData){

    //小时，金币
    //小时，波怪
    var onlineLootData = g_data.getOnlineLootData(userId);

    //[上一次预掉落时间，累计次数,累计时间,累计金币，累计经验,副本id]
    var preTime = onlineLootData[0],addNum = onlineLootData[1]|0,addSeconds = onlineLootData[2],addGolds = onlineLootData[3]||0,addExpc = onlineLootData[4]||0,curCopyId = onlineLootData[5]||0,numMillSeconds = onlineLootData[6]||0;
    var oldCopyId = copyId;
    var nowDate = new Date();
    var difSeconds = preTime.getSecondsBetween(nowDate);
    if(difSeconds<5) difSeconds = 5;
    if(difSeconds>20) difSeconds = 20;
    var difMilliseconds = preTime.getMillisecondsBetween(nowDate);
    if(copyId!=oldCopyId){
        addNum = 1;
        addSeconds = difSeconds;
        addGolds = getGold;
        addExpc = expc;
        curCopyId = copyId;
        numMillSeconds = difMilliseconds;
    }else{
        addNum += 1;
        addSeconds += difSeconds;
        addGolds += getGold;
        addExpc += expc;
        numMillSeconds+=difMilliseconds;

    }
    //在线掉落数据[每秒经验,每秒金币,每波怪多少秒,是否统计];
    var userOnlineLootData = userData.onlineLootData;

    //超过10分钟才开始保存数据
    if (numMillSeconds > 10*3600*1000) {
        //这里保存一次服务器
        var perExpc = parseInt(addExpc/addSeconds);//每秒经验
        var perGold = parseInt(addGolds/addSeconds);//每秒金币

        var perMonsterSec = parseInt(numMillSeconds/addNum)/1000;//每波怪多少秒
        userData.onlineLootData = [perExpc,perGold,perMonsterSec,2];//
        //addNum = 0;
        //numMillSeconds = 0;
    }


    onlineLootData[1] = addNum;
    onlineLootData[2] = addSeconds;
    onlineLootData[3] = addGolds;
    onlineLootData[4] = addExpc;
    onlineLootData[5] = curCopyId;
    onlineLootData[6] = numMillSeconds;
    g_data.setOnlineLootData(userId,onlineLootData);
};