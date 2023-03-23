var uwData = require("uw-data");
var formula = require("uw-formula");
var consts = uwData.consts;
var ds = require("uw-ds").ds;
var c_msgCode = uwData.c_msgCode;
var c_prop = uwData.c_prop;
var c_game = uwData.c_game;
var c_event = uwData.c_event;
var c_vip = uwData.c_vip;
var t_item = uwData.t_item;
var UserEntity = require('uw-entity').UserEntity;
var FriendEntity = require('uw-entity').FriendEntity;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var commonUtils = require("uw-utils").commonUtils;
var exports = module.exports;
var friendDao = require("../dao/friendDao");
var userDao = require("uw-user").userDao;
var userUtils = require("uw-user").userUtils;

/**
 * 获取好友列表
 * @param client
 * @param userId
 * @param cb
 */
exports.getInfo = function(client,userId,cb){
    _getRecordData(client,userId,function(err,friendData) {
        if (err) return cb(err);
        var friendArr = friendData.friendArr;
        if(friendArr.length == 0)  return cb(null,[]);      //无好友
        userDao.list(client,"id in (?)",[friendArr],function(err,dataList){
            if(err) return cb(err);
            var userList = [];
            for(var i = 0;i < dataList.length;i ++){
                var opponent = new ds.ExUserData();
                var locData = dataList[i];
                opponent.userData = {nickName:locData.nickName,lvl:locData.lvl,vip:locData.vip,combat:locData.combat,iconId:locData.iconId,signName:locData.signName};
                userList.push(opponent);     //存入随机出的对手数据
            }
            cb(null,userList);
        });
    });
};

/**
 * 获取请求列表
 * @param client
 * @param userId
 * @param cb
 */
exports.getRequestInfo = function(client,userId,cb){
    _getRecordData(client,userId,function(err,friendData) {
        if (err) return cb(err);
        var requestedArr = friendData.requestedArr;
        if(requestedArr.length == 0)  return cb("无好友请求");
        userDao.list(client,"id in (?)",[requestedArr],function(err,dataList){
            if(err) return cb(err);
            var userList = [];
            for(var i = 0;i < dataList.length;i ++){
                var opponent = new ds.ExUserData();
                var locData = dataList[i];
                opponent.userData = {nickName:locData.nickName,lvl:locData.lvl,vip:locData.vip,combat:locData.combat,iconId:locData.iconId,signName:locData.signName};
                userList.push(opponent);     //存入随机出的对手数据
            }
            cb(null,userList);
        });
    });
};

/**
 * 请求添加好友
 * @param client
 * @param userId
 * @param requestedId 被请求用户id
 * @param cb
 */
exports.requestFriend = function(client,userId,requestedId,cb){
    _getRecordData(client,requestedId,function(err,friendData) {
        if (err) return cb(err);
        var requestedArr = friendData.requestedArr;     //被请求列表
        if(requestedArr.indexOf(userId) != 0){
            requestedArr.push(userId);
        }
        friendDao.update(client,{requestedArr:friendData.requestedArr},{id:friendData.id},function(err,data){
            if(err) return cb(err);
            return cb(null,data);
        });
    });
};

/**
 * 处理好友请求
 * @param client
 * @param userId
 * @param requestId 请求用户id
 * @param isTake 是否接受请求  0：不接受  1：接受
 * @param cb
 */
exports.disposeFriendRequest = function(client,userId,requestId,isTake,cb){
    _getRecordData(client,userId,function(err,friendData) {
        if (err) return cb(err);
        var friendArr = friendData.friendArr;
        if(friendArr.indexOf(requestId) == 0) return cb("对方已经为好友");
        _getRecordData(client,requestId,function(err,requestFriendData) {
            if (err) return cb(err);
            if(isTake == 1){        //接受
                friendData.friendArr.push(requestId);
                requestFriendData.friendArr.push(userId);
            }
            commonUtils.arrayRemoveObject(friendData.requestedArr,requestId);

            async.parallel([
                function(cb1){
                    friendDao.update(client,{friendArr:friendData.friendArr,requestedArr:friendData.requestedArr},{id:friendData.id},cb1);
                },
                function(cb1){
                    friendDao.update(client,{friendArr:requestFriendData.friendArr},{id:requestFriendData.id},cb1);
                }
            ],function(err,data){
                if(err) return cb(err);
                return cb(null, data);
            });
        });
    });
};

/**
 * 随机获取助阵好友/陌生人
 * @param client
 * @param userId
 * @param cb
 */
