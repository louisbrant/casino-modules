/**
 * Created by Administrator on 14-10-30.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
var rechargeDao = require("uw-recharge").rechargeDao;

var async = require('async');
var RechargeEntity = require("uw-entity").RechargeEntity;
var RechargeData = require("uw-ds").ds.RechargeData;
var uwData = require("uw-data");
var mailBiz = require("uw-mail").mailBiz;
var c_recharge = uwData.c_recharge;
var c_msgCode = uwData.c_msgCode;
var c_prop = uwData.c_prop;
var consts = uwData.consts;
var getMsg = require("uw-utils").msgFunc(__filename);
var userUtils = require("uw-user").userUtils;
var bonusBiz = require("uw-bonus-share").bonusBiz;

var projectCfg = require("uw-config").project;

var userDao;
var activityDao = null;
var activityBiz = null;
var checkRequire = function(){
    userDao = userDao || require("uw-user").userDao;
    activityDao = activityDao || require("uw-activity").activityDao;
    activityBiz = activityBiz || require("uw-activity").activityBiz;
};

/**
 * 获取充值记录信息
 * @param client
 * @param userId
 * @param cb
 */
exports.getInfo = function (client, userId, cb) {
    async.parallel([
        function (cb1) {
            var sqlStr = "select rechargeId, count(rechargeId) count from uw_recharge where userId = ? GROUP BY rechargeId"
            client.query(sqlStr, [userId], function (err, list) {
                if (err) return cb1(err);
                var countMap = {};
                for (var i = 0, li = list.length; i < li; i++) {
                    var itemi = list[i];
                    countMap[itemi.rechargeId] = itemi.count;
                }
                cb1(null, countMap);
            });
        },
        function (cb1) {
            var sqlStr = "select * from uw_recharge where userId = ? and effTime is not null ORDER BY effTime desc"
            client.query(sqlStr, [userId], function (err, list) {
                if (err) return cb1(err);
                var now = new Date();
                var cardTimeMap = {};
                for (var i = 0, li = list.length; i < li; i++) {
                    var itemi = list[i];
                    if (cardTimeMap[itemi.rechargeId]) continue;
                    var endTime = itemi.effTime.clone();
                    endTime.clearTime();
                    //以前是直接加一个月，现在是加30天 for bug 726
                    //endTime.addMonths(1);//间隔一个月
                    endTime.addDays(30);
                    if (endTime.isAfter(now))
                        cardTimeMap[itemi.rechargeId] = [itemi.rechargeTime, itemi.effTime, endTime];
                }
                cb1(null, cardTimeMap);
            });
        }
    ], function (err, results) {
        if (err) return cb(err);
        cb(null, new RechargeData(results[0], results[1]));
    });
};

/**
 * 充值
 * @param client
 * @param userId
 * @param rechargeId
 * @param channelId
 * @param receiptData
 * @param cb
 */
exports.recharge = function (client, userId, rechargeId, channelId, receiptData, cb) {
    checkRequire();
    var rechargeTemp = c_recharge[rechargeId];//获取到充值项数据
    exports.canRecharge(client, userId, rechargeId, function (err, effTime) {
        if (err) return cb(err);
        _validIAP(client, channelId, receiptData, function(err,transId){
            if (err) return cb(err);
            _rechargeDiamond(client, userId, rechargeId, channelId,transId,effTime, function(err,data){
                if (err) return cb(err);
                return cb(data[0]);
            });
        });
    });
};

/**
 * 充值
 * @param client
 * @param userId
 * @param rechargeId
 * @param channel
 * @param transId
 * @param cb
 */
exports.rechargeNotValid = function (client, userId, rechargeId, channel, transId, cb) {
    checkRequire();
    var rechargeTemp = c_recharge[rechargeId];//获取到充值项数据
    exports.canRecharge(client, userId, rechargeId, function (err, effTime) {
        if (err) return cb(err);
        _rechargeDiamond(client, userId, rechargeId, channel,transId,effTime, function(err,data){
            if (err) return cb(err);
            return cb(null,data);
        });
    });
};


exports.canRecharge = function(client, userId, rechargeId, cb) {
    var rechargeTemp = c_recharge[rechargeId];//获取到充值项数据
    var isCard = !!rechargeTemp.daily;//判断是否是月卡
    if (!isCard) return cb();
    rechargeDao.list(client, "userId = ? and effTime is not null order by effTime desc", [userId], function (err, list) {
        if (err) return cb(err);
        var now = new Date();
        var now2 = new Date();
        now2.clearTime();
        var maxEndTime;//最大的一个endTime
        for (var i = 0, li = list.length; i < li; i++) {
            var itemi = list[i];
            var endTime = itemi.effTime.clone();
            endTime.clearTime();//00:00
            //以前是直接加一个月，现在是加30天 for bug 726
            //endTime.addMonths(1);//间隔一个月
            endTime.addDays(30);
            if (!endTime.isAfter(now)) continue;//已经过期了
            if (!maxEndTime) maxEndTime = endTime;
            else if (maxEndTime.isBefore(endTime)) maxEndTime = endTime;
        }
        if (!maxEndTime) {
            cb(null, now);
        } else {
            var days = (maxEndTime.getTime() - now2.getTime()) / (24 * 60 * 60 * 1000);//还有多少天到期
            if (days <= 5) {
                cb(null, maxEndTime);
            } else {
                cb(getMsg(c_msgCode.cantRenew));
            }
        }

    });
};



