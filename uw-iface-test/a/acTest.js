var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(2282,1);

//领取
function receive(){
    var args = {};
    var argsKeys = iface.a_activity_receive_args;
    args[argsKeys.activityId] = 3;
    args[argsKeys.index] = 0;
    core4Test.callIface(iface.a_activity_receive, args, cb);
}


//领取
function getList(){
    var args = {};
    core4Test.callIface(iface.a_activity_getList, args, cb);
}

/***********************************************************************************************************************/
receive();

//getList();