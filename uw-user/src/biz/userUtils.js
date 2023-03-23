/**
 * Created by Administrator on 2015/5/31.
 */
require("date-utils");
var consts = require("uw-data").consts;
var c_game = require("uw-data").c_game;

var c_prop = require("uw-data").c_prop;
var c_lvl = require("uw-data").c_lvl;
var c_vip = require("uw-data").c_vip;
var t_itemEquip = require("uw-data").t_itemEquip;
var t_rebirth = require("uw-data").t_rebirth;
var g_data = require("uw-global").g_data;
var t_talismanSkill = require("uw-data").t_talismanSkill;

var t_copy = require("uw-data").t_copy;
var t_item = require("uw-data").t_item;
var c_genuineQi = require("uw-data").c_genuineQi;
var c_demonLotus = require("uw-data").c_demonLotus;
var formula = require("uw-formula");
var commonUtils = require("uw-utils").commonUtils;
var propUtils = require("uw-utils").propUtils;
var equipBiz = require("uw-equip").equipBiz;
var logger = require('uw-log').getLogger("uw-logger", __filename);
var uwClient = require("uw-db").uwClient;
var mainClient = require("uw-db").mainClient;
var project = require("uw-config").project;
var g_lootConfig = require("uw-global").g_lootConfig;


var chatBiz;
var taskBiz;
var itemBiz;
var mailBiz;
var sdkBiz;
var accountDao;
var bonusBiz;
var userDao;
var checkRequire = function(){
    chatBiz = chatBiz || require("uw-chat").chatBiz;
    taskBiz = taskBiz || require("uw-task").taskBiz;
    itemBiz = itemBiz || require("uw-item").itemBiz;
    mailBiz = mailBiz || require("uw-mail").mailBiz;
    sdkBiz = sdkBiz || require("uw-sdk").sdkBiz;
    accountDao = accountDao || require("uw-account").accountDao;
    bonusBiz = bonusBiz || require("uw-bonus-share").bonusBiz;
    userDao = userDao || require("uw-user").userDao;
};

/**
 * 获取每日次数
 */
exports.getTodayCount = function (userData,type) {
    var count = userData.counts[type]||0;
    var refreshTime = userData.countsRefreshTime[type];

    if(refreshTime){
        refreshTime = new Date(refreshTime);
        if(!refreshTime.equalsDay(new Date())){
            refreshTime = new Date();
            count = 0;
        }
    }
    userData.counts[type] = count;
    userData.countsRefreshTime[type] = refreshTime;

    return count;
};

/**
 * 获得每日时间
 */
exports.getTodayRefreshTime = function (userData,type) {
    var refreshTime = userData.countsRefreshTime[type];

    if(refreshTime){
        refreshTime = new Date(refreshTime);
        if(!refreshTime.equalsDay(new Date())){
            refreshTime = new Date();
        }
    }

    return refreshTime;
};

/**
 * 添加每日次数
 */
exports.addTodayCount = function (userData, type, num) {
    var count = exports.getTodayCount(userData, type);
    userData.counts[type] = count+num;
    userData.countsRefreshTime[type] = new Date();
};

/**
 * 修改每日次数
 */
exports.changeTodayCount = function (userData, type,num) {
    userData.counts[type] = num;
    userData.countsRefreshTime[type] = new Date();
};


/**
 * 添加金币
 * @param userData
 * @param gold
 */
exports.addGold = function(userData,gold){
    userData.gold = Math.ceil(userData.gold);
    gold = Math.ceil(gold);
    userData.gold+=gold;
    //不能小于0
    userData.gold = userData.gold < 0 ? 0 : userData.gold;
    userData.gold = userData.gold > 4294967295 ? 4294967295 : userData.gold;
};

/**
 * 删除物品
 * @param userData
 * @param items
 */
exports.delItems = function(userData,items){
    for(var key in items){
        var locItemId = key;
        var locItemNum = parseInt(items[key]) ||0;
        _delEquipBagByTempId(userData,locItemId,locItemNum);
        _delBagByTempId(userData,locItemId,locItemNum);
    }
};

/**
 * 保存items数据
 * 需要更新的字段,gold,diamond,buyDiamond,giveDiamond,bag,equipBag,prestige
 * @param userData
 * @param items
 */
