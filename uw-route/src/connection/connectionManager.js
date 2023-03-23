/**
 * Created by Administrator on 2015/5/29.
 */
var Session = require("../session/Session");
var taskManager = require("../filter/taskManager");
var md5Utils = require("uw-utils").md5Utils;

var connectionManager = {};
var uidBindSessionIdDic = {};
var id = 0;

var expireTime = 10 * 60; //过期时间（秒）
var secret = "kshh1d23hsdas";//默认key值
var gcTime = 12*60*60;//回收时间，秒

/**
 * 初始化
 * @param option
 */
exports.init = function(option){
    expireTime = option.expireTime||expireTime;
    secret = option.secret||secret;
    gcTime = option.gcTime||gcTime;

    setInterval(clearExpireSession,gcTime*1000);
};


/**
 * 创建一个新session
 */
exports.createSession = function(){
    id++;
    var secretKey = md5Utils.md5(secret,id);
    var session = new Session(secretKey);
    session.expireTime = new Date(Date.now()+expireTime*1000);
    connectionManager[secretKey] = session;
    return session;
};

/**
 * 重置过去时间
 * @param secretKey
 */
exports.resetExpireTime = function(secretKey){
    var session = connectionManager[secretKey];
    session.expireTime = new Date(Date.now()+expireTime*1000);
    return session;
};

/**
 * 获取session
 * @param secretKey
 * @returns {*}
 */
exports.getSession = function(secretKey){
    var session = connectionManager[secretKey];
    if(!session) return null;
    //过期
    if(Date.now()>=session.expireTime.getTime()) {
        deleteSession(secretKey);
        return null;
    }
    return session;
};

/**
 * 清除session
 * @param secretKey
 */
exports.destroySession = function(secretKey){
    deleteSession(secretKey);
};

/**
 * 绑定uid，用来防止重复登录
 * @param uid
 * @param sessionId
 */
exports.bindUid = function(uid,sessionId){
    var oldSessionId = uidBindSessionIdDic[uid];
    var session = connectionManager[oldSessionId];
    //todo 先不做限制
    /*if(session){
        session.isKick = 1;
    }*/
    uidBindSessionIdDic[uid] = sessionId;
};

//清除过去session
var clearExpireSession = function(){
    for(var key in connectionManager){
        var session = connectionManager[key];
        if(!session) continue;
        //过期
        if(Date.now()>=session.expireTime.getTime()) {
            deleteSession(key);
        }
    }
};

var deleteSession = function(key){
    if(!connectionManager[key]) return;
    var session = connectionManager[key];
    delete connectionManager[key];
    taskManager.closeQueue(key,true);
    if(uidBindSessionIdDic[session.uid]) delete uidBindSessionIdDic[session.uid];
};