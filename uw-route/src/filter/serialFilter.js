/**
 * Created by Administrator on 2015/6/8.
 */

var c_msgCode = require("uw-data").c_msgCode;
var consts = require("uw-data").consts;
var wrapResult = require('uw-utils').wrapResultFunc(__filename);
var getMsg = require("uw-utils").msgFunc(__filename);
var taskManager = require('../filter/taskManager');
var logger = require('uw-log').getLogger("uw-route", __filename);

exports.before = function(req, res, next){
    if (!req.uwRoute.sessionId || req.uwRoute.sessionId == "undefined") {
        return next();
    }
    taskManager.addTask(req.uwRoute.sessionId,function(task){
        req.uwRoute.serialTask = task;
        next();
    },function(){
        //超时
        //res.send(wrapResult("请求超时"));
        logger.error("请求超时1：req.uwRoute:%s",JSON.stringify(req.uwRoute));
    });
};

exports.after = function(req, res, next){
    var task = req.uwRoute.serialTask;
    if(task) {
        if(!task.done()) {
            logger.error("请求超时2：req.uwRoute:%s",JSON.stringify(req.uwRoute));
        }
    }
};