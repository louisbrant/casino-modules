/**
 * Created by Administrator on 2015/9/11.
 */
var exports = module.exports;
var uwData = require("uw-data");
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var c_vip = uwData.c_vip;
var t_copy = uwData.t_copy;
var c_msgCode = uwData.c_msgCode;
var c_vipCopy = uwData.c_vipCopy;
var userDao = require("uw-user").userDao;
var userUtils = require("uw-user").userUtils;
var PKMember = require("uw-fight").PKMember;
var getMsg = require("uw-utils").msgFunc(__filename);
var copyProgressDao = require("../dao/copyProgressDao");
var CopyProgressEntity = require("uw-entity").CopyProgressEntity;

//验证副本
exports.valid = function(client, userId, copyId, cb){
    var copyTemp = t_copy[copyId];//副本数据
    var pCopyId = copyTemp.pCopyId;//主副本id
    var copyType = copyTemp.type;

    async.parallel([
        function(cb1){
            userDao.select(client, {id:userId}, cb1);
        },
        function(cb1){
            exports.getInfoByPCopyId(client, userId, pCopyId, cb1);
        }
    ], function(err, data){
        if(err) return cb(err);
        var user = data[0], copyProgress = data[1];

        //判断限制次数
        //冷却（倒计时）
        var time = copyProgress.pTime;
        if(time){
            var now = new Date();
            logger.debug("now.isBefore(time)------->", now.isBefore(time));
            if(now.isBefore(time)) return cb("CD时间中...");
        }
        //普通副本不限制
        //精英副本限制
        //活动副本限制
/*
        var wipeLimit = copyTemp.wipeLimit;     //扫荡上限
        var timesPerDay = copyProgress.timesPerDay;
        if(nowTime1 < refreshTime){
            timesPer = timesPerDay[copyId];
        }
        if(count > (wipeLimit - timesPer)) return cb("扫荡次数超过上限");
*/

        //体力判断
        if(userUtils.getStrength(user) < copyTemp.strength )
            return cb(getMsg(c_msgCode.noStrength));

        //等级判断
        if (user.lvl < copyTemp.lvlRequired)
            return cb("等级限制");
        cb(null, [user, copyProgress]);
    });
};

//获取副本怪物
exports.getMonsterMembers = function(copyId,nodeIndex){
    var t_copyData = t_copy[copyId];
    var index = exports.getDataIndex(copyId,nodeIndex,2);
    //获取怪物
    var monsterIds = t_copyData.monsterIds[index]||[];
    var monsterLvl = t_copyData.monsterLvl[index]||[];
    var members = [];
    for(var i = 0;i<monsterIds.length;i++){
        var locMonsterId = monsterIds[i];
        if(!locMonsterId) continue;
        var locLvl = monsterLvl[i];
        //monsterId,pos,isSelf,lvl
        var member = PKMember.createByMonsterId(locMonsterId,i+10,false,locLvl);
        members.push(member);
    }
    return members;
};

//获取数据的下标
exports.getDataIndex = function(copyId,nodeIndex,type){
    var t_copyData = t_copy[copyId];
    var index = -1;
    for(var i = 0 ;i<t_copyData.nodeType;i++){
        var locType = t_copyData.nodeType[i];
        if(locType==type){
            index++;
        }
        if (i == nodeIndex) break;
    }
    if(index<0) index = 0;
    return index;
};

/**
 * 通过主副本id获取副本进度，没有则创建
 * @param client
 * @param userId
 * @param pCopyId
 * @param cb
 */
exports.getInfoByPCopyId = function (client, userId, pCopyId, cb) {
    copyProgressDao.select(client, {userId: userId, pCopyId: pCopyId}, function (err, copyProgress) {
        if (err) return cb(err);
        if (copyProgress) {
            cb(null, copyProgress);
        } else {
            //不存在副本进度记录则创建
            copyProgress = new CopyProgressEntity();
            copyProgress.userId = userId;
            copyProgress.pCopyId = pCopyId;
            copyProgress.finished = 0;
            copyProgress.timesPerDay = {};
            copyProgress.copyStar = {};
            copyProgress.pTime = new Date();
            copyProgressDao.insert(client, copyProgress, function (err, data) {
                if (err) return cb(err);
                copyProgress.id = data.insertId;
                cb(null, copyProgress);
            });
        }
    });
};

//获取副本剩余次数
exports.getReTime = function(userData,copyProgressData,copyId,type){
    var vip = userData.vip;
    var maxTimes = 0;
    var perKey = copyId;
    switch (type){
        case c_prop.copyTypeKey.equip:      //装备副本
            maxTimes = c_vip[0].equipCount;
            break;
        case c_prop.copyTypeKey.hell:      //Boss副本
            maxTimes = c_vip[0].bossCount;
            break;
        case c_prop.copyTypeKey.state:      //境界副本
            maxTimes = c_vip[0].realmCount;
            break;
        case c_prop.copyTypeKey.vip:      //vip副本
            perKey = exports.getCopyVip(copyId);
            break;
        case c_prop.copyTypeKey.guild:      //公会副本
            maxTimes = c_vip[0].guildFbCount;
            break;
        case c_prop.copyTypeKey.paTa:      //爬塔
            maxTimes = c_game.towerCopy[1];
            break;
    }
    var refreshTime = copyProgressData.refreshTime;     //最后一次通关子副本时间
    var timesPerDay = copyProgressData.timesPerDay;     //子副本剩余挑战次数
    if(!refreshTime|| !refreshTime.equalsDay(new Date())) {
        copyProgressData.refreshTime = new Date();
        copyProgressData.timesPerDay = {};
        return maxTimes;
    }

    if(!timesPerDay.hasOwnProperty(perKey)) return maxTimes;
    return timesPerDay[perKey];
}

exports.setTimesPerDay = function(copyProgressData,copyId,num){
    var t_copyData = t_copy[copyId];
    var perKey = copyId;
    if(t_copyData.type == c_prop.copyTypeKey.vip){
        perKey = exports.getCopyVip(copyId);
    }
    copyProgressData.timesPerDay[perKey] = num;
};

exports.getCopyVip = function(copyId){
    for(var key in c_vipCopy){
        var vipCopyData = c_vipCopy[key];
        var copyIds = vipCopyData.copyIds; //副本字段区间
        if(copyId>= parseInt(copyIds[0])&&copyId<= parseInt(copyIds[1])){
            return vipCopyData.vipLvl;
        }
    }
    return 0;
};

//获取VIP副本打过的次数
exports.getVipCopyTimes = function(copyVip,userData,copyProgressData,type){
    var vipCopyData = c_vipCopy[copyVip];
    var copyStart = Math.floor(vipCopyData.copyIds[0]);
    var copyEnd = Math.floor(vipCopyData.copyIds[1]);
    var count = 0;
    for(var i = copyStart; i<=copyEnd; i++){
        var locCopyCount = exports.getReTime(userData,copyProgressData,i,type);
        count+=locCopyCount;
    }
    return count;
}

//获取副本购买次数
exports.getBuyCopyCount = function(copyProgressData,copyId){
    var buyCopyCount = 1;
    var resetTime = copyProgressData.resetTime;     //购买时间
    var resetCounts = copyProgressData.resetCounts;     //子副本今日购买次数
    if(!resetTime) return buyCopyCount;
    if(!resetTime || !resetTime.equalsDay(new Date())) copyProgressData.resetCounts = {};
    if(!resetTime || !resetTime.equalsDay(new Date()) || !resetCounts.hasOwnProperty(copyId)) return buyCopyCount;
    return resetCounts[copyId] + 1;
}