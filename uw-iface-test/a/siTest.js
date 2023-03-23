var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(16,1);

//获取物品列表
function getInfo(){
    var args = {};
    core4Test.callIface(iface.a_shop_getInfo, args, cb);
}

//购买物品
function buy(){
    var args = {};
    var argsKeys = iface.a_shop_buy_args;
    args[argsKeys.shopId] = 17;
    core4Test.callIface(iface.a_shop_buy, args, cb);
}

//购买物品
function clearEffect(){
    var args = {};
    core4Test.callIface(iface.a_shop_clearEffect, args, cb);
}

//获取荣誉商店数据
function getArenaShopList(){
    var args = {};
    core4Test.callIface(iface.a_exShop_getInfo, args, cb);
}

//刷新荣誉商店
function refreshExShop(){
    var args = {};
    core4Test.callIface(iface.a_exShop_refreshExShop, args, cb);
}

//购买
function exShopBuy(){
    var args = {};
    var argsKeys = iface.a_exShop_exShopBuy_args;
    args[argsKeys.index] = 0;
    core4Test.callIface(iface.a_exShop_exShopBuy, args, cb);
}
/***********************************************************************************************************************/
//getInfo();
//buy();
//clearEffect()
//getArenaShopList()
//refreshExShop()
exShopBuy()
