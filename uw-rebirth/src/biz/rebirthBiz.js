/**
 * Created by Administrator on 2016/1/20.
 */
var c_prop = require("uw-data").c_prop;
var t_rebirth = require("uw-data").t_rebirth;
var uwData = require("uw-data");
var c_msgCode = uwData.c_msgCode;
var c_game = require("uw-data").c_game;
var getMsg = require("uw-utils").msgFunc(__filename);
var userUtils = require("uw-user").userUtils;
var async = require("async");
var heroPropHelper = require("uw-hero").heroPropHelper;
var propUtils = require("uw-utils").propUtils;
var exports = module.exports;

var userDao = null;
var heroDao = null;


var checkRequire = function(){
    userDao = userDao || require("uw-user").userDao;
    heroDao = heroDao || require("uw-hero").heroDao;
};
/**
 * 获取转生信息
 * @param client
 * @param userId
 * @param cb
 */
exports.rebirth = function(client, userId, cb) {
    checkRequire();
    userDao.select(client, {id: userId}, function(err, userData){
        if(err) return cb(err);
        var rebirthLvl = userData.rebirthLvl;
        var rebirthExp = userData.rebirthExp;
        var nextRebirthLvl = rebirthLvl +1;
        var rebirthData = t_rebirth[nextRebirthLvl];
        if(rebirthData) {
            var needLvl = rebirthData.lvl;
            if(needLvl != userData.lvl){
                return cb("该等级不可飞升");
            }
            var needExp = rebirthData.exp;
            if(rebirthExp >= needExp) {
                rebirthExp -= needExp;
                rebirthLvl++;
                userData.rebirthLvl = rebirthLvl;
                userData.rebirthExp = rebirthExp;

                heroDao.list(client," userId = ? order by id asc",[userId],function(err,heroList) {
                    if(err) return cb(err);
                    for(var i = 0;i<heroList.length;i++) {
                        var locHero = heroList[i];
                        locHero.propArr = heroPropHelper.calHeroProp(userData, locHero);
                        locHero.combat = heroPropHelper.calCombat(userData, locHero);

                        var upHeroData = {
                            propArr:locHero.propArr,
                            combat:locHero.combat
                        };
                        heroDao.update(client,upHeroData,{id: locHero.id}, function(err,data){console.log(err);});
                    }

                    var updateUserData = {
                        rebirthLvl: userData.rebirthLvl,
                        rebirthExp: userData.rebirthExp
                    }

                    userDao.update(client, updateUserData, {id: userId}, function (err, data) {
                        if (err) return cb(err);
                        return cb(null, [updateUserData, heroList]);
                    })
                });
            }else {
                return cb(getMsg(c_msgCode.noExperience));
            }
        }else {
            return cb("策划没配");
        }
    });
}


/**
 * 购买转生丹
 * @param index
 * @param num
 * @param client
 * @param userId
 * @param cb
 */
exports.buyRebirth = function(index, num, client, userId, cb){
    checkRequire();
    userDao.select(client,{id: userId}, function(err, userData) {
        if(err) return cb(err);
        var buyCount = 0;//已购买次数
        var needDiamond = 0;//需要钻石
        var buyMax = 0;
        var rebirthType = null;
        switch(index){
            case 0:
                buyCount = userUtils.getTodayCount(userData, c_prop.userRefreshCountKey.buyPrimaryRebirth);
                rebirthType = c_prop.userRefreshCountKey.buyPrimaryRebirth;
                break;
            case 1:
                buyCount = userUtils.getTodayCount(userData, c_prop.userRefreshCountKey.buyMidRebirth);
                rebirthType = c_prop.userRefreshCountKey.buyMidRebirth;
                break;
            case 2:
                buyCount = userUtils.getTodayCount(userData, c_prop.userRefreshCountKey.buyAdvancedRebirth);
                rebirthType = c_prop.userRefreshCountKey.buyAdvancedRebirth;
                break;
            default:
                return cb("参数有误");
        }
        {
            var limitStr = c_game.rebirth[2];
            var limitArr = limitStr.split(",");
            buyMax = limitArr[index] || 0;
            buyMax *= 1;
            var diamondStr = c_game.rebirth[1];
            var diamondArr = diamondStr.split(",");
            needDiamond = diamondArr[index] || 0;
        }
        if(buyCount+num >buyMax) return cb(getMsg(c_msgCode.buyLimitNow));//每日限购
        needDiamond *= num;
        if(userData.diamond < needDiamond){
            return cb(getMsg(c_msgCode.noDiamond));
        }
        userUtils.reduceDiamond(userData, needDiamond);
        userUtils.addTodayCount(userData, rebirthType,num);
        //购买逻辑
        var item = {};
        item[c_game.rebirth[0].split(",")[index]] = num;
        var bagItems = {};
        var equipBagItems = {};
        var itemsArr = userUtils.saveItems(userData,item);
        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
        var updateData = {
            counts: userData.counts,
            countsRefreshTime: userData.countsRefreshTime,
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag
        };

        userDao.update(client, updateData, {id:userId}, function(err,data){
            if(err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            cb(null, [updateData,bagItems,equipBagItems,needDiamond]);
        });
    });
}