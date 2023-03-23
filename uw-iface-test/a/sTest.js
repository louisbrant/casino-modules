var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(2,1);

//获取物品列表
function buy(){
    var args = {};
    var argsKeys = iface.a_shop_buy_args;
    args[argsKeys.index] = 0;
    args[argsKeys.type] = 1;
    args[argsKeys.num] = 1;
    core4Test.callIface(iface.a_shop_buy , args, cb);
}

//获取物品列表
function getInfo(){
    var args = {};
    var argsKeys = iface.a_shop_getInfo_args;
    args[argsKeys.type] = 3;
    core4Test.callIface(iface.a_shop_getInfo , args, cb);
}
/******************************************************************/

//buy();
getInfo();