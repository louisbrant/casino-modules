/**
 * Created by Administrator on 2016/4/8.
 */

var uwClient = require("uw-db").uwClient;
var async = require("async");
var logger = require('uw-log').getLogger("uw-logger", __filename);
var guildWarRecordDao = require("../dao/guildWarRecordDao");
var GuildWarRecordEntity = require("uw-entity").GuildWarRecordEntity;
var g_guildWar = require("uw-global").g_guildWar;
var project = require("uw-config").project;
var exports = module.exports;


exports.getTodayRecord = function(client,cb){
    guildWarRecordDao.select(client,"recordTime>? ",[(new Date()).clearTime()],cb);
};

exports.getLastRankData = function(client,cb){
    guildWarRecordDao.selectCols(client,"id,lastRankData"," 1=1 order by recordTime desc",[],function(err,data){
        if(err) return cb(err);
        if(!data) return cb(null);
        cb(null,data);
    });
};

//初始化本服报名的行会
exports.saveLastRankData = function(client,lastRankData,cb){
    exports.getLastRankData(client,function(err,guildWarRecordData){
        if(err) return cb(err);
        if(!guildWarRecordData ) return cb(null);
        guildWarRecordDao.update(client,{lastRankData:lastRankData},{id:guildWarRecordData.id},cb);
    });
};


exports.timeSaveRecord = function(client,cb){
    if(!g_guildWar.isOpen()) return cb(null);
    var saveObj = {};
    var myObj = g_guildWar.getMyObj();
    myObj = JSON.parse(JSON.stringify(myObj));
    delete myObj._guildWarGroupDic;
    delete myObj._guildWarUserGroupDic;
    delete myObj._guildWarDefenceRecordDic;
    delete myObj._guildWarAttackRecordDic;

    saveObj[project.serverId] = myObj;
    exports.saveRecord(client,saveObj,cb);
};

//初始化本服报名的行会
exports.saveRecord = function(client,recordData,cb){
    guildWarRecordDao.select(client,"recordTime>? ",[(new Date()).clearTime()],function(err,guildWarRecordData){
        if(err) return cb(err);
        if(!guildWarRecordData){
            guildWarRecordData = new GuildWarRecordEntity();
            guildWarRecordData.recordData = recordData;
            guildWarRecordData.recordTime = new Date();
            guildWarRecordDao.insert(client,guildWarRecordData,cb);
        }else{
            guildWarRecordDao.update(client,{recordData:recordData,recordTime:new Date()},{id:guildWarRecordData.id},cb);
        }
    });
};