exports.saveItems = function(userData,items){
    if(!items) return;
    var bagItems = {};
    var equipBagItems = {};
    var expSum = 0;
    var rebirthExpSum= 0;
    var genuineQi = 0;
    for(var key in items){
        var locId = parseInt(key);
        var locNum = parseInt(items[key]);
        var t_itemData = t_item[locId];
        if(!t_itemData) continue;
        if(!g_lootConfig.isLoot(locId)) continue;

        var count = bagItems[locId]||0;
        switch (t_itemData.type){
            case c_prop.itemTypeKey.gold://金币
                exports.addGold(userData,locNum);
                break;
            case c_prop.itemTypeKey.diamond://钻石
                exports.addDiamond(userData,locNum);
                break;
            case c_prop.itemTypeKey.prestige://声望
                userData.prestige+=locNum;
                break;
            case c_prop.itemTypeKey.exp://经验
                exports.addUserExpc(userData, locNum);
                expSum += locNum;
                break;
            case c_prop.itemTypeKey.genuineQi://真气
                exports.addGenuineQi(userData, locNum);
                genuineQi += locNum;
                break;
            case c_prop.itemTypeKey.rebirthExp://转生经验
                userData.rebirthExp += locNum;
                rebirthExpSum += locNum;
                break;
            case c_prop.itemTypeKey.equip://装备
                var equipBagResGrid = exports.getEquipBagResGrid(userData);     //剩余格子数
                    if(locNum <= equipBagResGrid){
                        var addEquip = exports.addEquip(userData.equipBag,locId,locNum);
                        equipBagItems = propUtils.mergerProp(equipBagItems,addEquip);
                }else{      //只加没有超出的部分
                        var addEquip = exports.addEquip(userData.equipBag,locId,equipBagResGrid);
                        equipBagItems = propUtils.mergerProp(equipBagItems,addEquip);
                }
                break;
            default :
                exports.addBag(userData.bag, locId,locNum);     //背包
                bagItems[locId] = count + locNum;
                break;
        }
    }
    return [bagItems,equipBagItems,expSum,rebirthExpSum,genuineQi];
};

/**
 * 添加装备
 * @param equipBag
 * @param templateId        //装备模板id
 * @param num
 */
exports.addEquip = function(equipBag,templateId,num){
    var equipBagItems = {};
    if(typeof templateId  =="object"){
        for(var key in templateId){
            equipBagItems = _addEquip(equipBag,key,templateId[key]);
        }
    }else{
        equipBagItems = _addEquip(equipBag,templateId,num);
    }
    return equipBagItems;
}
var _addEquip = function(equipBag,templateId,num){
    var equipBagItems = {};
    for(var i = 0; i < num; i++){
        var equipMaxId = 1;
        if(equipBag != null && JSON.stringify(equipBag) != "{}") equipMaxId = parseInt(commonUtils.getLastKey(equipBag)) + 1;
        var randomArr = [];
        if(t_itemEquip[templateId].isUp==1||t_itemEquip[templateId].isRare==1){
            randomArr = t_itemEquip[templateId].fixProp;
        }else{
            randomArr = equipBiz.getRandomAbility(templateId);      //装备随到的属性值
        }
        var gradeBase = equipBiz.getEquipGrade(templateId,randomArr);       //装备评分
        equipBag[equipMaxId] = [templateId,randomArr,gradeBase,0];
        equipBagItems[equipMaxId] = [templateId,randomArr,gradeBase,0];
    }
    return equipBagItems;
};

//获取装备背包剩余格子数
exports.getEquipBagResGrid = function(userData){
    var count = userData.equipBagBuyCount;
    var starCount = c_game.equipBagCfg[0];
    var addCount = c_game.equipBagCfg[1];
    var vipCount = c_vip[userData.vip].addEquipBag;
    var equipBagGrid = starCount + count*addCount + vipCount;       //背包总格子数
    var equipBag = userData.equipBag||{};
    var sum = 0;
    for(var key in equipBag){       //装备背包 {"1":[物品id,[随到的属性值],评价,是否穿戴],...}  "1":指定id,累加上去的
        if(equipBag[key][3] == 1) sum += 1;
    }
    return equipBagGrid - Object.keys(equipBag).length + sum;
}

/**
 * 添加背包
 * @param bag
 * @param itemId
 * @param num
 */
exports.addBag = function(bag,itemId,num){
    if(typeof itemId  =="object"){
        for(var key in itemId){
            _addBag(bag,key,itemId[key]);
        }
    }else{
        _addBag(bag,itemId,num);
    }
};
var _addBag = function(bag,itemId,num){
    var ownItemCount = bag[itemId] || 0;
    ownItemCount+=num;
    bag[itemId] = ownItemCount;
    return bag;
};
/**
 * 扣除背包
 * @param bag
 * @param itemId
 * @param num
 * @returns {*}
 */