exports.eventCheer = function(client,userId,cb){
    var cheerDayLimit = c_game.friends[0];      //好友每日助阵次数限制
    var friendCheerPoint = c_game.friends[1];      //好友助威会增加友情点
    var strangerCheerPoint = c_game.friends[2];      //陌生人助威会增加友情点
    var friendCountLimit = c_game.friends[3];       //好友数量上限
    async.parallel([
        function (cb1) {
            userDao.select(client,{id:userId},cb1);
        },
        function (cb1) {
            _getRecordData(client,userId,cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0],friendData = data[1];
        var cheerId;
        var strSQL = "";
        var isFriend = 1;       //0：陌生人  1：好友
        var limitArr = [];      //存放达到助阵上限的好友
        var friendArr = [];     //存放可以助阵的好友
        var cheerObj = friendData.cheerObj||{};     //助威数据
        var friendCount = friendData.friendArr.length;      //当前好友数
        var vip = userData.vip;
        if(vip > 0){        //vip好友每日助阵次数限制
            cheerDayLimit = c_vip[vip].cheerDayLimit;
        }
        for (var key in cheerObj) {
            if (cheerObj[key] >= cheerDayLimit) {
                limitArr.push(key);
            }
        }
        if(limitArr.length != 0){
            friendArr = friendData.friendArr;
            for(var i = 0; i < limitArr.length; i++){
                friendArr = commonUtils.arrayRemoveObject(friendArr,limitArr[i]);
            }
        }
        if(JSON.stringify(cheerObj) == "{}" || limitArr.length == 0) friendArr = friendData.friendArr;
        if(limitArr.length == friendCount) isFriend = 0;

        var friendProbability = Math.round(friendCount/friendCountLimit*10000);        //好友助威几率=当前好友数量/好友数量上限
        var random = _getRandomNumber(0,10000);
        if(random < friendProbability && isFriend == 1){         //随机到好友
            var index = _getRandomNumber(0,friendArr.length - 1);
            cheerId = friendArr[index];
            strSQL = " id = ? ";
        }else{
            isFriend = 0;
            var lvl = userData.lvl;
            var arrLvl = c_game.friends[4].split(",")
            var starLvl = lvl + parseInt(arrLvl[0]);
            var endLvl = lvl + parseInt(arrLvl[1]);
            cheerId = friendData.friendArr;
            cheerId.push(userId);
            strSQL = " id NOT IN (?) AND lvl > " + starLvl + " AND lvl < " + endLvl + " ORDER BY RAND() ";
        }

        userDao.select(client,strSQL,[cheerId],function(err, cheerData){
            if (err) return cb(err);
            if(!cheerData) return cb("没有随到助威者");
            var opponent = new ds.ExUserData();
            opponent.userData = {nickName:cheerData.nickName,lvl:cheerData.lvl,vip:cheerData.vip,combat:cheerData.combat,iconId:cheerData.iconId,signName:cheerData.signName};
            opponent.isFriend = isFriend;       //是否好友  0：陌生人  1：好友
            opponent.cheerCombat = (userData.combat/5*((cheerData.combat/1000+1)^0.2*0.5));        //助阵后的战力
            if(isFriend == 0){
                opponent.friendCount = strangerCheerPoint;        //助阵友情点
                return cb(null, opponent);
            }else{
                var a = cheerDayLimit;
                opponent.friendCount = friendCheerPoint;        //助阵友情点
                if(!cheerObj[cheerId] || cheerObj[cheerId] == 0 || cheerObj[cheerId] == null){
                    opponent.residueCount = cheerDayLimit;
                    friendData.cheerObj[cheerId] = 1;
                }else{
                    opponent.residueCount = cheerDayLimit - cheerObj[cheerId] + 1;        //好友助阵剩余次数
                    friendData.cheerObj[cheerId] += 1;
                }

                friendDao.update(client,{cheerObj:friendData.cheerObj},{id:friendData.id},function(err,upData){
                    if(err) return cb(err);
                    return cb(null, opponent);
                });
            }
        });
    });
};
/*****************************************************************************************************/
//判断是否有数据，无数据插入一条
var _getRecordData = function(client,userId,cb){
    friendDao.select(client,{userId:userId},function(err,friendData) {
        if(err) return cb(err);
        if(!friendData) {        //如果不存在该用户数据则插入一条
            var friendEntity = new FriendEntity();
            friendEntity.userId = userId;
            friendEntity.friendArr = [];
            friendEntity.requestedArr = [];
            friendEntity.cheerObj = {};
            friendDao.insert(client, friendEntity, function(err,data){
                if(err) return cb(err);
                friendEntity.id = data.insertId;
                cb(null,friendEntity);
            });
        }else{
            cb(null,friendData);
        }
    });
};

//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};

