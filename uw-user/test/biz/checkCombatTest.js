/**
 * Created by Administrator on 2015/6/29.
 * 充值竞技场某些数据
 */
require("date-utils")
var c_prop = require("uw-data").c_prop;
var c_lvl = require("uw-data").c_lvl;
var c_game = require("uw-data").c_game;
var c_shop = require("uw-data").c_shop;
var c_event = require("uw-data").c_event;
var c_effect = require("uw-data").c_effect;
var consts = require("uw-data").consts;
var userUtils = require("../../src/biz/userUtils");
var uwClient = require("uw-db").uwClient;

var eventDao = require("uw-event").eventDao;
var userDao = require("../../src/dao/userDao");
var async = require("async");

var  checkUserCombat = function(userId,cb){
    async.parallel([
        function(cb1){
            userDao.select(uwClient,{id:userId},cb1);
        },
        function(cb1){
            eventDao.select(uwClient,{userId:userId},cb1);
        }
    ],function(err,data){
        if(err) return console.error(err);
        var userData = data[0],eventData = data[1];
        var updateData = {attack:0,defence:0,hp:0,crit:0};
        //初始
        _calInit(updateData ,userData);
        //升级
        _calLvl(updateData ,userData);
        //英雄
        _calHero(updateData ,userData);
        //商店
        _calShopData(updateData ,userData);
        //随机事件
        _calEvent(updateData,eventData);
        //持续效果
        _calEffectData(updateData ,userData);
        updateData.combat = userUtils.calCombat(updateData);
        console.log("userId:",userId);
        console.log(updateData);
        userDao.update(uwClient,{attack:updateData.attack,defence:updateData.defence,hp:updateData.hp,crit:updateData.crit,combat:updateData.combat},{id:userId},cb);
    });
};

var _calInit = function(updateData ,userData){
    updateData.attack = c_game.userInit[0];
    updateData.defence = c_game.userInit[1];
    updateData.hp = c_game.userInit[2];
    updateData.crit = c_game.userInit[3];
}

var _calHero = function(updateData ,userData){
    var heroData =JSON.parse(JSON.stringify(userData.heroData));
    updateData.heroData ={};
    for(var key in heroData){
        var locHeroData = heroData[key];
        var locId = parseInt(key);
        var locNum = parseInt(locHeroData[1]||0);
        userUtils.addHero(updateData,locId,locNum);
    }
}

var _calLvl = function(updateData ,userData){
    for (var i = 0; i <= userData.lvl; i++) {
        var newRate = c_lvl[i + 1].upUserCostRate;
        //攻击、防御、生命、暴击
        updateData.attack += newRate * c_game.userLvl[0];
        updateData.defence += newRate * c_game.userLvl[1];
        updateData.hp += newRate * c_game.userLvl[2];
        updateData.crit += newRate * c_game.userLvl[3];
    }
};

var _calShopData = function(updateData ,userData){
    //商店
    var shopData =JSON.parse(JSON.stringify(userData.shopData));
    for(var key in shopData){
        var locShopData = shopData[key];
        var locId = parseInt(key);//id
        var locLvl = parseInt(locShopData[1])||0;//等级
        var c_shopData = c_shop[locId];
        if(c_shopData.addValue1){
            for(var j = 0;j<locLvl;j++){
                var locValueData = c_shopData.addValue1[j];
                if(!locValueData) continue;
                var locAddType = locValueData[1];
                var locAddValue = locValueData[2];
                switch (locAddType){
                    case consts.addValueType.attack:       //提升攻击
                        updateData.attack += locAddValue;
                        break;
                    case  consts.addValueType.crit:        //提升暴击
                        updateData.crit += locAddValue;
                        break;
                    case  consts.addValueType.defence:     //提升防御
                        updateData.defence += locAddValue;
                        break;
                    case  consts.addValueType.hp:      //提升血量
                        updateData.hp += locAddValue;
                        break;
                }
            }
        }
    }
};


var _calEvent = function(updateData ,eventData){
    if(!eventData) return;
    //商店
    var record =JSON.parse(JSON.stringify(eventData.record));
    for(var key in record){
        var locRecordData = record[key];
        var locId = parseInt(key);//id
        var locPickNum = parseInt(locRecordData[2])||0;//领取次数
        var c_shopData = c_event[locId];
        if(!c_shopData.addValue1) continue;
        var locAddType = c_shopData.addValue1[0];
        var locAddValue = c_shopData.addValue1[1];
        if(!locAddType) continue;
        for(var i =0;i<locPickNum;i++){
            switch (locAddType){
                case consts.addValueType.attack:       //提升攻击
                    updateData.attack += locAddValue;
                    break;
                case  consts.addValueType.crit:        //提升暴击
                    updateData.crit += locAddValue;
                    break;
                case  consts.addValueType.defence:     //提升防御
                    updateData.defence += locAddValue;
                    break;
                case  consts.addValueType.hp:      //提升血量
                    updateData.hp += locAddValue;
                    break;
            }
        }
    }
};

