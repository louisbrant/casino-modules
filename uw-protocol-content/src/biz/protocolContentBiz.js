/**
 * Created by Administrator on 2014/5/9.
 */
var uwData = require("uw-data");
var formula = require("uw-formula");
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var consts = uwData.consts;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var protocolContentDao = require("./../dao/protocolContentDao");

var ds = require("uw-ds").ds;
var exports = module.exports;

/**
 * 获取协议内容
 * @param client
 * @param userId
 * @param cb
 */
exports.getInfo = function(client,cb){
    protocolContentDao.select(client, {isOpen:1}, function (err, data){
        if(err) return cb(err);
        return cb(null, data);
    });
};

/***********************************************************private***************************************************************/

