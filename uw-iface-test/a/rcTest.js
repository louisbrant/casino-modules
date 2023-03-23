var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(2282,2);

function getRequest(){
    var args = {};
    var argsKeys = iface.a_recharge_getRequest_args;
    args[argsKeys.rechargeId] = 1;
    args[argsKeys.goodsId] = 1;
    core4Test.callIface(iface.a_recharge_getRequest, args, cb);
}

function handleRequest(){
    var args = {};
    core4Test.callIface(iface.a_recharge_handleRequest, args, cb);
}

/**********************************************************************************************************************/
//getRequest();
handleRequest();
