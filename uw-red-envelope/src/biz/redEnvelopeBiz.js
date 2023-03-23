/**
 * Created by Administrator on 2014/5/16.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var c_lottery = uwData.c_lottery;
var c_vip = uwData.c_vip;
var c_lvl = uwData.c_lvl;
var c_guildLvl = uwData.c_guildLvl;
var c_guildFuncCfg = uwData.c_guildFuncCfg;
var t_itemLogic = uwData.t_itemLogic;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var t_item = uwData.t_item;
var c_open = uwData.c_open;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var chatBiz = require("uw-chat").chatBiz;
var formula = require("uw-formula");
var RedEnvelopeEntity = require('uw-entity').RedEnvelopeEntity;
var RedEnvelopePersonalEntity = require('uw-entity').RedEnvelopePersonalEntity;

var mailBiz = null;
var userDao = null;
var userUtils = null;
var propUtils = null;
var itemBiz = null;
var commonUtils = null;
var gameCommonBiz = null;
var g_guild = null;
var g_redEnvelope = null;
var redEnvelopeDao = null;
var redEnvelopePersonalDao = null;
var guildPersonalDao = null;
var checkRequire = function(){
    mailBiz = require("uw-mail").mailBiz;
    userDao = require("uw-user").userDao;
    userUtils = require("uw-user").userUtils;
    propUtils = require("uw-utils").propUtils;
    itemBiz = require("uw-item").itemBiz;
    commonUtils = require("uw-utils").commonUtils;
    gameCommonBiz = require("uw-game-common").gameCommonBiz;
    g_guild = require("uw-global").g_guild;
    g_redEnvelope = require("uw-global").g_redEnvelope;
    redEnvelopeDao =  require("../dao/redEnvelopeDao.js");
    redEnvelopePersonalDao = require("../dao/redEnvelopePersonalDao.js");
    guildPersonalDao  = require("uw-guild").guildPersonalDao;
};

var ds = require("uw-ds").ds;

var exports = module.exports;

/**
 * 获取数据
 * @param client
 * @param userId
 * @param lastId
 */
exports.getNewList = function (client, userId, lastId,cb) {
    checkRequire();
    guildPersonalDao.selectCols(client, "guildId",{userId: userId},function(err,data){
        if(err) return cb(err);
        var dataList =  g_redEnvelope.getList();
        //if(lastId==0) lastId = g_redEnvelope.getCurUID() - 3;
        var reList = [];
        var nameObj = {};
        var guildId = 0;
        if(data&&data.guildId) guildId = data.guildId;
        var redList = dataList[0];
        var redName = dataList[1];
        for(var key in redList){
            var locData = redList[key];
            var getData = locData.getData;      //[[份额，用户id，名字],[份额，用户id，名字]..]
            var isShow = true;
            var lotteryPool = [];
            for (var i = 0; i < getData.length; i++){
                if(getData[i][1] == userId) isShow = false;
                if(getData[i].length<2) lotteryPool.push([getData[i][0],i]);
            }
            if(lotteryPool.length <= 0) isShow = false;
            if(isShow && !_isNeedToDel(locData)){
                //if(locData.id>lastId || lastId == 0){
                if(locData.redType == c_prop.redEnvelopeTypeKey.guildRed || locData.redType == c_prop.redEnvelopeTypeKey.sysGuildRed){
                    if(guildId == locData.guildId){
                        reList.push(locData);
                        nameObj[locData.userId] = redName[locData.userId];
                    }
                }else{
                    reList.push(locData);
                    nameObj[locData.userId] = redName[locData.userId];
                }
                //}
            }
        }
        cb(null, [reList,nameObj]);
    });
};

/**
 * 获取红包列表
 * @param client
 * @param userId
 * @param cb
 */
