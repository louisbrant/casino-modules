/**
 * Created by Sara on 2015/9/24.
 */
var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(6,1);

//技能升级
function upSkill(){
    var args = {};
    var argsKeys = iface.a_hero_upSkill_args;
    args[argsKeys.tempId] = 1;
    args[argsKeys.index] = 0;
    core4Test.callIface(iface.a_hero_upSkill, args, cb);
}

//清除技能CD
function clearSkillCd(){
    var args = {};
    core4Test.callIface(iface.a_hero_clearSkillCd, args, cb);
}

//装备符文块
function wearRune(){
    var args = {};
    var argsKeys = iface.a_hero_wearRune_args;
    args[argsKeys.tempId] = 1;
    args[argsKeys.index] = 2;
    core4Test.callIface(iface.a_hero_wearRune, args, cb);
}

//升级境界
function upRealm(){
    var args = {};
    var argsKeys = iface.a_hero_upRealm_args;
    args[argsKeys.tempId] = 1;
    core4Test.callIface(iface.a_hero_upRealm, args, cb);
}

//强化
function strength(){
    var args = {};
    var argsKeys = iface.a_hero_strength_args;
    args[argsKeys.tempId] = 1;
    args[argsKeys.index] = 10;
    core4Test.callIface(iface.a_hero_strength, args, cb);
}

//升星
function upStar(){
    var args = {};
    var argsKeys = iface.a_hero_upStar_args;
    args[argsKeys.tempId] = 1;
    args[argsKeys.index] = 2;
    core4Test.callIface(iface.a_hero_upStar, args, cb);
}

//宝石升级
function upGem(){
    var args = {};
    var argsKeys = iface.a_hero_upGem_args;
    args[argsKeys.tempId] = 1;
    args[argsKeys.index] = 0;
    core4Test.callIface(iface.a_hero_upGem, args, cb);
}

//翅膀培养
function wingFos(){
    var args = {};
    var argsKeys = iface.a_hero_wingFos_args;
    args[argsKeys.tempId] = 1;
    args[argsKeys.fosType] = 2;
    core4Test.callIface(iface.a_hero_wingFos, args, cb);
}

//翅膀升级
function upWing(){
    var args = {};
    var argsKeys = iface.a_hero_upWing_args;
    args[argsKeys.tempId] = 1;
    core4Test.callIface(iface.a_hero_upWing, args, cb);
}

//翅膀激活
function wingActivate(){
    var args = {};
    var argsKeys = iface.a_hero_wingActivate_args;
    args[argsKeys.tempId] = 1;
    core4Test.callIface(iface.a_hero_wingActivate, args, cb);
}
//获取主英雄显示
function getMainHeroDisplay(){
    var args = {};
    var argsKeys = iface.a_hero_getMainHeroDisplay_args;
    args[argsKeys.userId] = 2201;
    core4Test.callIface(iface.a_hero_getMainHeroDisplay, args, cb);
}

//获取主英雄显示
function getHeroDisplayByTempId(){
    var args = {};
    var argsKeys = iface.a_hero_getHeroDisplayByTempId_args;
    args[argsKeys.userId] = 2307;
    args[argsKeys.tempId] = 0;
    core4Test.callIface(iface.a_hero_getHeroDisplayByTempId, args, cb);
}

/***********************************************************************************************************************/
//upSkill();
//clearSkillCd();
//wearRune();
//upRealm();
//strength();
//upStar();
//upGem();
//wingFos();
//upWing();
//wingActivate();
//getMainHeroDisplay();
getHeroDisplayByTempId();
