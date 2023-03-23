/**
 * Created by Administrator on 2015/5/29.
 */
var Session = require("../session/Session");
var taskManager = require("../filter/taskManager");
var md5Utils = require("uw-utils").md5Utils;

var sessionManager = {};
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
    sessionManager[secretKey] = session;
    return session;
};

/**
 * 重置过去时间
 * @param secretKey
 */
exports.resetExpireTime = function(secretKey){
    var session = sessionManager[secretKey];
    session.expireTime = new Date(Date.now()+expireTime*1000);
    return session;
};

/**
 * 获取session
 * @param secretKey
 * @returns {*}
 */
exports.getSession = function(secretKey){
    var session = sessionManager[secretKey];
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
 * @param serverIndexId
 */
exports.bindUid = function(uid,sessionId,serverIndexId){
    var oldSessionId = uidBindSessionIdDic[uid+"-"+serverIndexId];
    var session = sessionManager[oldSessionId];

    //todo 先不做限制
    if(session){
        if(session.id == sessionId) return;
        session.loggedInOtherDevice = 1;
    }
    uidBindSessionIdDic[uid+"-"+serverIndexId] = sessionId;
};

//根据accountId 获取用户session
exports.getSessionByAccountId = function(accountId,serverIndexId){
    var sessionId = uidBindSessionIdDic[accountId+"-"+serverIndexId];
    if(sessionId) {
        return sessionManager[sessionId];
    }
    return null;
}

//清除过去session
var clearExpireSession = function(){
    for(var key in sessionManager){
        var session = sessionManager[key];
        if(!session) continue;
        //过期
        if(Date.now()>=session.expireTime.getTime()) {
            deleteSession(key);
        }
    }
};

var deleteSession = function(key){
    if(!sessionManager[key]) return;
    var session = sessionManager[key];
    delete sessionManager[key];
    taskManager.closeQueue(key,true);
    if(uidBindSessionIdDic[session.uid+"-"+session.serverIndex]) delete uidBindSessionIdDic[session.uid+"-"+session.serverIndex];
};