exports.getList = function(client,userId,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            guildPersonalDao.selectCols(client, "guildId",{userId: userId},cb1);
        },
        function(cb1){
            redEnvelopeDao.list(client, " isDelete = ? order by id desc",[0],cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var guildPersonalData = data[0],redEnvelopeList = data[1];
        var guildId = 0;
        if(guildPersonalData&&guildPersonalData.guildId) guildId = guildPersonalData.guildId;
        //筛选过期的
        for (var i = 0; i < redEnvelopeList.length; i++) {
            var locMailData = redEnvelopeList[i];
            if(_isNeedToDel(locMailData)){
                redEnvelopeList.splice(i, 1);
                i--;
            }else{
                if(locMailData.redType == c_prop.redEnvelopeTypeKey.guildRed || locMailData.redType == c_prop.redEnvelopeTypeKey.sysGuildRed){
                    if(guildId != locMailData.guildId){
                        redEnvelopeList.splice(i, 1);
                        i--;
                    }
                }
            }
        }
        cb(null, redEnvelopeList);
    });
};

/**
 * 同步红包数据
 * @param client
 * @param userId
 * @param cb
 */
exports.syncRedEnvelope = function(client,userId,cb){
    checkRequire();
    //var nowTime = (new Date()).toFormat("YYYY-MM-DD HH24:MI:SS");
    redEnvelopeDao.list(client, " userId = ? and isDelete = ? ",[userId,0],function(err,redEnvelopeList){
        if(err) return cb(err);
        //筛选过期的
        var items = {};
        var redResidue = 0;
        async.map(redEnvelopeList,function(locMailData,cb1) {
            if(_isNeedToDel(locMailData)){
                locMailData.isDelete = 1;
                if(locMailData.redType == c_prop.redEnvelopeTypeKey.comRed || locMailData.redType == c_prop.redEnvelopeTypeKey.guildRed){     //玩家红包剩余退还
                    var getData = locMailData.getData;
                    for(var j = 0; j < getData.length; j++){
                        if(getData[j].length<2) redResidue += getData[j][0];
                    }
                }
                redEnvelopeDao.update(client, {isDelete:locMailData.isDelete}, {id: locMailData.id}, cb1);
            }else{
                cb1();
            }
        },function(err,mapData){
            if (err) return cb(err);
            if(redResidue <= 0) return cb(null,[redResidue]);
            items[c_prop.spItemIdKey.diamond] = redResidue;
            mailBiz.addByType(client, userId, c_prop.mailTypeKey.redEnvelopeExpire, [], items, function(err,data1){
                if (err) return cb(err);
                cb(null,[redResidue]);
            });
        });
    });
};

/**
 * 发送红包
 * @param client
 * @param userId
 * @param type    红包类型
 * @param spItemId 红包物品
 * @param amount    红包元宝数
 * @param personNum    人数
 * @param wish   祝福文本
 * @param cb
 */
