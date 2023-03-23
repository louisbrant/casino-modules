/**
 * Created by Administrator on 2014/5/16.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var c_prop = uwData.c_prop;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var userUtils = require("uw-user").userUtils;
var couponDao = require("./../dao/couponDao");
var userCouponDao = require("./../dao/userCouponDao");
var userDao = require("uw-user").userDao;
var accountDao = require("uw-account").accountDao;
var project = require("uw-config").project;
var UserCouponEntity = require("uw-entity").UserCouponEntity;

var mainClient = require("uw-db").mainClient;
var loginClient = require("uw-db").loginClient;

var ds = require("uw-ds").ds;

var exports = module.exports;

var mailBiz = null;

var checkRequire = function(){
    mailBiz = require("uw-mail").mailBiz;
};

/**
 * 使用兑换码。
 * @param client
 * @param userId
 * @param accountId
 * @param code
 * @param cb
 */
exports.use = function (client, userId, accountId ,code, cb) {
    checkRequire();

    async.parallel([
            function (cb1) {
                couponDao.select(mainClient, {code: code}, cb1);
            },
            function (cb1) {
                userDao.select(client, {id:userId}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            var couponData = data[0], userData = data[1];
            //判断是否存在
            if (!couponData) return cb(getMsg(c_msgCode.noCdKey));
            var nowDate = new Date();
            //判断是否过期
            if (couponData.startTime.isAfter(nowDate) || couponData.endTime.isBefore(nowDate))  return cb(getMsg(c_msgCode.noCdKey));
            //判断是否已经被使用
            if (couponData.isUsed) return cb(getMsg(c_msgCode.cdKeyRedeemed));
            if (couponData.period != 0) {//领取周期限制
                var reviewData = userData.record[c_prop.userRecordTypeKey.coupon] || {};
                var reviewDate = null;
                if (reviewData[couponData.name]) {
                    reviewDate = new Date(reviewData[couponData.name]);
                }
                if (reviewDate) {
                    var diffDay = _getDiffDay(reviewDate, new Date());
                    if (diffDay < couponData.period) {
                        return cb("该类型兑换码," + couponData.period + "天内仅可领取一次");
                    }
                }
                reviewDate = new Date();
                reviewData[couponData.name] = reviewDate;
                userData.record[c_prop.userRecordTypeKey.coupon] = reviewData;
            }
            if(!couponData.isNew) {//兼容老的
                async.parallel([
                    function (cb1) {
                        couponDao.selectCols(mainClient, " id ", {name: couponData.name, accountId: accountId}, cb1);
                    },
                    function (cb1) {
                        accountDao.select(loginClient, {id: userData.accountId}, cb1);
                    }
                ], function (err, data) {
                    if (err) return cb(err);
                    var sameCouponData = data[0], accountData = data[1];
                    //判断是否已经领取同类
                    if (sameCouponData && couponData.type == consts.couponType.once)  return cb(getMsg(c_msgCode.alreadyGetcdKey));

                    //判断渠道限制
                    if (couponData.channelId) {
                        if (couponData.channelId != accountData.sdkChannelId)   return cb(getMsg(c_msgCode.noCdKey));
                    } else {
                        if (couponData.channelIds.length > 0) {
                            if (couponData.channelIds.indexOf(accountData.sdkChannelId) < 0) return cb(getMsg(c_msgCode.noCdKey));
                        }
                    }


                    //通过邮件发送
                    /*
                     //英雄，钻石，挑战券
                     //{hero:{"id":num,..},diamond:100,wipeItem:100}
                     var items = couponData.items;
                     userUtils.saveItems(userData,items);
                     var getGold = userUtils.getNumOfItems(items,c_prop.itemTypeKey.gold);
                     var getDiamond = userUtils.getNumOfItems(items,c_prop.itemTypeKey.diamond);

                     var updateData = {
                     gold: userData.gold,
                     diamond: userData.diamond,
                     buyDiamond:userData.buyDiamond,
                     giveDiamond:userData.giveDiamond,
                     prestige: userData.prestige,
                     bag: userData.bag,
                     equipBag: userData.equipBag
                     };*/

                    var updateData = {
                        record: userData.record
                    };

                    //mailBiz.

                    //得到物品,更新使用记录
                    async.parallel([
                        function (cb1) {
                            //userDao.update(client, updateData,{id:userId}, cb1);
                            mailBiz.addByType(client, userId, c_prop.mailTypeKey.coupon, [], couponData.items, cb1);
                        },
                        function (cb1) {
                            couponDao.update(mainClient, {
                                isUsed: 1,
                                userId: userId,
                                serverId: 0,
                                accountId: accountId
                            }, {id: couponData.id}, cb1);
                        },
                        function (cb1) {
                            if (couponData.period != 0) {
                                userDao.update(client, updateData, {id: userId}, cb1);
                            } else {
                                cb1(null);
                            }
                        }
                    ], function (err, data) {
                        if (err) return cb(err);
                        cb(null, [updateData]);
                    });
                });
            }else {//新的兑换码机制
                async.parallel([
                    function (cb1) {
                        userCouponDao.selectCols(client, " id ", {codeName: couponData.name, userId: userId}, cb1);
                    },
                    function (cb1) {
                        accountDao.select(loginClient, {id: userData.accountId}, cb1);
                    }
                ], function (err, data) {
                    if(err) return cb(err);
                    var userCoupon = data[0];
                    var accountData = data[1];
                    //判断是否已经领取同类
                    if (userCoupon)  return cb(getMsg(c_msgCode.alreadyGetcdKey));
                    //判断渠道限制
                    if (couponData.channelId) {
                        if (couponData.channelId != accountData.sdkChannelId)   return cb(getMsg(c_msgCode.noCdKey));
                    } else {
                        if (couponData.channelIds.length > 0) {
                            if (couponData.channelIds.indexOf(accountData.sdkChannelId) < 0) return cb(getMsg(c_msgCode.noCdKey));
                        }
                    }
                    var updateData = {
                        record: userData.record
                    };
                    //得到物品,更新使用记录
                    async.parallel([
                        function (cb1) {
                            //userDao.update(client, updateData,{id:userId}, cb1);
                            mailBiz.addByType(client, userId, c_prop.mailTypeKey.coupon, [], couponData.items, cb1);
                        },
                        function (cb1) {
                           /* userCouponDao.update(client, {
                                isUsed: 1,
                                userId: userId,
                                serverId: 0,
                                accountId: accountId
                            }, {id: couponData.id}, cb1);*/
                            if(couponData.type == consts.couponType.once){
                                var userCoupon = new UserCouponEntity();
                                userCoupon.codeName = couponData.name;
                                userCoupon.userId = userId;
                                userCouponDao.insert(client, userCoupon, cb1);
                            }else {
                                cb1(null);
                            }
                        },
                        function (cb1) {
                            if (couponData.period != 0) {
                                userDao.update(client, updateData, {id: userId}, cb1);
                            } else {
                                cb1(null);
                            }
                        }
                    ], function (err, data) {
                        if (err) return cb(err);
                        cb(null, [updateData]);
                    });
                });
            }
        }
    );
};


var _getDiffDay = function(startTime, endTime) {
    if(!startTime){
        startTime = new Date();
    }
    return startTime.clone().clearTime().getDaysBetween(endTime.clone().clearTime());
};

