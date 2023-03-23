/**
 * Created by Administrator on 2014/5/16.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var c_lvl = uwData.c_lvl;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var t_item = uwData.t_item;
var c_open = uwData.c_open;
var c_vip = uwData.c_vip;
var c_heartStunt = uwData.c_heartStunt;
var c_heartStuntLvl = uwData.c_heartStuntLvl;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var HeartStuntEntity = require('uw-entity').HeartStuntEntity;
var biBiz = require('uw-log').biBiz;
var genuineQiObj = require('uw-log').genuineQiObj;

var ds = require("uw-ds").ds;
var exports = module.exports;
var formula = require("uw-formula");

var userDao = null;
var userUtils = null;
var propUtils = null;
var itemBiz = null;
var commonUtils = null;
var heartStuntDao = null;
var demonLotusDao = null;
var checkRequire = function(){
    userDao = userDao || require("uw-user").userDao;
    userUtils = userUtils || require("uw-user").userUtils;
    propUtils = propUtils || require("uw-utils").propUtils;
    heartStuntDao =  heartStuntDao || require("../dao/heartStuntDao.js");
    itemBiz = itemBiz || require("uw-item").itemBiz;
    commonUtils = commonUtils || require("uw-utils").commonUtils;
    demonLotusDao = demonLotusDao || require("uw-demon-lotus").demonLotusDao;
};

/**
 * 获取心法神功数据
 * @param client
 * @param userId
 * @param cb
 */
exports.getInfo = function(client,userId,cb){
    checkRequire();
    userDao.selectCols(client,"id,lvl",{id:userId},function(err,userData){
        if(err) return cb(err);
        var openLvl = c_open.heartStunt1.lvlRequired;
        if(userData.lvl < openLvl) return cb(getMsg(c_msgCode.noRoleLvl,openLvl));
        _getRecordData(client,userId,function(err,heartStuntData){
            cb(null,heartStuntData);
        });
    });
};

/**
 * 选择心法
 * @param client
 * @param userId
 * @param index
 * @param heartStuntId
 * @param cb
 */