exports.sendRedEnvelope = function(client,userId,type,spItemId,amount,personNum,wish,sendName,viewAmount,sysGuildId,cb){
    checkRequire();
    amount = parseInt(amount);
    if(amount<=0) return cb("发送红包异常");
    personNum = parseInt(personNum);
    if(personNum<=0) return cb("发送红包异常");

    if(type == c_prop.redEnvelopeTypeKey.comRed || type == c_prop.redEnvelopeTypeKey.guildRed) {
        var amountMin = c_game.redEnvelopeCfg[0];       //红包元宝数量最小值
        var personNumMin = c_game.redEnvelopeCfg[1];       //元宝最小分配份数
        if (amount < amountMin) return cb(getMsg(c_msgCode.packetMin20));
        if (personNum < personNumMin) return cb("元宝分配份数低于最小值");
    }else{
        return cb("发送红包类型错误!");
    }
    //限制25字
    if (wish.replace(/[^\x00-\xFF]/g, '**').length > 50) return cb("红包祝福最多25字！");
    //过滤敏感字符
    if(commonUtils.checkFuckWord(wish)) return cb("输入祝福内容不合法");
    async.parallel([
        function(cb1){
            if(userId) {
                userDao.selectCols(client, "id,nickName,vip,diamond,bag", {id: userId}, cb1);
            }else{
                cb1(null);
            }
        },
        function(cb1){
            if(userId) {
                _getRecordData(client, userId, cb1);
            }else {
                cb1(null);
            }
        },
        function(cb1){
            if(userId) {
                guildPersonalDao.selectCols(client, "guildId", {userId: userId}, cb1);
            }else {
                cb1(null);
            }
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0],redEnvelopePersonalData = data[1],guildPersonalData = data[2];
        var guildId = 0;
        if(guildPersonalData && guildPersonalData.guildId) guildId = guildPersonalData.guildId;
        if((type == c_prop.redEnvelopeTypeKey.guildRed) && guildId == 0) return cb("无行会不能发送行会福利");

        var exData
        if(redEnvelopePersonalData) {
            _calRefreshData(redEnvelopePersonalData);
            exData = redEnvelopePersonalData.exData;
        }
        if(type == c_prop.redEnvelopeTypeKey.comRed){
            var worldCount = c_vip[userData.vip].worldCount;
            if(worldCount == 0) return cb("vip等级不足！");
            var worldNowCount = 0;
            if(exData[c_prop.redEnvelopeTypeKey.comRed]) worldNowCount = exData[c_prop.redEnvelopeTypeKey.comRed][0];
            if(worldNowCount>=worldCount ) return cb("每日发送红包限额与次数已达上限！");
            var worldLimit = c_game.redEnvelopeCfg[3];
            if(amount > worldLimit) return cb("金额超过了红包最大额度！");
            var comRedArr = exData[c_prop.redEnvelopeTypeKey.comRed]||[0];
            redEnvelopePersonalData.exData[c_prop.redEnvelopeTypeKey.comRed] = [comRedArr[0] + 1];
        }else if(type == c_prop.redEnvelopeTypeKey.guildRed){
            var guildCount = c_vip[userData.vip].guildCount;
            if(guildCount == 0) return cb("vip等级不足！");
            var guildNowCount = 0;
            if(exData[c_prop.redEnvelopeTypeKey.guildRed]) guildNowCount = exData[c_prop.redEnvelopeTypeKey.guildRed][0];
            if(guildNowCount>=guildCount ) return cb("每日发送红包限额与次数已达上限！");
            var guildLimit = c_game.redEnvelopeCfg[4];
            if(amount > guildLimit) return cb("金额超过了红包最大额度！");
            var guildRedArr = exData[c_prop.redEnvelopeTypeKey.guildRed]||[0];
            redEnvelopePersonalData.exData[c_prop.redEnvelopeTypeKey.guildRed] = [guildRedArr[0] + 1];
        }else if(type == c_prop.redEnvelopeTypeKey.sysComRed) {

        }else if(type == c_prop.redEnvelopeTypeKey.sysGuildRed) {
            guildId = sysGuildId;
        }else {
                return cb("红包类型错误");
        }
        var count = 0;
        //var vipLimit = c_vip[userData.vip].redEnvelopeCount;
        if(userId) {
            var refreshTime = redEnvelopePersonalData.lastSendTime;
            if (refreshTime) {
                if (refreshTime.equalsDay(new Date())) {
                    count = redEnvelopePersonalData.sendCount || 0;
                }
            }
        }
        count +=amount;
        //if(count > vipLimit && vipLimit != -1) return cb(getMsg(c_msgCode.packetMaxToday));
        if(type ==c_prop.redEnvelopeTypeKey.comRed || type ==c_prop.redEnvelopeTypeKey.guildRed ) {
            if (userData.diamond < amount) return cb(getMsg(c_msgCode.noDiamond));
            userUtils.reduceDiamond(userData,amount);
        }
        //扣除元宝
        var expTime = c_game.redEnvelopeCfg[2];     //红包过期时间（小时）
        if(type == c_prop.redEnvelopeTypeKey.sysComRed ||type == c_prop.redEnvelopeTypeKey.sysGuildRed ){
            expTime = 3;
        }
        var nowTime = new Date();
        var expireTime = new Date(nowTime.toString());
        expireTime = expireTime.addHours(expTime);

        var getData = [];
        if(userId) {
            getData = _getRedEnvelopeShare(amount, personNum);
        }else {
            var tempData = _getSysRedEnvelopeShare(amount, personNum);
            getData = tempData[0];

            if(getData.length > 500){
                getData = getData.slice(0, 500);
            }
            personNum = getData[1];
        }

        var redEnvelopeEntity = new RedEnvelopeEntity();
        redEnvelopeEntity.redType = type;
        redEnvelopeEntity.userId = userId;
        redEnvelopeEntity.guildId = guildId;
        redEnvelopeEntity.spItemId = spItemId;
        redEnvelopeEntity.diamond = amount;
        redEnvelopeEntity.personNum = personNum;
        redEnvelopeEntity.wish = wish;
        redEnvelopeEntity.getData = getData;
        redEnvelopeEntity.addTime = nowTime;
        redEnvelopeEntity.expireTime = expireTime;
        redEnvelopeEntity.isDelete = 0;

        var updateData
        if(userId) {
            updateData = {
                diamond: userData.diamond
            };
        }
        async.parallel([
            function (cb1) {
                if(userId) {
                    userDao.update(client, updateData, {id: userId}, cb1);
                }else {
                    cb1(null);
                }
            },
            function (cb1) {
                redEnvelopeDao.insert(client, redEnvelopeEntity,cb1);
            }
        ], function (err, upData) {
            if (err) return cb(err);
            var insertData = upData[1];
            redEnvelopeEntity.id = insertData.insertId;
            if(userId) {
                g_redEnvelope.setRedEnvelope(redEnvelopeEntity.id, redEnvelopeEntity, userData.nickName);
            } else {
                g_redEnvelope.setRedEnvelope(redEnvelopeEntity.id, redEnvelopeEntity, sendName);
            }
            if(type == c_prop.redEnvelopeTypeKey.comRed){   //普通红包
                var addUpServer = redEnvelopePersonalData.addUpServer||0;
                redEnvelopePersonalData.addUpServer = addUpServer + amount;
            }else if(type == c_prop.redEnvelopeTypeKey.guildRed){   //行会红包
                var addUpGuild = redEnvelopePersonalData.addUpGuild||0;
                redEnvelopePersonalData.addUpGuild = addUpGuild + amount;
            }else{   //系统红包
                if(type == c_prop.redEnvelopeTypeKey.sysComRed){
                    chatBiz.addSysData(89,[viewAmount,wish]);
                }else if(type == c_prop.redEnvelopeTypeKey.sysGuildRed){
                    var guildName = g_guild.getGuildName(guildId) || "";
                    chatBiz.addSysData(90,[guildName,viewAmount,wish]);
                }
                return cb(null,[redEnvelopeEntity,updateData,amount,null,spItemId]);
            }

            var getDataArr = redEnvelopePersonalData.getData;
            if(getDataArr.length >= 10) getDataArr.pop();
            getDataArr.unshift([redEnvelopeEntity.redType,redEnvelopeEntity.diamond,redEnvelopeEntity.addTime]);
            redEnvelopePersonalData.sendCount = count;
            redEnvelopePersonalData.lastSendTime = nowTime;
            redEnvelopePersonalData.getData = getDataArr;

            var updateRedEnvelopePersonalData = {
                addUpServer: redEnvelopePersonalData.addUpServer,
                addUpGuild: redEnvelopePersonalData.addUpGuild,
                sendCount: redEnvelopePersonalData.sendCount,
                lastSendTime: redEnvelopePersonalData.lastSendTime,
                getData:redEnvelopePersonalData.getData,
                exData:redEnvelopePersonalData.exData
            };
            redEnvelopePersonalDao.update(client, updateRedEnvelopePersonalData,{id:redEnvelopePersonalData.id},function(err,upRedEnvelopePersonalData){
                if (err) return cb(err);
                if(type == c_prop.redEnvelopeTypeKey.comRed){   //普通红包
                    chatBiz.addSysData(41,[userData.nickName,amount,wish]);
                }else if(type == c_prop.redEnvelopeTypeKey.guildRed){   //行会红包
                    var guildName = g_guild.getGuildName(guildId);
                    chatBiz.addSysData(43,[userData.nickName,guildName,amount,wish]);
                }
                cb(null,[redEnvelopeEntity,updateData,amount,redEnvelopePersonalData,spItemId]);
            });
        });
    });
};

