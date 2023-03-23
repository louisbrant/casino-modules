var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;
var async = require("async");
var userDao = require("uw-user").userDao;
var client = require("uw-db").uwClient;

function initTestUser(){
    userDao.list(client," id >? and id <?",[5000,6000],function(err,userList){
        var userIds = [];
        for(var i = 0;i< userList.length;i++){
            userIds.push(userList[i].id);
        }
        async.mapLimit(userIds,1,function(userId,cb1){
            getInfo(userId,cb1);
        },function(err,data){
            if(err) console.error(err);
            console.log("over!");
        });
    });

}

function getInfo(userId,cb1){
    var args = {};
    core4Test.setSession(userId,1);
    core4Test.callIface(iface.a_arena_getInfo, args, cb1);
}
function resetArenaFightRanks(cb){
    var args = {};
    core4Test.setSession(5387,1);
    core4Test.callIface(iface.a_arena_resetArenaFightRanks, args, cb);
}

function getFightUserList(cb){
    var args = {};
    core4Test.setSession(5387,1);
    core4Test.callIface(iface.a_arena_getFightUserList, args, cb);
}

function buyPKNum(cb){
    var args = {};
    core4Test.setSession(5387,1);
    core4Test.callIface(iface.a_arena_buyPKNum, args, cb);
}
function fightStart(rank,cb){
    var args = {};
    core4Test.setSession(5,1);
    var args = {};
    var argsKeys = iface.a_arena_fightStart_args;
    args[argsKeys.rank] = rank;
    core4Test.callIface(iface.a_arena_fightStart, args, cb);
}

function getRecordList(cb){
    var args = {};
    core4Test.setSession(5387,1);
    var args = {};
    var argsKeys = iface.a_arena_getRecordList_args;
    args[argsKeys.index] = 0;
    args[argsKeys.count] = 20;
    core4Test.callIface(iface.a_arena_getRecordList, args, cb);
}
/**********************************************************************************************************************/
//initTestUser();
//getInfo(5387,cb);
//resetArenaFightRanks(cb)
//buyPKNum(cb)
//getFightUserList(cb)
//fight(75,cb)
//getRecordList(cb)
fightStart(cb);