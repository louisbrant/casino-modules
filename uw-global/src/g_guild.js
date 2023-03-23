/**
 * Created by Administrator on 14-9-25.
 */
var uwClient = require("uw-db").uwClient;
var async = require('async');
var logger = require('uw-log').getLogger("uw-logger", __filename);
var guildUtils;
var guildDao;
var checkRequire = function(){
    guildUtils = require("uw-guild").guildUtils;
    guildDao = require("uw-guild").guildDao;
};

//公会缓存
var __guildCache = {};
var __updateIdList = [];
var __isUpdating = false;

//清除僵尸行会
var __isDel = false;

var GuildData = function(){
    this.guild = null;//公会数据
    this.pkProp = null;//战斗属性 todo 目前没用
};

/**
 * 初始化
 */
exports.init = function (cb) {
    checkRequire();
    guildDao.list(uwClient,"1=1",[],function(err,guildList){
        if(err) return cb(err);
        for(var i = 0;i<guildList.length;i++){
            var locGuild = guildList[i];
            //var lastLgTime = locGuild.lastLgTime;
            //if(!lastLgTime){
            //    locGuild.lastLgTime = new Date();
            //    exports.setGuild(locGuild.id,locGuild);
            //}
            var gData = new GuildData();
            gData.guild = locGuild;
            //gData.pkProp = guildUtils.calPkProp(locGuild);
            __guildCache[locGuild.id] = gData;
        }
        cb();
    });
};

//获得公会
exports.getGuild = function(guildId){
    var data = __guildCache[guildId];
    if(!data) return null;
    return data.guild;
};

//获得公会名称
exports.getGuildName = function(guildId){
    var guild = exports.getGuild(guildId);
    if(!guild) return "";
    return guild.name;
};


//设置公会
exports.setGuild = function(guildId,guild){
    var data = __guildCache[guildId];
    if(!data) {
        data = new GuildData();
        data.guild = guild;
        //data.pkProp = guildUtils.calPkProp(guild);
        __guildCache[guildId] =data;
    }
    data.guild = guild;

    if(__updateIdList.indexOf(guildId)<0){
        __updateIdList.push(guildId);
    }
};

//获得公会pk属性
exports.getPkProp = function(guildId){
    var data = __guildCache[guildId];
    if(!data) return data;
    return data.pkProp;
};

//重新计算公会pk属性
exports.reCalPkProp = function(guildId){
    var data = __guildCache[guildId];
    if(!data) return null;
    //data.pkProp = guildUtils.calPkProp(data.guild);
};

//如果有公会数据更新，则同步
exports.guildSys = function(){
    if(__isUpdating) return;
    __isUpdating = true;
    var updateGuildList = [];
    for(var i = 0;i<__updateIdList.length;i++){
        var locId = __updateIdList[i];
        var locGuild = exports.getGuild(locId);
        if(!locGuild) continue;
        updateGuildList.push(locGuild);
    }
    __updateIdList.length = 0;
    async.map(updateGuildList,function(guildData,cb1){
        guildDao.update(uwClient,guildData,{id:guildData.id},function(err,data){
            if(err) {
                logger.error("工会同步数据失败！");
                logger.error(err);
            }
            cb1(null);
        });
    },function(err,data){
        if(err) {
            logger.error("工会同步数据失败！");
            logger.error(err);
        }
        __isUpdating = false;
    });
};

//获取所有缓存
exports.getCache = function(){
    return __guildCache;
};
/****************************************************************/

//清除公会
exports.clearGuild = function(delIdList){
    var updateGuildList = [];
    for(var i = 0;i<delIdList.length;i++){
        var locId = delIdList[i][0];
        var locGuild = exports.getGuild(locId);
        if(!locGuild) continue;
        updateGuildList.push(locGuild);
    }
    delIdList.length = 0;
    async.map(updateGuildList,function(guildData,cb1){
        var nowTime = new Date();
        var lastLgTime = guildData.lastLgTime;
        if(lastLgTime){
            var dayCount = countDay(lastLgTime,nowTime);
            if(dayCount > 15) {
                delete __guildCache[guildData.id];
                guildDao.del(uwClient,{id:guildData.id},cb1);
            }
        }else{
            async.setImmediate(function () {
                cb1();
            });
        }
    },function(err,data){
        if(err) {
            logger.error("工会同步数据失败！");
            logger.error(err);
        }
    });
};

var countDay = function(start,end){
    var dif = end.getTime() - start.getTime();
    var day = Math.floor(dif / (1000 * 60 * 60 * 24));
    return day;
};