var _calEffectData = function(updateData ,userData){
    //商店
    var conEffectData =JSON.parse(JSON.stringify(userData.conEffectData));
    for(var key in conEffectData) {
        var locId = parseInt(key);//id
        var locEffectData = conEffectData[key];
        var locValue = locEffectData[2];
        var c_effectData = c_effect[locId];
        if(!c_effectData){
            console.log("effect没有这个id:s%",locId);
            continue;
        }
        switch (c_effectData.type){
            case  c_prop.effectTypeKey.attack:          //提升攻击
                updateData.attack += locValue;
                break;
            case  c_prop.effectTypeKey.defence:          //提升防御
                updateData.defence += locValue;
                break;
            case  c_prop.effectTypeKey.hp:           //提升血量
                updateData.hp += locValue;
                break;
            case  c_prop.effectTypeKey.crit:             //提升暴击
                updateData.crit += locValue;
                break;
        }
    }
};

var checkListCombat = function(userIds){
    for (var i = 0; i < userIds.length; i++) {
        var locId = userIds[i];
        checkUserCombat(locId,function(err,data){
            if(err) console.error("err:",err);
        });
    }
};
/*************************************************************/
/*
var testData = {attack:0,defence:0,hp:0,crit:0};
var testEventData = {
    record :{"10000":[1,1,1],"10001":[1,1,1],"10002":[1,1,0],"10003":[1,1,1],"10004":[1,1,1]}
}
var testUserData = {
    attack:0,
    defence:0,
    hp:0,
    crit:0,
    heroData:{"1":[1,438,1],"2":[2,424,1],"3":[3,346,1],"4":[4,370,1],"5":[5,214,1],"6":[6,322,1],"7":[7,234,1],"8":[8,336,1],"9":[9,243,1],"10":[10,422,1],"11":[11,490,1],"12":[12,267,1],"13":[13,329,1],"14":[14,351,1],"15":[15,333,1],"16":[16,296,1],"17":[17,622,1],"18":[18,322,1],"19":[19,357,1],"20":[20,162,1],"21":[21,399,1],"22":[22,300,1],"23":[23,369,1],"24":[24,230,1],"25":[25,400,1],"26":[26,417,1],"27":[27,338,1],"28":[28,360,1],"29":[29,280,1],"30":[30,76,1],"33":[33,169,1],"35":[35,353,1]},
    lvl:119,
    shopData:{"1":[1,74,"2015-07-02T09:01:34.568Z"],"2":[2,74,"2015-07-02T09:01:29.957Z"],"3":[3,74,"2015-07-02T09:01:39.342Z"],"4":[4,19,"2015-06-30T08:25:50.004Z"],"5":[5,5,"2015-07-10T15:36:13.823Z"],"6":[6,7,"2015-07-10T15:36:20.174Z"],"7":[7,4,"2015-07-07T11:55:49.626Z"],"8":[8,101,"2015-07-07T15:55:37.399Z"],"9":[9,5,"2015-07-07T15:54:38.168Z"],"10":[10,1,"2015-07-02T04:54:51.954Z"],"11":[11,3,"2015-07-07T11:55:35.152Z"],"12":[12,423,"2015-07-07T11:55:38.809Z"],"13":[13,27,"2015-07-09T07:13:25.968Z"],"14":[14,23,"2015-07-09T07:13:24.265Z"],"16":[16,11,"2015-07-09T07:29:36.624Z"],"17":[17,49,"2015-06-30T08:37:59.452Z"],"18":[18,1,"2015-07-03T10:26:07.124Z"]},
    conEffectData:{"11":["2015-07-10T15:36:13.823Z","2015-07-11T03:36:13.823Z",80],"12":["2015-07-10T15:36:20.174Z","2015-07-11T15:36:20.174Z",0]}

};

//初始
_calInit(testData ,testUserData);
//升级
_calLvl(testData ,testUserData);
//英雄
_calHero(testData ,testUserData);
//商店
_calShopData(testData ,testUserData);
//随机事件
_calEvent(testData,testEventData);
//持续效果
_calEffectData(testData ,testUserData);
testData.combat = userUtils.calCombat(testData);
console.log(testData);
*/

checkListCombat([11273]);



