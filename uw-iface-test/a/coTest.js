var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(5713,1);

function use(){
    var args = {};
    var argsKeys = iface.a_coupon_use_args;
    args[argsKeys.code] = "aaaaaa";
    core4Test.callIface(iface.a_coupon_use, args, cb);
}

/**********************************************************************************************************************/
use();