exports.delBag = function(bag,itemId,num){
    if(typeof itemId  =="object"){
        for(var key in itemId){
            _delBag(bag,key,itemId[key]);
        }
    }else{
        _delBag(bag,itemId,num);
    }
};

var _delBag = function(bag,itemId,num){
    var ownItemCount = bag[itemId]||0;
    var reItemCount = ownItemCount - num;
    bag[itemId] = reItemCount;
    if (reItemCount <= 0) delete bag[itemId];
    return bag;
};

//获取某种类型的物品数量
exports.getNumOfItems = function(items,type){
    var num = 0;
    if(!items) return num;
    for(var key in items){
        var locId = key;
        var locItemData = t_item[locId];
        if(!locItemData) continue;
        var locNum = parseInt(items[key]);
        if(locItemData.type==type){
            num+=locNum;
        }
    }
    return num;
};


//增加钻石
exports.addDiamond = function(user, diamond, consumeType, orderid){
    if (diamond == 0) return;
    user.diamond += diamond;
    //计算获得类型，只有充值才是购买的
    if (consumeType == consts.diamondGainType.recharge_1) {
        user.buyDiamond += diamond;
    } else {
        user.giveDiamond += diamond;
    }
};

//减去钻石 diamond giveDiamond buyDiamond
exports.reduceDiamond = function(userData, diamond, consumeType, orderid){
    if (diamond == 0) return;
    userData.diamond -= diamond;
    //计算消耗类型，优先消耗系统赠送的
    var costBuyDiamond = 0;

    var temp = userData.giveDiamond - diamond;
    //如果系统足够
    if(temp>=0){
        userData.giveDiamond = temp;
    }else{
        //系统耗光了
        userData.giveDiamond = 0;

        //消耗购买的
        costBuyDiamond = temp*-1;
        userData.buyDiamond-=costBuyDiamond;
    }

    //todo 先不记录，用gameRecord表记录
/*
    //今日消耗
    exports.addDiamondTodayCost(userData, diamond);
*/

};

/**
 * 获取今日消费钻石
 * @param userData
 */
exports.getDiamondTodayCost = function(userData){
    //今日消耗
    var todayCostData =  userData.record[c_prop.userRecordTypeKey.diamondTodayCost]||{};
    var today = (new Date()).toFormat("YYYY-MM-DD");
    var todayCost = todayCostData[today]||0;
    return todayCost;
};

/**
 * 增加今日消费钻石
 * @param userData
 * @param diamond
 */
exports.addDiamondTodayCost = function(userData,diamond){
    var todayCostData =  userData.record[c_prop.userRecordTypeKey.diamondTodayCost]||{};
    var today = (new Date()).toFormat("YYYY-MM-DD");
    var todayCost = todayCostData[today]||0;
    todayCost+=diamond;
    todayCostData[today] = todayCost;
    userData.record[c_prop.userRecordTypeKey.diamondTodayCost] = todayCostData;
};

/**
 * 按日期区间获取消费钻石
 * @param userData
 * @param startDate
 * @param endDate
 */
exports.getDiamondByDate = function(userData,startDate,endDate){
    var allCost =0;
    if(!startDate||!endDate) return allCost;
    var todayCostData =  userData.record[c_prop.userRecordTypeKey.diamondTodayCost]||{};
    for(var i =0;i<1000;i++){
        startDate.addDays(1);
        if(startDate.isAfter(endDate)) break;
        var locKey = startDate.toFormat("YYYY-MM-DD");
        var locCost = todayCostData[locKey]||0;
        allCost+=locCost;
    }
    return allCost;
};


