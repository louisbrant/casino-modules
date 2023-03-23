var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(2282,1);

function getServerArr(){
    var args = {};
    core4Test.callIface(iface.a_coffers_getServerArr, args, cb);
}

/**********************************************************************************************************************/
getServerArr();
