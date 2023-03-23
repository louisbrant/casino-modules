/**
 * Created by Sara on 2015/9/22.
 */
var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(6,1);

//装备熔炼
function smelt(){
    var args = {};
    var argsKeys = iface.a_smelt_smelt_args;
    args[argsKeys.equipArr] = [45, 1, 5, 6, 7, 8, 9, 12, 13];       //所要熔炼的装备id数组
    core4Test.callIface(iface.a_smelt_smelt, args, cb);
}

//装备合成
function compound(){
    var args = {};
    var argsKeys = iface.a_smelt_compound_args;
    args[argsKeys.compoundId] = 40201;      //所要合成物品的Id
    core4Test.callIface(iface.a_smelt_compound, args, cb);
}

//装备特戒
function wearParRing(){
    var args = {};
    var argsKeys = iface.a_smelt_wearParRing_args;
    args[argsKeys.tempId] = 1;
    args[argsKeys.breakId] = 40001;
    core4Test.callIface(iface.a_smelt_wearParRing, args, cb);
}

//特戒突破
function ringBreak(){
    var args = {};
    var argsKeys = iface.a_smelt_ringBreak_args;
    args[argsKeys.tempId] = 1;
    args[argsKeys.breakId] = 40002;
    core4Test.callIface(iface.a_smelt_ringBreak, args, cb);
}

/***********************************************************************************************************************/
//smelt();
compound();
//wearParRing();
//ringBreak();
