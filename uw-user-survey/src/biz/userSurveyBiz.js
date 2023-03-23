/**
 * Created by John on 2016/6/4.
 */
var uwData = require("uw-data");
var userDao = require("uw-user").userDao;
var userSurveyDao = require("../dao/userSurveyDao")
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var c_msgCode = uwData.c_msgCode;
var project = require('uw-config').project;
var UserSurveyEntity = require("uw-entity").UserSurveyEntity;
var mainClient = require("uw-db").mainClient;

var activityDao = null;
var checkRequire = function () {
    activityDao = activityDao || require("uw-activity").activityDao;
}

var exports = module.exports = {};
/***
 * 上报用户调研数据
 *
 */
exports.report= function(client,activityId,userId,report, cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.select(client, {id:userId}, cb1);
        },
        function (cb1) {
            activityDao.select(client, {id: activityId, isOpen: 1}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0], activityData = data[1];
        if (!activityData)  return cb(getMsg(c_msgCode.activitiesEnd));//活动不存在，或者未开启
        //判断是否已经领取
        var recive = userData.activity[activityId] || 0;
        if(recive){
            return cb(getMsg(c_msgCode.activitiesEnd));
        }
        var exValues = activityData.exValues; //题目库

        //校验上报数据
        for(var index in exValues){
            var qId = exValues[index];
            if(!report[qId] || typeof report[qId] != "object"){
                return cb("上报数据有误");
            }
        }
        var insertList = [];
        for(var qId in report){
            var ans = report[qId];
            for(var i=0; i<ans.length;i++){
                var userSurveyEntity = new UserSurveyEntity();
                userSurveyEntity.questionId = parseInt(qId);
                userSurveyEntity.serverId = project.serverId;
                userSurveyEntity.userId = userId;
                userSurveyEntity.userVip = userData.vip;
                userSurveyEntity.activityId = activityId;
                userSurveyEntity.userLvl = userData.lvl;
                userSurveyEntity.selectIndex = parseInt(ans[i]);
                insertList.push(userSurveyEntity);
            }
        }
        userSurveyDao.insertList(mainClient,insertList, function(err, data){
            if(err) return cb(err);
            userData.activity[activityId] = 2;
            var update = {
                activity: userData.activity
            };
            userDao.update(client, update, {id: userId}, function(err, data){
                if(err) return cb(err);
                cb(null, data);
            });
        })
    });
};