//添加经验
exports.addUserExpc = function(user, expc){
    checkRequire();
    //先判断是否达到转生等级，是的话，积累为转生经验，否者，正常流程
    var oldLvl = user.lvl;
    var rebirthLvl = user.rebirthLvl;
    var nextRebirthLvlData = t_rebirth[rebirthLvl+1] || {};
    var nextRebirthLvl = nextRebirthLvlData.lvl;
    if(!nextRebirthLvl)
        return; //到了此处找策划
    if(oldLvl == nextRebirthLvl){
        exports.addRebirthExpc(user, expc); //容易溢出，需整改
        return;
    }

    //是否开启注入经验
    if(user.isOpenIn == 1){
        var fourRoleExpc = 0;
        var needInfuseExpc = c_game.fourRole[2];
        if((expc + user.infuseExpc)<needInfuseExpc){
            fourRoleExpc=expc;
            expc = 0;
        }else{
            fourRoleExpc=(needInfuseExpc-user.infuseExpc);
            expc-=fourRoleExpc;
            user.isOpenIn == 0;
        }
        exports.addFourRoleExpc(user, fourRoleExpc, user.isOpenIn);
    }

    //限制最高等级
    var maxLvl = c_game.initCfg[0];
    for(var i = oldLvl;i<maxLvl;i++){
        var locLvlData = c_lvl[i];
        if(!locLvlData) break;
        var locNextNeed = locLvlData.reqExp-user.expc;
        if(expc<locNextNeed){
            user.expc+=expc;
            break;
        }else{
            expc-=locNextNeed;
            user.lvl++;
            user.expc = 0;
            //判断是否达到转生限制等级
            if(user.lvl == nextRebirthLvl){
                exports.addRebirthExpc(user, expc);
                break;
            }
        }
    }

    if(user.lvl>=maxLvl){
        user.lvl = maxLvl;
        user.expc = 0;
    }
    g_data.setUserLvl(user.id,user.lvl);
    if(oldLvl!=user.lvl){
        taskBiz.setTaskValue(uwClient,user.id,c_prop.cTaskTypeKey.personLvl,user.lvl,function(){});
        bonusBiz.inviteeLevelUp(uwClient, user.id, oldLvl, user.lvl, function(){});
        _setLvlAchievement(user);
    }
};

//第四角色注入经验
exports.addFourRoleExpc = function(userData, expc,isOpen){
    userData.infuseExpc += expc;
    if(userData.infuseExpc < 0) userData.infuseExpc = 0;
    userData.isOpenIn = isOpen;
    var updateUserData = {
        isOpenIn: userData.isOpenIn,
        infuseExpc: userData.infuseExpc
    };
    userDao.update(uwClient, updateUserData, {id: userData.id},function(err){if(err)console.log(err);});
};

//添加转生经验
exports.addRebirthExpc = function(userData, expc){
    userData.rebirthExp += expc; //容易溢出，需整改
    var updateUserData = {
        rebirthExp: userData.rebirthExp
    };
    userDao.update(uwClient, updateUserData, {id: userData.id},function(err){if(err)console.log(err);});
};

//添加经验
exports.addVipExpc = function(userData, expc){
    checkRequire();
    var oldVip = userData.vip;
    userData.vipScore+=expc;

    var curVip =  _getCurVip(userData.vipScore);
    //curVip -=1;
    userData.vip = curVip;

    //限制最高等级
    var maxLvl = c_game.initCfg[5];
    if(userData.vip>=maxLvl){
        userData.vip = maxLvl;
    }

    if(oldVip!=curVip){
        for(var i = oldVip+1;i<=curVip;i++){
            var locCurVip = i;
            //第一个%s：玩家名
            //第二个%s：VIP等级
            chatBiz.addSysData(21,[userData.nickName,locCurVip]);
            chatBiz.addSysData(22,[userData.nickName,locCurVip]);
            // VIP奖励（通过邮件）
            var chestsId = c_vip[locCurVip].itemId;
            var logicItems = itemBiz.calLogicItems(chestsId);        //宝箱随机的物品
            if(JSON.stringify(logicItems) != "{}") mailBiz.addByType(uwClient, userData.id, c_prop.mailTypeKey.vip, [locCurVip], logicItems, function(){});
        }
    }
};

//消耗货币 gold,diamond,honor
exports.costCurrency = function(userData,costType,costNum){
    switch (costType){
        case c_prop.currencyTypeKey.gold:
            exports.addGold(userData,costNum*-1);
            break;
        case c_prop.currencyTypeKey.diamond:
            exports.reduceDiamond(userData,costNum);
            break;
        case c_prop.currencyTypeKey.honor:
            userData.honor-=costNum;
            break;
        case c_prop.currencyTypeKey.prestige:
            userData.prestige-=costNum;
            break;
        case c_prop.currencyTypeKey.expedition:
            userData.bag[79] -= costNum;
            break;
        case c_prop.currencyTypeKey.expeditionHigh:
            userData.bag[80] -= costNum;
            break;
    }
};

/**
 * 添加真气
 * @param userData
 * @param genuineQi
 */
exports.addGenuineQi = function(userData,genuineQi){
    userData.genuineQi = Math.ceil(userData.genuineQi);
    genuineQi = Math.ceil(genuineQi);
    userData.genuineQi+=genuineQi;

    //不能小于0
    userData.genuineQi = userData.genuineQi < 0 ? 0 : userData.genuineQi;
};

