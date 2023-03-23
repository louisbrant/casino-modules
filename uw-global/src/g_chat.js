/**
 * Created by Administrator on 2015/9/18.
 */
var ds = require("uw-ds").ds;
var c_prop = require("uw-data").c_prop;
var c_game = require("uw-data").c_game;
var c_chatSys = require("uw-data").c_chatSys;
var g_area = require("./g_area.js");

//聊天缓存
var chatListCache = [];
var uid = 0;
var lastSysMsgid = -1;
var intervalIds = [];

var gid = {};
var chatGuildCache = {};//{guildId:[],guildId:[],...}

var isSending = false;//

/**
 * 增加系统消息
 * @param id
 * @param args
 */
exports.addSysData =  function(id,args){
    uid++;
    _pushChatData(new ds.ChatData(uid,c_prop.chatTypeKey.sys,[id].concat(args)));
    _updateSend();
};

/**
 * 增加系统消息
 * @param id
 * @param args
 */
exports.addLotteryData =  function(id,args){
    uid++;
    _pushChatData(new ds.ChatData(uid,c_prop.chatTypeKey.lottery,[id].concat(args)));
    _updateSend();
};

/**
 * 增加公会探宝消息
 * @param id
 * @param args
 */
exports.addGuildLotteryData =  function(id,args){
    uid++;
    _pushChatData(new ds.ChatData(uid,c_prop.chatTypeKey.guildLottery,[id].concat(args)));
    _updateSend();
};


/**
 * 增加用户消息
 * @param userName
 * @param vip
 * @param content
 * @param isGM
 * @param guildName
 */
exports.addUserData =  function(userName, vip, content, isGM,guildName,medalTitle, isLittleHorn){
    uid++;
    var medal = 0;
    if(medalTitle && medalTitle != 0) medal = medalTitle;
    var returnArr = [userName,vip,content,isGM,guildName,medal, isLittleHorn];
    _pushChatData(new ds.ChatData(uid,c_prop.chatTypeKey.user,null,returnArr));
    _updateSend();
};

/**
 * 增加公会消息
 * @param guildId
 * @param userName
 * @param vip
 * @param position
 * @param content
 */
exports.addGuildData =  function(guildId,userName,vip,position,content,medalTitle){
    if(!gid[guildId]) gid[guildId] = 0;
    gid[guildId] +=1;
    var medal = 0;
    if(medalTitle && medalTitle != 0) medal = medalTitle;
    var returnArr = [userName,vip,position,content,medal];
    _pushChatGuildData(guildId,new ds.ChatData(gid[guildId],c_prop.chatTypeKey.guild,null,null,null,returnArr));
};

/**
 * 获取列表
 * @returns [ds.ChatData]
 */
exports.getList = function(){
    return chatListCache;
};

/**
 * 获取公会列表
 * @returns [ds.ChatData]
 */
exports.getGuildList = function(guildId){
    return chatGuildCache[guildId]||[];
};

/**
 * 获取当前的uid
 * @returns {number}
 */
exports.getCurUID = function(){
    return uid;
};

/**
 * 获取当前的gid
 * @returns {number}
 */
exports.getCurGID = function(guildId){
    return gid[guildId]||0;
};

/**
* 获取当前系统消息id
*/
exports.getLastSysMsgId = function() {
    return lastSysMsgid;
};

exports.setLastSysMsgId = function(id) {
    lastSysMsgid = id;
};

exports.calIntervalData = function(){
    for(var i = 0;i<intervalIds.length;i++){
        var locId = intervalIds[i];
        var locData = c_chatSys[locId];
        exports.addSysData(locId,locData.arg||[]);
    }
};


var _pushChatData = function(chatData){
    chatListCache.push(chatData);
    _limitCacheLength();
};

var _pushChatGuildData = function(guildId,chatData){
    if(!chatGuildCache[guildId]) chatGuildCache[guildId] = [];
    chatGuildCache[guildId].push(chatData);
    _limitGuildCacheLength(guildId);
};


var _initIntervalIds = function(){
    for(var key in c_chatSys){
        var locData = c_chatSys[key];

        if(locData.type == 1){
            intervalIds.push(locData.id);
        }
    }
};

var _limitCacheLength = function(){
    if(chatListCache.length>c_game.chatCfg[2]){
        chatListCache.shift();
    }
};

var _limitGuildCacheLength = function(guildId){
    if(chatGuildCache[guildId].length>c_game.chatCfg[2]){
        chatGuildCache[guildId].shift();
    }
};


var _updateSend = function(){
    if(isSending) return;
    isSending = true;
    setTimeout(_sendNewMsg,500);
};

var _sendNewMsg = function(){
    g_area.pushMsg(c_prop.receiverKey.chat,{v:uid},function(){});
    isSending = false;
};

_initIntervalIds();
