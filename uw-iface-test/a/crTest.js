var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(5713, 1);

function getInfo() {
    var args = {};
    core4Test.callIface(iface.a_crystal_getInfo, args, cb);
}

function saveProgress() {
    var args = {};
    var argsKeys = iface.a_crystal_saveProgress_args;
    //{hp:"剩余血量",hpNum:"剩余血量条",nextReplayTime:"下一次回满时间"}
    args[argsKeys.hp] = 10;
    args[argsKeys.hpNum] = 1;
    args[argsKeys.nextReplayTime] = (new Date()).addMinutes(5);
    core4Test.callIface(iface.a_crystal_saveProgress, args, cb);
}

function finish() {
    var args = {};
    var argsKeys = iface.a_crystal_finish_args;
    //{crystalId:"当前id"}
    args[argsKeys.crystalId] = 1;
    core4Test.callIface(iface.a_crystal_finish, args, cb);
}
function pickAward() {
    var args = {};
    var argsKeys = iface.a_crystal_pickAward_args;
    //{crystalId:"当前id"}
    args[argsKeys.crystalId] = 1;
    core4Test.callIface(iface.a_crystal_pickAward, args, cb);
}
/**********************************************************************************************************************/
//getInfo();
//saveProgress()
//finish()
pickAward();