var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(1,20000);

function login(){
    var args = {};
    var argsKeys = iface.c_account_login_args;
    args[argsKeys.name] = "test00211";
    args[argsKeys.pwd] = "111111";
    args[argsKeys.channelId] = 0;
    core4Test.callIface(iface.c_account_login, args, cb);
}
function loginBySdk(){
    var args = {};
    /*channelId : "_0"//渠道号id
        ,sdkData : "_1"//sdk的数据，是一个数组
        ,deviceId : "_2"//机器码*/
    var argsKeys = iface.h_account_loginBySdk_args;
    args[argsKeys.channelId] = 10005;
    args[argsKeys.sdkData] = ["H3ayyzFo55gEScBm"];
    args[argsKeys.deviceId] = "device1434446921050";
    core4Test.callIface(iface.h_account_loginBySdk, args, cb);
}
function register(){
    var args = {};
    var argsKeys = iface.c_account_register_args;
    args[argsKeys.name] = "test00211";
    args[argsKeys.pwd] = "111111";
    args[argsKeys.channelId] = 0;
    args[argsKeys.deviceId] = "deviceId111";
    core4Test.callIface(iface.c_account_register, args, cb);
}
function createUser(){
    var args = {};
    var argsKeys = iface.c_account_createUser_args;
    args[argsKeys.name] = "魏如萱";
    args[argsKeys.heroTempId] = "1";
    args[argsKeys.sex] = 0;
    core4Test.callIface(iface.c_account_createUser, args, cb);
}
/**********************************************************************************************************************/
//login();
//loginBySdk();
//register()
createUser();