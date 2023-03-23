/**
 * Created by Administrator on 13-10-28.
 */

var pomelo = require("pomelo");
var logger = require('uw-log').getLogger("uw-logger",__filename);
var proto = module.exports;

var commonUtils = require("uw-utils").commonUtils;


var CHANNEL_KEY = "mainArea";
var userMap = {};//所有用户
var app = null;//程序体，用来获取全局参数
var channel = null;//主频道，用来发送信息用


proto.init = function(app,opts) {
    this.app = app;
};

//获取频道
proto.getChannel= function() {
    if(channel) return channel;
    var channelService = proto.getChannelService();
    if(channelService) channel = channelService.getChannel(CHANNEL_KEY, true);
    return channel;
};

proto.getChannelService = function(){
    if(!pomelo||!pomelo.app) return null;
    return pomelo.app.get('channelService');
};

/**
 * 增加用户
 * @param userData
 */
proto.addUser = function(userData){
    userMap[userData.id] = userData;
    var channel = this.getChannel();
    if(channel) channel.add(userData.aid, userData.sid);

};

/**
 * 获取用户信息
 * @param userId
 * @returns {UserData}
 */
proto.getUserData = function(userId){
    return userMap[userId]||{};
};

/**
 * 移除用户
 * @param userId
 */
proto.removeUser = function(userId){
    var userData = userMap[userId];
    if(!userData){
        logger.error("不存在该用户[id:"+userId+"]信息") ;
        return;
    }
    //退出时间
    var reSeconds = parseInt((Date.now()-userData.loginTime)/1000);
    var reTime = commonUtils.secondsToDHMS(reSeconds);
    logger.debug("用户[%d]在线时长：%d天%d时%d分%d秒",userData.id,reTime[0],reTime[1],reTime[2],reTime[3]);

    delete userMap[userId];
    var channel = this.getChannel();
    if(channel) channel.leave(userData.aid, userData.sid);
};

//获取所有用户
proto.getUserMap = function(){
    return userMap;
};

//获取所有用户总数
proto.getUserCount = function(){
    return Object.keys(userMap).length;
};

/**
 * 获取某渠道的用户数
 * @param channelId
 * @returns {number}
 */
proto.getChannelUserCount = function(channelId){
    var count = 0;
    for(var key in userMap){
        var locUser = userMap[key];
        if(locUser.channelId == channelId){
            count++;
        }
    }
    return count;
};

/**
 * 推送所有人信息
 * @param route 路由a.a.a
 * @param msg
 * @param cb
 */
proto.pushMsg = function(route, msg, cb){
    var channel = this.getChannel();
    if(channel) channel.pushMessage(route,msg, cb);
};

/**
 * 推送信息给某人
 * @param route
 * @param msg
 * @param userId
 * @param cb
 */
proto.pushMsgById = function(route, msg, userId,cb){
    var userData = userMap[userId];
    if(!userData){
        logger.debug("不存在该用户[id:"+userId+"]信息") ;
        return cb(null);
    }
    var channelService = this.getChannelService();
    if(channelService) channelService.pushMessageByUids(route, msg,[{uid: userData.aid,sid: userData.sid}],cb);
};

/**
 * 推送信息给某些人
 * @param route
 * @param msg
 * @param userIds
 * @param cb
 */
proto.pushMsgByIds = function(route, msg, userIds,cb){
    var params = [];
    for(var i = 0;i<userIds.length;i++){
        var userId = userIds[i];
        var userData = userMap[userId];
        if(userData) params.push({uid: userData.aid,sid: userData.sid});
    }
    var channelService = this.getChannelService();
    if(channelService) channelService.pushMessageByUids(route, msg,params,cb);
};
/**
 * 用户信息map
 * @type {{}}
 */
proto.userMap = userMap;