/**********************************************************private**************************************************************/

var _rechargeDiamond = function(client, userId, rechargeId, channelId, transId,effTime,cb){
    var rechargeTemp = c_recharge[rechargeId];//获取到充值项数据
    async.parallel([
        function (cb1) {
            userDao.select(client, {id:userId} , cb1);
        },
        function (cb1) {
            rechargeDao.count(client, {userId: userId, rechargeId: rechargeId}, cb1);
        },
        function (cb1) {
            rechargeDao.count(client, {userId: userId}, cb1);
        },
        function(cb1) {
            activityDao.select(client, {type: c_prop.activityTypeKey.singleCharge, isOpen: 1}, cb1);
        }
    ], function (err, results) {
        if (err) return cb(err);
        var userData = results[0];
        var rechargeCount = results[1];
        var allCount = results[2];
        var activityData = results[3];

        var addDiamond = rechargeTemp.diamond;//充值金额
        var userUpdate = {};

        userUtils.addVipExpc(userData,addDiamond);//vip积分
        userUpdate.vipScore = userData.vipScore;//vip积分
        userUpdate.vip = userData.vip;//计算出vip等级

        //第一次充值判断是否3倍
        if (allCount <= 0 && rechargeTemp.isTreble) {
            addDiamond += rechargeTemp.diamond * 2;
        }

        addDiamond += rechargeCount > 0 ? rechargeTemp.extra : rechargeTemp.first;//计算上额外送的

        userUtils.addDiamond(userData,addDiamond,consts.diamondGainType.recharge_1,rechargeId);
        userUpdate.diamond = userData.diamond;
        userUpdate.giveDiamond = userData.giveDiamond;
        userUpdate.buyDiamond = userData.buyDiamond;
        //支付回调,添加充值
        async.parallel([
            function (cb1) {
                userDao.update(client, userUpdate,{id:userId} , cb1);
            },
            function (cb1) {
                var rechargeEntity = new RechargeEntity();
                rechargeEntity.userId = userId;
                rechargeEntity.rechargeId = rechargeId;
                rechargeEntity.diamond = rechargeTemp.diamond||0;
                rechargeEntity.rechargeTime = new Date();
                rechargeEntity.channelId = channelId;
                rechargeEntity.transId = transId;
                rechargeEntity.effTime = effTime;
                rechargeEntity.userLvl = userData.lvl;
                rechargeEntity.currency = "CNY";
                rechargeEntity.payMoney = rechargeTemp.cost;
                rechargeDao.insert(client, rechargeEntity, cb1);
            },
            function(cb1) {//单笔充值
                if (!activityData||activityData.startTime.isAfter(new Date())||activityData.endTime.isBefore(new Date())){
                    cb1(null);//活动结束
                }else{
                    var arr = activityData.exValues;
                    var items = activityData.items;
                    var tempCount = 0;
                    var tempList = [];
                    for(var i = 0; i < arr.length; i++) {
                        if (rechargeTemp.diamond >= arr[i]) {
                            //发送邮件
                            var mailEntity = mailBiz.createEntityByType(userId, c_prop.mailTypeKey.temp5, [], items[i]);
                            mailEntity.addTime = new Date();
                            tempList.push(mailEntity);
                            tempCount++;
                        }else {
                            break;
                        }
                    }

                    mailBiz.addMailByList(client,tempList,cb1);

                }
            }
        ], function(err,data){
            if(err) return cb(err);
            bonusBiz.inviteeCharge(client, userId, rechargeTemp.diamond, function(){});
            activityBiz.dayRecharge(client, userData,function(){});
            var insertId = data[1].insertId;
            cb(null,[userUpdate,addDiamond]);
        });
    });
};

var _validIAP = function (client, channel, receiptData, cb) {
    if (!projectCfg.isValidIAP) {
        return cb(null);
    }
    if (receiptData) {
        //苹果验证
        appStoreBiz.verifyReceipt(projectCfg.isSandBox, receiptData, function (err, transaction_id) {
            if (err) return cb(err);
            rechargeDao.select(client,{channel:channel,transId:transaction_id},function(err,data){
               if(err) return cb(err);
               if(data) return cb("已经成功充值");//防重复提交的
               cb(null,transaction_id);
            });
        });
    } else {
        //todo 其他验证
        return cb("验证失败");
    }
};

/*if(require.main = module){
    checkRequire();
    _rechargeDiamond(require("uw-db").uwClient, 167773, 7, null, null, null, function(err, data){console.log(err)})
}*/
