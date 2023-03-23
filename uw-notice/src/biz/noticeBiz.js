/**
 * Created by Administrator on 2014/5/16.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var propUtils = require("uw-utils").propUtils;
var noticeDao = require("./../dao/noticeDao");
var project = require('uw-config').project;
g_notice = require("uw-global").g_notice;

var ds = require("uw-ds").ds;

var exports = module.exports;

/**
 * 获取新公告
 * @param client
 * @param cb
 */
exports.getNewOne = function (client,  cb) {
    noticeDao.select(client, {isOpen:1, iconType:3}, function (err, data) {
        if (err) return cb(err);
        return cb(null, data);
    });
};

/**
 * 获取公告列表
 * @param client
 * @param cb
 */
exports.getList = function (client,  cb) {
    var serverId = parseInt(project.serverId);
    var isInit = g_notice.isInit();
    if(!isInit) {
        var returnList = g_notice.getNoticeList(serverId);
        return cb(null, returnList);
    }
    noticeDao.list(client, " isOpen = ? and iconType != ? order by sort desc",[1,3], function (err, noticeList) {
        if (err) return cb(err);
        g_notice.setNoticeList(noticeList);
        //筛选有效公告
        var list = [].concat(noticeList);
        for (var i = 0; i < list.length; i++) {
            var locNoticeData = list[i];
            var serverIdArr = locNoticeData.serverIdArr||[];
            if(serverIdArr.length > 0 && serverIdArr.indexOf(serverId)<0){
                list.splice(i, 1);
                i--;
            }
        }
        cb(null, list);
    });
};
