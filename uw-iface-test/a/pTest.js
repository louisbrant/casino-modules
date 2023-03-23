var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(6585,1);

//购买挑战次数
function buyPKNum(){
    var args = {};
    core4Test.callIface(iface.a_pk_buyPKNum, args, cb);
}

//获取对手列表
function getOpponent(){
    var args = {};
    core4Test.callIface(iface.a_pk_getPKUserList, args, cb);
}

//获取对手信息
function getOppoData(){
    var args = {};
    var argsKeys = iface.a_pk_getPKUserData_args;
    args[argsKeys.userId] = 52;
    core4Test.callIface(iface.a_pk_getPKUserData, args, cb);
}

//获取排行榜
function getUserRanks(){
    var args = {};
    core4Test.callIface(iface.a_pk_getUserRanks, args, cb);
}

//获取自己的排名
function getRank(){
    var args = {};
    core4Test.callIface(iface.a_pk_getRank, args, cb);
}

//获取对手信息
function fight(){
    var args = {};
    var argsKeys = iface.a_pk_fight_args;
    args[argsKeys.enemyId] = 10604;
    args[argsKeys.isNPC] = 0;
    args[argsKeys.fightType] = 1;
    core4Test.callIface(iface.a_pk_fight, args, cb);
}

//领取排行奖励
function pickRankAward(){
    var args = {};
    core4Test.callIface(iface.a_pk_pickRankAward, args, cb);
}
//跳过
function skip(){
    var args = {};
    core4Test.callIface(iface.a_pk_skip, args, cb);
}
/***********************************************************************************************************************/
//buyPKNum();
//getOpponent();
//getOppoData();
//getRank();
//getUserRanks();
fight();
//pickRankAward();
//skip();