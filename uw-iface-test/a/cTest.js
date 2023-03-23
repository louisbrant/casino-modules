/**
 * Created by Sara on 2015/5/28.
 */
var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(2282,1);

//获取用户信息
function getInfo(){
    var args = {};
    var argsKeys = iface.a_copy_getInfo_args;
    args[argsKeys.type] = 1;
    core4Test.callIface(iface.a_copy_getInfo, args, cb);
}

//购买挑战次数
function buyCopyCount(){
    var args = {};
    var argsKeys = iface.a_copy_buyCopyCount_args;
    args[argsKeys.type] = 2;
    args[argsKeys.copyId] = 1008;
    core4Test.callIface(iface.a_copy_buyCopyCount, args, cb);
}

//购买装备入场卷
function buyEquipTessera(){
    var args = {};
    core4Test.callIface(iface.a_copy_buyEquipTessera, args, cb);
}

//购买境界入场卷
function buyRealmTessera(){
    var args = {};
    core4Test.callIface(iface.a_copy_buyRealmTessera, args, cb);
}

//扫荡
function wipe(){
    var args = {};
    var argsKeys = iface.a_copy_wipe_args;
    args[argsKeys.copyId] = 1;
    args[argsKeys.count] = 10;
    core4Test.callIface(iface.a_copy_wipe, args, cb);
}
//扫荡
function start(){
    var args = {};
    var argsKeys = iface.a_copy_start_args;
    args[argsKeys.copyId] = 44;
    core4Test.callIface(iface.a_copy_start, args, function(){
        end()
    });
}

//扫荡
function end(){
    var args = {};
    var argsKeys = iface.a_copy_end_args;
    args[argsKeys.copyId] = 44;
    args[argsKeys.fightData] = [];
    args[argsKeys.isWin] = 0;
    core4Test.callIface(iface.a_copy_end, args, cb);
}
/***********************************************************************************************************************/
//getInfo();
//buyCopyCount();
//buyEquipTessera();
//buyRealmTessera();
//wipe();
start();