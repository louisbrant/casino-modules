var logger = require('uw-log').getLogger("uw-logger",__filename);
var util = require("util");
var BaseDao = require("uw-db").BaseDao;


function Dao(){
    BaseDao.call(this);
    this.Entity = require('uw-entity').RechargeEntity;
    this.getTodayCount = function(client, userId, cb){
        var strSql = "SELECT sum(payMoney) payMoney FROM uw_recharge WHERE userId = ? and rechargeTime>? and rechargeTime<?";
        var sTime = (new Date()).clearTime();
        var eTime = (new Date()).clearTime().addHours(24);
        client.query(strSql,[userId,sTime,eTime],function(err,data){
            if(err) return cb(err);
            var sum = data[0].payMoney||0;
            cb(err,sum) ;
        });
    };

    this.getAllCount = function(client, userId, startTime, endTime,cb){
        if(!startTime||!endTime) return cb(null,0);
        var strSql = "SELECT sum(payMoney) payMoney FROM uw_recharge WHERE userId = ? and rechargeTime>? and rechargeTime<?";
        client.query(strSql,[userId,startTime, endTime],function(err,data){
            if(err) return cb(err);
            var sum = data[0].payMoney||0;
            cb(err,sum) ;
        });
    };

    this.getRechargeDays = function(client, userId, startTime, endTime, payMoney,cb) {
        if (!startTime || !endTime) return cb(null, 0);
        var strSql = "SELECT COUNT(* ) days FROM (SELECT DATEDIFF(rechargeTime,?) days, SUM(payMoney) payMoneys FROM uw_recharge WHERE userId = ? and rechargeTime>? AND rechargeTime<?  GROUP BY days) a WHERE payMoneys >= ?";
        client.query(strSql, [startTime, userId, startTime, endTime, payMoney], function (err, data) {
            if (err) return cb(err);
            var days = data[0].days || 0;
            cb(null, days);
        });
    };
    this.getPeriodCount = function(client, userId, sTime, eTime, cb){
        var strSql = "SELECT sum(payMoney) payMoney FROM uw_recharge WHERE userId = ? and rechargeTime>? and rechargeTime<?";
        client.query(strSql,[userId,sTime,eTime],function(err,data){
            if(err) return cb(err);
            var sum = data[0].payMoney||0;
            cb(err,sum) ;
        });
    };
    this.getPeriodCountList = function(client, sTime, eTime, cb){
        var strSql = "SELECT sum(payMoney) todayRecharge, userId FROM uw_recharge WHERE rechargeTime>? and rechargeTime<? group by userId ORDER BY todayRecharge DESC";
        client.query(strSql,[sTime,eTime],function(err,dataList){
            if(err) return cb(err);
            cb(null,dataList);
        });
    };
    this.getMaxRechargeMoney = function(client, userId, startTime, endTime, cb) {
        var strSql = "SELECT MAX(payMoney) maxPayMoney FROM uw_recharge WHERE userId = ? and rechargeTime>? and rechargeTime<?";
        client.query(strSql,[userId,startTime,endTime],function(err,data){
            if(err) return cb(err);
            var maxPayMoney = data[0].maxPayMoney || 0;
            cb(null,maxPayMoney);
        });
    };
}
util.inherits(Dao,BaseDao);
module.exports = new Dao();