/**
 * 领取红包
 * @param client
 * @param userId
 * @param redEnvelopeId
 * @param cb
 */
exports.receiveBonus = function(client,userId,redEnvelopeId,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            _getRecordData(client,userId,cb1);
        },
        function(cb1){
            userDao.selectCols(client, "id,nickName,diamond,bag",{id:userId},cb1);
        },
        function(cb1){
            guildPersonalDao.selectCols(client, "guildId",{userId: userId},cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var redEnvelopePersonalData = data[0], userData = data[1], guildPersonalData = data[2];
        var guildId = 0;
        if (guildPersonalData && guildPersonalData.guildId) guildId = guildPersonalData.guildId;
        var gRedEnvelope = g_redEnvelope.getRedEnvelope(redEnvelopeId);
        if (!gRedEnvelope) return cb("红包不存在");
        var redEnvelopeData = gRedEnvelope[0] || null;
        var senderName = gRedEnvelope[1] || "";
        if (!redEnvelopeData) return cb("红包不存在");
        if (_isNeedToDel(redEnvelopeData)) return cb("红包已过期");
        if (redEnvelopeData.redType == c_prop.redEnvelopeTypeKey.guildRed || redEnvelopeData.redType == c_prop.redEnvelopeTypeKey.sysGuildRed) {
            if (guildId != redEnvelopeData.guildId) return cb("您不属于该行会");
        }
        var getData = redEnvelopeData.getData;      //[[份额，用户id，名字],[份额，用户id，名字]..]
        var getAmount = 0;
        var lotteryPool = [];       //可领取红包份
        for (var i = 0; i < getData.length; i++) {
            if (getData[i][1] == userId) return cb("已领取");
        }
        for (var j = 0; j < getData.length; j++) {
            if (getData[j].length < 2) lotteryPool.push([getData[j][0], j]);
        }

        if (lotteryPool.length <= 0) return cb("该红包已经被领光了");
        var randomNumber = _getRandomNumber(0, lotteryPool.length - 1);
        getAmount = lotteryPool[randomNumber][0];  //获得元宝
        var index = lotteryPool[randomNumber][1];
        for (var j = 0; j < redEnvelopeData.getData.length; j++) {
            if (getData[j].length < 2) lotteryPool.push(getData[j][0]);
        }
        redEnvelopeData.getData[index] = [getAmount, userId, userData.nickName];
        g_redEnvelope.setRedEnvelope(redEnvelopeData.id, redEnvelopeData, senderName);
        if (redEnvelopeData.spItemId == c_prop.spItemIdKey.diamond) {
            var addUpGet = redEnvelopePersonalData.addUpGet || 0;     //累计抢得元宝
            redEnvelopePersonalData.addUpGet = addUpGet + getAmount;
        } else {
            var exUpGet = redEnvelopePersonalData.exAddUpGet[redEnvelopeData.spItemId] || 0;
            redEnvelopePersonalData.exAddUpGet[redEnvelopeData.spItemId] = exUpGet + getAmount;
        }
        //添加物品
        var items = {};
        items[redEnvelopeData.spItemId] = getAmount;
        userUtils.saveItems(userData, items);

        var updateData = {};
        var updateRepData = {};
        if (redEnvelopeData.spItemId == c_prop.spItemIdKey.diamond) {
            updateData = {
                diamond: userData.diamond
            };
            updateRepData = {
                addUpGet: redEnvelopePersonalData.addUpGet
            };
        }else {
            updateData = {
                bag: userData.bag
            };
            updateRepData = {
                exAddUpGet: redEnvelopePersonalData.exAddUpGet
            };
        }

        async.parallel([
            function (cb1) {
                userDao.update(client,updateData,{id:userId},cb1);
            },
            function (cb1) {
                redEnvelopePersonalDao.update(client, updateRepData,{id:redEnvelopePersonalData.id},cb1);
            }
        ], function (err, upData) {
            if (err) return cb(err);
            if(redEnvelopeData.redType == c_prop.redEnvelopeTypeKey.comRed){   //普通红包
                chatBiz.addSysData(42,[userData.nickName,senderName,getAmount,redEnvelopeData.wish]);
            }else if(redEnvelopeData.redType == c_prop.redEnvelopeTypeKey.guildRed){   //行会红包
                var guildName = g_guild.getGuildName(guildId);
                chatBiz.addSysData(44,[userData.nickName,senderName,guildName,getAmount,redEnvelopeData.wish]);
            }else if(redEnvelopeData.redType == c_prop.redEnvelopeTypeKey.sysComRed){ //系统普通红包
                chatBiz.addSysData(91,[userData.nickName,senderName,getAmount,redEnvelopeData.wish]);
            }else if(redEnvelopeData.redType == c_prop.redEnvelopeTypeKey.sysGuildRed){
                var guildName = g_guild.getGuildName(guildId);
                chatBiz.addSysData(92,[userData.nickName,senderName,guildName,getAmount,redEnvelopeData.wish]);
            }
            cb(null,[true,getAmount,updateData,updateRepData,redEnvelopeData,redEnvelopeData.spItemId == c_prop.spItemIdKey.diamond]);
        });
    });
};

