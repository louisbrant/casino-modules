/**
 * Created by Administrator on 2014/5/16.
 */

var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var gameCommonDao = require("./../dao/gameCommonDao");
var GameCommonEntity = require('uw-entity').GameCommonEntity;

var uwData = require("uw-data");
var t_copy = uwData.t_copy;
var exports = module.exports;

var chatBiz;
var checkRequire = function(){
    chatBiz = chatBiz || require("uw-chat").chatBiz;
};

//计算最高副本
exports.calHighCopyId = function(client, userName,copyId ,cb){
    checkRequire();
    exports.getInfo(client,function(err,commonData){
        if(err) return cb(err);
        if(commonData.highCopyId>=copyId) return cb(null);
        commonData.highCopyId = copyId;
        var copyName = t_copy[copyId].name;
        //第一个%s：玩家名
        //第二个%s：普通副本名
        chatBiz.addSysData(15,[userName,copyName,copyId]);
        gameCommonDao.update(client, {highCopyId: commonData.highCopyId}, {id: commonData.id}, cb);
    });
};

/**
 * 获取数据
 * @param client
 * @param cb
 */
exports.getInfo = function (client, cb) {
    gameCommonDao.select(client, "1=1",[], function (err, commonData) {
        if (err) return cb(err);
        if (commonData) return cb(null, commonData);
        var commonEntity = new GameCommonEntity();
        gameCommonDao.insert(client, commonEntity, function (err, data) {
            if (err) return cb(err);
            commonEntity.id = data.insertId;
            cb(null, commonEntity);
        });
    });
};
