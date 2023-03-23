/**
 * Created by Administrator on 2014/5/16.
 */
var uwData = require("uw-data");
var c_msgCode = uwData.c_msgCode;
var consts = uwData.consts;
var getMsg = require("uw-utils").msgFunc(__filename);
var ds = require("uw-ds").ds;
var GameLoadEntity = require("uw-entity").GameLoadEntity;
var gameLoadDao = require("../dao/gameLoadDao");

var exports = module.exports;


/**
 * 增加加载记录,只记最高纪录
 * @param client
 * @param channelId
 * @param deviceId
 * @param moduleId
 * @param cb
 */
exports.addLoad = function(client,channelId,deviceId,moduleId,cb){
    if (!channelId || channelId.toString() == consts.localChannelId.toString()) return cb(null);
    gameLoadDao.select(client,{channelId:channelId,deviceId:deviceId,moduleId:moduleId},function(err,gameLoadData){
        if(err) return cb(err);
        if(gameLoadData){
            gameLoadData.count+=1;
            gameLoadDao.update(client,{count:gameLoadData.count},{id:gameLoadData.id},cb);
        }else{
            var entity = new GameLoadEntity();
            entity.channelId = channelId;
            entity.deviceId = deviceId;
            entity.moduleId = moduleId;
            entity.count = 1;
            gameLoadDao.insert(client,entity,cb);
        }
    });
};