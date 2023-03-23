require("date-utils");
var path = require("path");
var consts = require("uw-data").consts;
var UserData = require("uw-gameobj").UserData;


var core4Test = module.exports;


/**
 * Desc:测试用的回调函数。
 * @param err
 * @param info
 */
core4Test.cb4Test = function(err, info){
    if(err) console.error(err);
    else {
        console.log("success!!!!!")
        for (var i = 1, li = arguments.length; i < li; i++) {
            console.log("-----arguments[" + i + "]------------")
            console.log(JSON.stringify(arguments[i]));
        }
    }
};

/**
 * Desc:测试用的回调函数。输出所有参数
 */
core4Test.cb4Test1 = function(){
    for (var i = 0, li = arguments.length; i < li; i++) {
        console.log("-----arguments[" + i + "]------------")
        var itemi = arguments[i];
        console.log(itemi);
    }
};

core4Test.cb4Server = function(err, data){
    if(err) return console.log(err);
    if(!data.m){
        console.log(JSON.stringify(data.v));
    }
}

var uwDb = require("uw-db");
uwDb.uwTrans._isTest = true;
core4Test.trans = uwDb.uwTrans;

core4Test.uwClient = uwDb.uwClient;
core4Test.mainClient = uwDb.mainClient;


function Session(){
    this.set = function(key, value){
        this[key] = value;
    };
    this.get = function(key){
        return this[key];
    }
}

var session = new Session();
core4Test.setSession = function(userId, accountId){
    session.set(consts.session.userId,userId);
    session.set(consts.session.accountId,accountId);
}
core4Test.session = session;
var cacheHadle = {};
core4Test.callIface = function(iface, args, cb){
    var arr = iface.split(".");
    var handler =cacheHadle[iface]
    if(!handler){
        handler = require("../../../route/" + arr[0] + "/handler/" + arr[1]);
        cacheHadle[iface] = handler;
    }
    var time1 = Date.now();
    handler[arr[2]](args, session, function(err,data){
        console.log("执行耗时：%dms",Date.now()-time1);
        cb(err,data);
    });

}