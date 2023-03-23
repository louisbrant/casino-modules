var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(2282,1);

function pickAct(){
    var args = {};
    var argsKeys = iface.a_guildPerson_pickAct_args;
    args[argsKeys.actId] = 6;
    core4Test.callIface(iface.a_guildPerson_pickAct, args, cb);
}

function opMember(){
    var args = {};
    var argsKeys = iface.a_guildPerson_opMember_args;
    args[argsKeys.targetUserId] = 2287;
    args[argsKeys.op] = 4;
    core4Test.callIface(iface.a_guildPerson_opMember, args, cb);
}

/**********************************************************************************************************************/
pickAct();

//opMember();