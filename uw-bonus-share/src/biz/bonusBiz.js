var bonusShareDao = require("./../dao/bonusShareDao");
var bonusRelationDao = require("./../dao/bonusRelationDao");
var bonusEventDao = require("./../dao/bonusEventDao");
var bonusDrawDao = require("./../dao/bonusDrawDao");
var uwData = require("uw-data");
var c_prop = uwData.c_prop;
var c_msgCode = uwData.c_msgCode;
var project = require('uw-config').project;
var md5Utils = require("uw-utils").md5Utils;
var async = require("async");
var exports = module.exports;

var mailBiz;
var userUtils;
var userDao;

var secret = "yiakd23hsdas";//默认key值

var checkRequire = function(){
    userUtils = require("uw-user").userUtils;
    userDao = require("uw-user").userDao;
    mailBiz = require("uw-mail").mailBiz;
};


exports.getShareKey = function(userId, serverIndexId) {
    return md5Utils.md5(secret, userId + '|' + serverIndexId);
}

function getShareUrl(shareKey, serverIndexId) {
    return project.bonusShareUrl + '?shareKey=' + shareKey + '&area=' + serverIndexId;
}

/**
 * [logDraw description]
 * @param  client
 * @param  userId
 * @param  beforeDraw 提取之前的diamond
 * @param  balance    此次增加的diamond
 * @return
 */
function logDraw(client, userId, beforeDraw, balance) {
    var data = {
        userId: userId,
        drawAmount: balance,
        beforeDraw: beforeDraw,
        afterDraw: beforeDraw + balance,
        createTime: new Date().toFormat("YYYY-MM-DD HH24:MI:SS")
    };
    bonusDrawDao.insert(client, data, function(){});
}

/**
 * [logEvent description]
 * @param  client
 * @param  userId        下家UserId
 * @param  inviterUserId 上家UserId
 * @param  eventType     事件类型：LEVELUP, RECHARGE
 * @param  reference     升级或充值对应的值
 * @param  shareAmount   贡献给上家的金额
 * @return
 */
function logEvent(client, userId, inviterUserId, eventType, reference, shareAmount) {
    var data = {
        userId: userId,
        inviterUserId: inviterUserId,
        eventType: eventType,
        reference: reference,
        shareAmount: shareAmount,
        createTime: new Date().toFormat("YYYY-MM-DD HH24:MI:SS")
    };
    bonusEventDao.insert(client, data, function(){});
}


/**
 * 上家分享，建立分红主记录
 * @param client
 * @param userId 上家的userId
 * @param serverIndexId 服务器id
 * @param cb
 */
exports.createShare = function(client, userId, serverIndexId, cb) {
    checkRequire();
    bonusShareDao.select(client, {userId: userId}, function(err, shareData) {
        if (err) return cb(err);
        var shareKey = exports.getShareKey(userId, serverIndexId);
        if (!shareData) {
            var shareData = {
                userId: userId,
                shareKey: shareKey,
                balance: 0,
                amountDraw: 0,
                relationCount: 0,
                gifted: 0,
                createTime: new Date().toFormat("YYYY-MM-DD HH24:MI:SS")
            };
            bonusShareDao.insert(client, shareData, function(err, data){
                if (err) return cb(err);
                return cb(null, {'url':getShareUrl(shareKey, serverIndexId), 'gifted':0});
            });
        } else {
            return cb(null, {'url':getShareUrl(shareKey, serverIndexId), 'gifted':shareData['gifted']});
        }
    });
}

/**
 * 上家首次分享，发送奖品
 * @param client
 * @param userId 上家的userId
 * @param cb
 */
exports.sendShareGift = function(client, userId, cb) {
    checkRequire();
    bonusShareDao.select(client, {userId: userId}, function(err, shareData) {
        if (err) return cb(err);
        if (!shareData || shareData['gifted'] == 1) return cb(null);
        var items = {};
        items[c_prop.spItemIdKey.diamond] = 50;
        mailBiz.addByType(client, userId, c_prop.mailTypeKey.bonusFirstShare, [], items, function(){});
        var updateData = {gifted: 1};
        bonusShareDao.update(client, updateData, {userId: userId}, function(err, data) {
            return cb(null);
        });
    });
}