/*****************************************************************************************************/

var _calRefreshData = function (redEnvelopePersonalData) {
    if (!redEnvelopePersonalData.lastSendTime) {
        redEnvelopePersonalData.lastSendTime = new Date();
        redEnvelopePersonalData.exData = {};
    }
    if (!redEnvelopePersonalData.lastSendTime.equalsDay(new Date())) {
        redEnvelopePersonalData.lastSendTime = new Date();
        redEnvelopePersonalData.exData = {};
    }
};

/**
 * 是否需要删除
 * @param redEnvelopeData
 * @returns {boolean}
 * @private
 */
var _isNeedToDel = function (redEnvelopeData) {
    var expireTime = redEnvelopeData.expireTime;
    var nowTime = new Date();
    //判断是否已经过期
    if (expireTime.isBefore(nowTime) || expireTime.equals(nowTime)) {
        return true;
    }
    return false;
};

//判断是否有数据，无数据插入一条
var _getRecordData = function(client,userId,cb){
    redEnvelopePersonalDao.select(client,{userId:userId},function(err,redEnvelopePersonalData) {
        if(err) return cb(err);
        if(!redEnvelopePersonalData) {        //如果不存在该用户数据则插入一条
            var redEnvelopePersonalEntity = new RedEnvelopePersonalEntity();
            redEnvelopePersonalEntity.userId = userId;
            redEnvelopePersonalEntity.addUpServer = 0;
            redEnvelopePersonalEntity.addUpGuild = 0;
            redEnvelopePersonalEntity.addUpGet = 0;
            redEnvelopePersonalEntity.sendCount = 0;
            redEnvelopePersonalEntity.getData = [];
            redEnvelopePersonalEntity.exData = {};
            redEnvelopePersonalEntity.exAddUpGet = {};
            redEnvelopePersonalDao.insert(client, redEnvelopePersonalEntity, function(err,data){
                if(err) return cb(err);
                redEnvelopePersonalEntity.id = data.insertId;
                cb(null,redEnvelopePersonalEntity);
            });
        }else{
            cb(null,redEnvelopePersonalData);
        }
    });
};

//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};

var _getRedEnvelopeShare = function(amount,personNum){
    amount = parseInt(amount);
    var returnArr = [];
    for(var i=personNum;i>0;i--){
        if(i>1) {
            var count = formula.calRedEnvelopeShareCfg(amount,i);
            returnArr.push([count]);
            amount -= count;
        }else{
            returnArr.push([amount]);
        }
    }
    return returnArr;
};

var _getSysRedEnvelopeShare = function(amount,limitZone){
    amount = parseInt(amount);
    var mixNum = limitZone[0] || 1;
    var maxNum = limitZone[1] || 10;
    var returnArr = [];
    var count = 0;
   for(count ;amount >0;count++){
       var i = _getRandomNumber(mixNum,maxNum);
       i = amount > i ? i:amount;
       amount -= i;
       returnArr.push([i]);
   }
    return [returnArr, count];
}



