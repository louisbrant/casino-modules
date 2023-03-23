/**
 * Created by Sara on 2015/9/11.
 */
var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(3,1);


//获取好友列表
function getInfo(){
    var args = {};
    core4Test.callIface(iface.a_friend_getInfo, args, cb);
}

//请求添加好友
function requestFriend(){
    var args = {};
    var argsKeys = iface.a_friend_requestFriend_args;
    args[argsKeys.requestedId] = 3;
    core4Test.callIface(iface.a_friend_requestFriend, args, cb);
}

//处理好友请求
function disposeFriendRequest(){
    var args = {};
    var argsKeys = iface.a_friend_disposeFriendRequest_args;
    args[argsKeys.requestId] = 5;
    args[argsKeys.isTake] = 1;
    core4Test.callIface(iface.a_friend_disposeFriendRequest, args, cb);
}

//随机获取助阵好友/陌生人
function eventCheer(){
    var args = {};
    core4Test.callIface(iface.a_friend_eventCheer, args, cb);
}

//获取请求列表
function getRequestInfo(){
    var args = {};
    core4Test.callIface(iface.a_friend_getRequestInfo, args, cb);
}
/***********************************************************************************************************************/
//getInfo();
//requestFriend();
//disposeFriendRequest();
eventCheer();
//getRequestInfo();