/**
 * 下家登录
 * @param client
 * @param userId 下家的userId
 * @param shareKey 分享的key，唯一标识分享的用户
 * @param cb
 */
exports.inviteeLogin = function(client, userId, shareKey, cb) {
    checkRequire();
    bonusShareDao.select(client, {shareKey: shareKey}, function(err, shareData) {
        if (err) return cb(err);
        if (!shareData) return cb(null);

        var inviterUserId = shareData['userId'];
        var relation = {
            userId: inviterUserId,
            inviteeUserId: userId,
            amount: 0,
            isBreak: 0,
            createTime: new Date().toFormat("YYYY-MM-DD HH24:MI:SS")
        };
        bonusRelationDao.insert(client, relation, function(err, data) {
            if (err) {
                var isDup = (typeof err == 'object' && err.code == 'ER_DUP_ENTRY');
                return cb(isDup ? null : err);
            }
            if (data && typeof data == 'object' && data.affectedRows > 0) {
                var items = {};
                items["700002"] = 1;
                items["700003"] = 1;
                items["700004"] = 1;
                mailBiz.addByType(client, userId, c_prop.mailTypeKey.bonusGift, [], items, function(){});
                bonusShareDao.update(client, 'relationCount = relationCount + 1', {userId: inviterUserId}, function(){});
                return cb(null);
            }
            cb(null);
        });
    });
}

/**
 * 获取上家汇总信息
 * @param client
 * @param userId
 * @param lastId 用于对明细表进行分页
 * @param cb
 */
exports.getInfo = function(client, userId, lastId, cb) {
    checkRequire();
    bonusShareDao.select(client, {userId: userId}, function(err, shareData) {
        if (err) return cb(err);
        if (!shareData) return cb(null, null);
        bonusRelationDao.list(client, 'userId = ? and id > ? and isBreak = 0 order by id desc limit 20', [userId, lastId], function(err, relationData) {
            if (err) return cb(err);
            if (!relationData || relationData.length == 0) return cb(null, shareData, []);
            var userIds = [];
            for (var i = 0; i < relationData.length; i++) {
                userIds.push(relationData[i]['inviteeUserId']);
            }
            // 填充nickName等字段
            userDao.listCols(client, " id, nickName, lvl, vip ", " id in (?) ",[userIds], function(err, dataList) {
                if (err) return cb(err);
                if (!dataList) return cb(null, shareData, []);
                var nameMap = {}; // 存储用户id与用户对象的映射
                for (var i = 0; i < dataList.length; i++) {
                    var user = dataList[i];
                    nameMap[user['id']] = user;
                }
                var relations = [];
                for (var i = 0; i < relationData.length; i++) {
                    var relation = relationData[i];
                    var user = nameMap[relation['inviteeUserId']];
                    if (!user)
                        continue;
                    relation['userId'] = relation['inviteeUserId'];
                    relation['nickName'] = user['nickName'];
                    relation['lvl'] = user['lvl'];
                    relation['vip'] = user['vip'];
                    relations.push(relation);
                }
                cb(null, shareData, relations);
            });
        });
    });
}

/**
 * 割袍断义
 * @param client
 * @param userId
 * @param inviteeUserId 下家的userId
 * @param cb
 */
exports.breakRelation = function(client, userId, inviteeUserId, cb) {
    async.series([
        function(cb) {
            bonusRelationDao.update(client, {isBreak: 1}, {userId: userId, inviteeUserId: inviteeUserId}, function(err, data) {
                if (err) return cb(err);
                return cb(null);
            });
        },
        function(cb) {
            bonusRelationDao.count(client, 'userId = ? and isBreak = 0', [userId], function(err, relationCount) {
                if (err) return cb(err);
                var updateData = {relationCount: relationCount};
                bonusShareDao.update(client, updateData, {userId: userId}, function(){});
                return cb(null);
            });
        }
    ],
    function(err, data) {
        if (err) return cb(err);
        cb(null);
    });
}

/**
 * 下家升级
 * @param client
 * @param userId 下家的userId
 * @param oldLevel 下家升级前的level
 * @param level 下家升级至的level
 * @param cb
 */