exports.choMenCulMethods = function(client,userId,index,heartStuntId,cb){
    checkRequire();
    index = parseInt(index);
    //if((index+1)>c_game.heartStuntCfg[0]) return cb("数据异常");
    if(!c_heartStunt[heartStuntId]) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.selectCols(client,"id,lvl,vip,propertyData",{id:userId},cb1);
        },function(cb1){
            heartStuntDao.select(client,{userId:userId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0],heartStuntData = data[1];
        var openLvl = c_open.heartStunt1.lvlRequired;
        if(userData.lvl < openLvl) return cb(getMsg(c_msgCode.noRoleLvl,openLvl));
        var vip = userData.vip;
        var stateArr = heartStuntData.stateArr||[];         //境界槽位对应选择的心法[心法id,心法id,...]
        if(stateArr[index]) return cb("同一位置只能学一种心法");
        var openStr = "heartStunt" + (parseInt(index) + 1).toString();
        var vipopenStr = "vip" + openStr;
        if(!c_open[openStr]) return cb("数据异常");
        var openLvl = c_open[openStr].lvlRequired;
        var isVip = false;      //vip提前开启
        var openVip = 0;
        if(index == 0){
            isVip = true;
        }else if(c_open[vipopenStr]){
            openVip = c_open[vipopenStr].lvlRequired;
            if(userData.vip >= openVip) isVip = true;
        }else{
            return cb("数据异常");
        }
        if(userData.lvl<openLvl && !isVip) return cb(getMsg(c_msgCode.formulaNoOpen,openLvl,openVip));
        if(stateArr.indexOf(heartStuntId) > -1) return cb("该心法已学习!");

        //学习心法
        heartStuntData.stateArr[index] = heartStuntId;
        heartStuntData.heartLvlArr[index] = 0;
        //属性数据
        if(!userData.propertyData[c_prop.propertyDataKey.heartStunt]) userData.propertyData[c_prop.propertyDataKey.heartStunt] = {};
        userData.propertyData[c_prop.propertyDataKey.heartStunt][heartStuntId] = 0;

        //更新
        var upUserData = {
            propertyData:userData.propertyData
        };
        var upHeartStuntData = {
            stateArr:heartStuntData.stateArr,
            heartLvlArr : heartStuntData.heartLvlArr
        };
        async.parallel([
            function (cb1) {
                userDao.update(client, upUserData, {id: userId}, cb1);
            },
            function (cb1) {
                heartStuntDao.update(client, upHeartStuntData, {id: heartStuntData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [upUserData,upHeartStuntData]);
        });
    });
};

/**
 * 更换心法
 * @param client
 * @param userId
 * @param index
 * @param heartStuntId
 * @param cb
 */
exports.chaMenCulMethods = function(client,userId,index,heartStuntId,cb){
    checkRequire();
    if(!c_heartStunt[heartStuntId]) return cb("数据异常");
    async.parallel([
        function(cb1){
            userDao.selectCols(client,"id,diamond,buyDiamond,giveDiamond,propertyData",{id:userId},cb1);
        },function(cb1){
            heartStuntDao.select(client,{userId:userId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0],heartStuntData = data[1];

        var stateArr = heartStuntData.stateArr||[];         //境界槽位对应选择的心法[心法id,心法id,...]
        var heartLvlArr = heartStuntData.heartLvlArr || [];
        var heartLvl = heartLvlArr[index] || 0;
        if(!stateArr[index]) return cb("该位置还未学习心法");
        var oldHeartId = stateArr[index];
        //if(stateArr.indexOf(heartStuntId) > -1) return cb("该心法已学习!");
        var cosDiamond = c_game.heartStuntCfg[2];
        if(userData.diamond < cosDiamond) return cb(getMsg(c_msgCode.noDiamond));

        //扣除元宝
        userUtils.reduceDiamond(userData, cosDiamond);
        //属性数据
        if(!userData.propertyData[c_prop.propertyDataKey.heartStunt]) userData.propertyData[c_prop.propertyDataKey.heartStunt] = {};
        //替换心法
        var oldHeartLvl = 0;
        if(stateArr.indexOf(heartStuntId) > -1){        //心法互换
            for(var i = 0;i < stateArr.length;i++){
                if(stateArr[i] == heartStuntId){
                    heartStuntData.stateArr[i] = oldHeartId;
                    oldHeartLvl = heartLvlArr[i] || 0;
                }
            }
            heartStuntData.stateArr[index] = heartStuntId;
            userData.propertyData[c_prop.propertyDataKey.heartStunt][oldHeartId] = oldHeartLvl;
            userData.propertyData[c_prop.propertyDataKey.heartStunt][heartStuntId] = heartLvl;
        }else{      //单向
            heartStuntData.stateArr[index] = heartStuntId;
            delete userData.propertyData[c_prop.propertyDataKey.heartStunt][oldHeartId];
            userData.propertyData[c_prop.propertyDataKey.heartStunt][heartStuntId] = heartLvl;
        }


        //更新
        var upUserData = {
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            propertyData:userData.propertyData
        };
        var upHeartStuntData = {
            stateArr:heartStuntData.stateArr
        };
        async.parallel([
            function (cb1) {
                userDao.update(client, upUserData, {id: userId}, cb1);
            },
            function (cb1) {
                heartStuntDao.update(client, upHeartStuntData, {id: heartStuntData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [upUserData,upHeartStuntData,cosDiamond]);
        });
    });
};

/**
 * 心法加点
 * @param client
 * @param userId
 * @param index
 * @param cb
 */
exports.stuMenCulMethods = function(client,userId,index,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.selectCols(client,"id,lvl,nickName,serverId,accountId,gold,exData,genuineQi,propertyData",{id:userId},cb1);
        },function(cb1){
            heartStuntDao.select(client,{userId:userId},cb1);
        },function(cb1){
            demonLotusDao.select(client,{userId:userId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0],heartStuntData = data[1],demonLotusData = data[2];
        var openLvl = c_open.heartStunt1.lvlRequired;
        if(userData.lvl < openLvl) return cb(getMsg(c_msgCode.noRoleLvl,openLvl));

        var dot = heartStuntData.heartLvlArr;       //境界槽位下标对应心法的等级[lvl,lvl,...]
        var stateArr = heartStuntData.stateArr||[];         //境界槽位对应选择的心法[心法id,心法id,...]
        if((index+1) > dot.length) return cb("数据异常");
        var dotLvl = parseInt(dot[index]);
        var heartStuntId = parseInt(stateArr[index]);
        var heartStuntLvlId = heartStuntId + dotLvl;
        if(!c_heartStuntLvl[heartStuntLvlId]) return cb("已达上限");
        var costGold = c_heartStuntLvl[heartStuntLvlId].cosGold;
        var cosGenqi = c_heartStuntLvl[heartStuntLvlId].cosGenqi;
        var genuineQiArr = userUtils.calGenuineQi(userData,demonLotusData);
        var succeedPro = c_heartStuntLvl[heartStuntLvlId].succeedPro;
        if(userData.gold < costGold) return cb(getMsg(c_msgCode.noGolds));
        if(genuineQiArr[0] < cosGenqi) return cb(getMsg(c_msgCode.noGas));
        var oldGenuineQi = genuineQiArr[0];

        //是否进阶成功
        var isSucceed = false;
        var randomNum = _getRandomNumber(1,10000);
        if(randomNum <= succeedPro) {        //成功
            isSucceed = true;
            heartStuntData.heartLvlArr[index] = dotLvl + 1;
            //属性数据
            if(!userData.propertyData[c_prop.propertyDataKey.heartStunt]) userData.propertyData[c_prop.propertyDataKey.heartStunt] = {};
            userData.propertyData[c_prop.propertyDataKey.heartStunt][heartStuntId] = dotLvl + 1;
        }

        //扣除金币
        userData.gold -= costGold;
        //计算真气
        userUtils.addGenuineQi(userData,-cosGenqi);
        var genuineQiArrs = [userData.genuineQi];

        var GenuineQiObj = new genuineQiObj();
        /** 服务器 **/
        GenuineQiObj.serverId = userData.serverId;
        /** 账号id **/
        GenuineQiObj.accountId = userData.accountId;
        /** 用户id **/
        GenuineQiObj.userId = userData.id;
        /** 昵称 **/
        GenuineQiObj.nickName = userData.nickName;
        /** 等级 **/
        GenuineQiObj.lvl = userData.lvl;
        /** 时间 **/
        GenuineQiObj.happenTime = new Date();
        /** 消耗物品 **/
        GenuineQiObj.costObj = {};

        /** 真气 **/
        GenuineQiObj.oldGenuineQi = oldGenuineQi;    /** 原本真气值 **/
        GenuineQiObj.newGenuineQi = userData.genuineQi;   /** 当前真气值 **/
        GenuineQiObj.costGenuineQi = cosGenqi;
        GenuineQiObj.costType = heartStuntId + "心法加点";   /** 培养类型 **/
        GenuineQiObj.costOldLvl = dotLvl;   /** 培养前等级 **/
        GenuineQiObj.costNewLvl = heartStuntData.heartLvlArr[index];   /** 培养后等级 **/
        biBiz.genuineQiBi(JSON.stringify(GenuineQiObj));

        //更新
        var upUserData = {
            gold : userData.gold,
            exData:userData.exData,
            genuineQi:userData.genuineQi,
            propertyData:userData.propertyData
        };
        var upHeartStuntData = {
            heartLvlArr:heartStuntData.heartLvlArr
        };
        async.parallel([
            function (cb1) {
                userDao.update(client, upUserData, {id: userId}, cb1);
            },
            function (cb1) {
                heartStuntDao.update(client, upHeartStuntData, {id: heartStuntData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [upUserData,upHeartStuntData,isSucceed,genuineQiArrs,costGold]);
        });
    });
};

/*****************************************************************************************************/

//判断是否有数据，无数据插入一条
var _getRecordData = function(client,userId,cb){
    heartStuntDao.select(client,{userId:userId},function(err,heartStuntData) {
        if(err) return cb(err);
        if(!heartStuntData) {        //如果不存在该用户数据则插入一条
            var heartStuntEntity = new HeartStuntEntity();
            heartStuntEntity.userId = userId;
            heartStuntEntity.stateArr = [];
            heartStuntEntity.heartLvlArr = [];
            heartStuntDao.insert(client, heartStuntEntity, function(err,data){
                if(err) return cb(err);
                heartStuntEntity.id = data.insertId;
                cb(null,heartStuntEntity);
            });
        }else{
            cb(null,heartStuntData);
        }
    });
};

//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};