/**
 * 计算当前真气       【lvl,genuineQi,exData】
 * @param userData
 */
exports.calGenuineQi = function(userData,demonLotusData){
    var offAddGenuineQi = 0;
    var genuLimit = 0;
    var nowTime = new Date();
    var genuineQi = userData.genuineQi < 0 ? 0 : Math.ceil(userData.genuineQi);
    if(!c_genuineQi[userData.lvl]) return [offAddGenuineQi,genuLimit];
    var produceFix = c_genuineQi[userData.lvl].recovery || 0;//基础速度
    if(userData.exData[c_prop.userExDataKey.talismanSkill] && userData.exData[c_prop.userExDataKey.talismanSkill][c_prop.talismanSkillTypeKey.genuineQi]){
        var skillArr = userData.exData[c_prop.userExDataKey.talismanSkill][c_prop.talismanSkillTypeKey.genuineQi];
        for(var i = 0 ;i<skillArr.length;i++){
            var skillId = skillArr[i];
            if(t_talismanSkill[skillId]){
                produceFix += t_talismanSkill[skillId].effect[0][0];
            }
        }
    }

    if(!userData.exData[c_prop.userExDataKey.genuineQi]) userData.exData[c_prop.userExDataKey.genuineQi] = [];
    var exData = userData.exData[c_prop.userExDataKey.genuineQi];
    if(!exData[0]) userData.exData[c_prop.userExDataKey.genuineQi][0] = new Date();
    var lastTime = new Date(userData.exData[c_prop.userExDataKey.genuineQi][0]);      //最后结算时间

    //距离上次结算的秒差
    var second = parseInt((nowTime.getTime()-lastTime.getTime())/1000);
    offAddGenuineQi = Math.ceil(second*produceFix) + genuineQi;
    var advanceLvl = demonLotusData.advanceLvl||0;
    var genqiAccLimit = parseInt(c_demonLotus[advanceLvl].genqiAccLimit);
    genuLimit = parseInt(c_genuineQi[userData.lvl].genuLimit) + genqiAccLimit;    //真气上限
    if(offAddGenuineQi > genuLimit){
        if(genuineQi < genuLimit){
            offAddGenuineQi = genuLimit;
        }else{
            offAddGenuineQi = genuineQi;
        }
    }

    if(second>=1){
        userData.genuineQi =offAddGenuineQi;
        userData.genuineQi = Math.ceil(userData.genuineQi);
        userData.exData[c_prop.userExDataKey.genuineQi][0] = new Date();
    }

    return [offAddGenuineQi,genuLimit];
};


/**************************************************************************************************/

//上报等级数据
var _setLvlAchievement = function(userData){
    accountDao.select(mainClient,{id:userData.accountId},function(err,accountData){
        if(err) return err;
        if(!accountData) return;
        /*var roleId = data[0];
         var serverId = data[1];
         var roleLvl = data[2];
         var open_id = data[3];*/
        var data = [];
        data[0] = userData.id;
        data[1] = project.serverId;
        data[2] = userData.lvl;
        data[3] = accountData.name;
        data[4] = userData.nickName;

        sdkBiz.setAchievement(accountData.channelId,data,function(){});
    })
};

var _delEquipBagByTempId = function(userData,tempId,num){
    for(var i = 0;i<num;i++){
        for(var key in userData.equipBag){
            var locData = userData.equipBag[key];
            var locTempId = locData[0];
            var locIsUp = locData[3];
            if(!locIsUp&&locTempId==tempId){
                delete userData.equipBag[key];
                break;
            }
        }
    }
};

var _delBagByTempId = function(userData,tempId,num){
    for(var i = 0;i<num;i++){
        for(var key in userData.bag){
            var locTempId = key;
            if(locTempId==tempId){
                var locOwnNum = userData.bag[key]||0;
                //delete userData.bag[key];
                locOwnNum--;
                if(locOwnNum<=0){
                    delete userData.bag[key];
                }else{
                    userData.bag[key] = locOwnNum;
                }
                break;
            }
        }
    }
};

var _getCurVip = function(vipScore){
    var tempVip = 0;
    for(var i = 0;i<100;i++){
        var locLvlData = c_vip[i];
        if(!locLvlData) break;
        var locNextData = c_vip[i+1];
        if(!locNextData) break;
        if(vipScore<locLvlData.score){
            break;
        }
        tempVip++;
    }
    return tempVip;
};