exports.inviteeLevelUp = function(client, userId, oldLevel, level, cb) {
    var levelMap = {'60': 300, '80': 500, '100': 800, '120': 1200};
    var diamondAwards = [];
    var levels = [];
    var totalDiamondAwards = 0;
    for (var i = oldLevel + 1; i <= level; i++) {
        var diamondAward = levelMap[i];
        if (diamondAward) {
            diamondAwards.push(diamondAward);
            levels.push(i);
            totalDiamondAwards += diamondAward;
        }
    }
    if (diamondAwards.length == 0) return cb(null);
    bonusRelationDao.select(client, {inviteeUserId: userId}, function(err, data) {
        if (err) return cb(err);
        if (!data || data['isBreak'] == 1) return cb(null);
        var inviterUserId = data['userId'];
        for (var i = 0; i < diamondAwards.length; i++) {
            var diamondAward = diamondAwards[i];
            var level = levels[i];
            logEvent(client, userId, inviterUserId, "LEVELUP", level, diamondAward);
        }
        if (totalDiamondAwards > 0) {
            var updateData = 'amount = amount + ' + totalDiamondAwards;
            bonusRelationDao.update(client, updateData, {userId: inviterUserId, inviteeUserId: userId}, function(){});
            updateData = 'balance = balance + ' + totalDiamondAwards;
            bonusShareDao.update(client, updateData, {userId: inviterUserId}, function(){});
        }
        cb(null);
    });
}


/**
 * 下家充值
 * @param client
 * @param userId 下家的userId
 * @param chargeCount 下家充值的金额
 * @param cb
 */
exports.inviteeCharge = function(client, userId, chargeCount, cb) {
    bonusRelationDao.select(client, {inviteeUserId: userId}, function(err, data) {
        if (err) return cb(err);
        if (!data || data['isBreak'] == 1) return cb(null);
        var inviterUserId = data['userId'];
        var diamondAward = Math.floor(chargeCount/2);
        logEvent(client, userId, inviterUserId, "RECHARGE", chargeCount, diamondAward);
        var updateData = 'amount = amount + ' + diamondAward;
        bonusRelationDao.update(client, updateData, {userId: inviterUserId, inviteeUserId: userId}, function(){});
        updateData = 'balance = balance + ' + diamondAward;
        bonusShareDao.update(client, updateData, {userId: inviterUserId}, function(){});
        cb(null);
    });
}

/**
 * 上家提取返利
 * @param client
 * @param userId
 * @param cb
 */
exports.draw = function(client, userId, cb) {
    checkRequire();
    async.waterfall([
        function(cb) {
            bonusShareDao.select(client, {userId: userId}, function(err, shareData) {
                if (err) return cb(err);
                if (!shareData || shareData['balance'] == 0) return cb('您当前没有返还额度');
                cb(null, shareData['balance']);
            });
        },
        function(balance, cb) {
            async.parallel([
                function(cb) {
                    var updateData = 'balance = balance - ' + balance + ', amountDraw = amountDraw + ' + balance;
                    bonusShareDao.update(client, updateData, 'userId = ? and balance >= ?', [userId, balance], function(err, data) {
                        if (err) return cb(err);
                        if (data && typeof data == 'object' && data.affectedRows > 0) {
                            return cb(null);
                        } else {
                            return cb('您当前没有返还额度');
                        }
                    });
                },
                function(cb) {
                    userDao.selectCols(client, 'diamond, giveDiamond, buyDiamond', 'id=?', [userId], function(err, data) {
                        if (err) return cb(err);
                        var userData = {
                            diamond: data['diamond'],
                            giveDiamond: data['giveDiamond'],
                            buyDiamond: data['buyDiamond']
                        };
                        userUtils.addDiamond(userData, balance);
                        return cb(null, userData);
                    });
                }
            ], function(err, data) {
                if (err) return cb(err);
                var userData = data[1];
                userDao.update(client, userData, {id: userId}, function(err, data) {
                    if (err) return cb(err);
                    logDraw(client, userId, userData.diamond-balance, balance);
                    return cb(null, balance, userData.diamond);
                });
            });
        }
    ], function(err, added, total) {
        if (err) return cb(err);
        return cb(null, {added: added, total:total});
    });
}

