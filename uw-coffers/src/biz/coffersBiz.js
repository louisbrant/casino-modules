/**
 * Created by Administrator on 2014/5/16.
 */

var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var coffersDao = require("./../dao/coffersDao");
var coffersBakDao = require("./../dao/coffersBakDao");
var coffersUtils = require("./coffersUtils");
var CoffersEntity = require("uw-entity").CoffersEntity;
var CoffersBakEntity = require("uw-entity").CoffersBakEntity;

var g_coffers = require("uw-global").g_coffers;
var c_game = require("uw-data").c_game;
var c_open = require("uw-data").c_open;
var c_prop = require("uw-data").c_prop;
var c_msgCode = require("uw-data").c_msgCode;
var userDao = require("uw-user").userDao;
var userUtils = require("uw-user").userUtils;
var challengeCupDao = require("uw-challenge-cup").challengeCupDao;
var arenaDao = require("uw-arena").arenaDao;
var pkOutDao = require("uw-pkOut").pkOutDao;
var commonUtils = require("uw-utils").commonUtils;
var serverInfoBiz = require("uw-server-info").serverInfoBiz;
var serverInfoDao = require("uw-server-info").serverInfoDao;
var dbHelper = require("uw-db").dbHelper;
var mainClient = require("uw-db").mainClient;
var loginClient = require("uw-db").loginClient;
var project = require("uw-config").project;
var g_data = require("uw-global").g_data;
var consts = require("uw-data").consts;
var c_lvl = require("uw-data").c_lvl;
var c_vip = require("uw-data").c_vip;
var serverUtils = require("uw-utils").serverUtils;
var fightUtils = require("uw-utils").fightUtils;
var iface = require("uw-data").iface;
var t_medal = require("uw-data").t_medal;

var ds = require("uw-ds").ds;
var coffersGroupBiz = require("uw-coffers-group").coffersGroupBiz;
var exports = module.exports;
var heroBiz = require("uw-hero").heroBiz;
var mailBiz = require("uw-mail").mailBiz;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var chatBiz = null;

var checkRequire = function(){
    chatBiz = chatBiz || require("uw-chat").chatBiz;
};

/**
 * 获取数据
 * @param client
 * @param userId
 * @param cb
 */
exports.getInfo = function (client, userId, cb) {
    coffersDao.selectCols(client,"buffBase"," 1 =1",[], function (err, data) {
        if(err) return cb(err);
        var coffersData = g_coffers.getCoffers();
        var ret = {};
        for (var key in coffersData) {
            ret[key] = coffersData[key];
        }
        coffersData.buffBase = data.buffBase;
        ret.buffBase = data.buffBase;
        cb(null, ret);
    });
};
//掠夺防御
exports.lootDefense = function (client, attackUserId, attackUserName, attackServerId, attackServerName, isWin, door, cb) {
    checkRequire();
    var coffersData = g_coffers.getCoffers();
    //获取守门人id
    var defenceId = coffersData.defeseData[door][1];
    userDao.selectCols(client, "id,nickName", " id=? ", [defenceId], function (err, defenseUser) {
        if (err) return cb(err);

        var personResource = 0;
        var coffersResource = 0;
        var beResource = 0;
        //判断是否已经掠夺
        var isLoot = _checkIsLoot(door, attackUserId, attackServerId, coffersData.defeseData);
        if (isLoot) return cb(null, [1, personResource, coffersResource]);
        //判断是否已经攻破
        var isBreak = coffersUtils.checkBreak(door, coffersData.breakTimeData);
        if (isBreak) return cb(null, [2, personResource, coffersResource]);

        if (isWin) {
            coffersData.breakTimeData[door] = new Date();

            chatBiz.addSysData(62,[attackServerName,attackUserName,door,defenseUser.nickName]);
            chatBiz.addSysData(65,[attackServerName,attackUserName,door,defenseUser.nickName]);
            chatBiz.addSysData(63,[door]);
            chatBiz.addSysData(66,[door]);
        }

        var c = new ds.CoffersRecord();
        c.isWin = isWin;//是否胜利
        c.time = new Date();//时间
        c.attackName = attackUserName;//攻击玩家名
        c.serverName = attackServerName;//服务器名称
        c.door = door;//门
        c.defeseName = defenseUser.nickName;//防守玩家名
        c.recource = beResource;//得到的金币
        coffersData.defeseRecordArr.push(c);
        if (coffersData.defeseRecordArr.length > 100) coffersData.defeseRecordArr.shift();

        g_coffers.setCoffers(coffersData);


        cb(null, [0, personResource, coffersResource]);
    });

};

//掠夺防御
exports.lootCoffersDefense = function (client, hurt, breakNum, cb) {
    checkRequire();
    var coffersData = g_coffers.getCoffers();
    //得到金币，读取公式
    //部分给自己，部分给国库
    //战斗过程中，掠夺上限，返还消耗行动点
    var personResource = 0;
    var coffersResource = 0;

    //判断是否已经攻破
    var isOut = coffersUtils.checkIsOutLoot(coffersData.lvl,coffersData.resource);
    if (isOut) return cb(null, [2, personResource, coffersResource]);

    //getLootResource
    var beResource = coffersUtils.getLootResource(hurt,coffersData.resource,breakNum);
    if(beResource>coffersData.resource)  beResource = coffersData.resource;

    var lootRate =  c_game.coffers3[2];
    lootRate = lootRate.split(",");
    var personRate = parseInt(lootRate[0]);
    var coffersRate = parseInt(lootRate[1]);
    personResource = parseInt(beResource * personRate / 10000);
    if (personResource < 0) personResource = 0;
    coffersResource = parseInt(beResource * coffersRate / 10000);
    if (coffersResource < 0) coffersResource = 0;


    coffersData.resource -= beResource;
    coffersData.beLootResource += beResource;
    g_coffers.setCoffers(coffersData);
    cb(null, [0, personResource, coffersResource]);
};


//激励
exports.addBuff = function (client, userId, cb) {
    checkRequire();
    var coffersData = g_coffers.getCoffers();
    //0-4点不能够激励
    var nowDate = new Date();
    if(nowDate.getHours()<4){
        return cb("每日4:00-24:00才可以激励守卫");
    }
    userDao.selectCols(client, "id,lvl,vip,nickName,bag,counts,countsRefreshTime", "id = ?", [userId], function (err, userData) {
        if (err) return cb(err);
        //前几次免费
        //一定次数消耗元宝
        /*
         参数1:激励消耗道具ID
         参数2：每次激励所消耗道具数量
         参数3：每次激励增加的激励值
         参数4：1到10阶激活所需要的激励值
         参数5：1到10阶攻击加成（万分比）
         参数6：每日激励值重置时间
         参数7：连胜额外增加积分
         参数8：每日积分重置时间
         参数9：战胜获得积分
         */

        var addBuffValue = c_game.coffers2[2];

        var limitNum = c_vip[userData.vip].coffersBuff;
        //-1时不限制
        if(limitNum!=-1){
            var todayCount = userUtils.getTodayCount(userData, c_prop.userRefreshCountKey.coffersBuffNum);
            if (todayCount >= limitNum) return cb("今日已经没有次数!");
        }
        //消耗道具
        var needItemId = c_game.coffers2[0];
        var needItemNum = c_game.coffers2[1];

        var ownNum = userData.bag[needItemId]||0;
        if(ownNum<needItemNum) return cb("材料不足!");

        userUtils.delBag(userData.bag,needItemId,needItemNum);
        coffersUtils.addBuffExpc(coffersData, addBuffValue);

        userUtils.addTodayCount(userData, c_prop.userRefreshCountKey.coffersBuffNum, 1);
        g_coffers.setCoffers(coffersData);
        var updateUser = {
            counts: userData.counts,
            countsRefreshTime: userData.countsRefreshTime,
            bag: userData.bag
        };
        userDao.update(client, updateUser, {id: userData.id}, function (err, data) {
            if (err) return cb(err);
            var updateCoffers = {
                buffExpc: coffersData.buffExpc,
                buffLvl: coffersData.buffLvl
            };
            var delBagItems = {};
            delBagItems[needItemId] = needItemNum;
            cb(null, [updateCoffers, updateUser,addBuffValue,delBagItems]);
        });
    });

};


//建设国库
exports.build = function (client, userId, cb) {
    checkRequire();
    var coffersData = g_coffers.getCoffers();
    userDao.selectCols(client, "id,lvl,vip,nickName,diamond,giveDiamond,buyDiamond,bag,counts,countsRefreshTime,gold", "id = ?", [userId], function (err, userData) {
        if (err) return cb(err);
        //前几次免费
        //一定次数消耗元宝
        /*
         参数1：玩家建设国库免费次数
         参数2：玩家每次免费建设国库增加经验
         参数3：玩家第4次开始建设国库消耗元宝
         参数4：玩家可付费建设次数
         参数5：玩家每次付费建设国库增加经验
         */
        /*
         var freeNum = c_game.coffers[0];//
         var freeExpc = c_game.coffers[1];
         var freeGold = c_game.coffers[14];
         var diamondCost = c_game.coffers[2];//
         var diamondNum = c_game.coffers[3];//
         var diamondExpc = c_game.coffers[4];//
         var diamondGold = c_game.coffers[15];//

         var todayCount = userUtils.getTodayCount(userData, c_prop.userRefreshCountKey.coffersBuild);
         if (todayCount >= (freeNum + diamondNum)) return cb("今日已经没有次数!");

         var addBuildValue = 0;
         var addGold = 0;
         if (todayCount < freeNum) {
         addBuildValue = freeExpc;
         addGold = freeGold;
         coffersUtils.addExpc(coffersData, freeExpc);
         userUtils.addGold(userData,freeGold);
         } else {
         if(userData.gold<diamondCost) return cb("金币不足！");
         userUtils.addGold(userData, -diamondCost);
         addBuildValue = diamondExpc;
         addGold = diamondGold;
         coffersUtils.addExpc(coffersData, diamondExpc);
         userUtils.addGold(userData,diamondGold);
         }
         */

        var freeExpc = c_game.coffers[1];
        var freeGold = c_game.coffers[14];
        var addBuildValue = freeExpc;
        var addGold = freeGold;

        var limitNum = c_vip[userData.vip].coffersBuild;
        var todayCount = userUtils.getTodayCount(userData, c_prop.userRefreshCountKey.coffersBuild);
        if (todayCount >= limitNum) return cb("今日已经没有次数!");
        coffersUtils.addExpc(coffersData, freeExpc);
        userUtils.addGold(userData,freeGold);

        userUtils.addTodayCount(userData, c_prop.userRefreshCountKey.coffersBuild, 1);
        g_coffers.setCoffers(coffersData);
        var updateUser = {
            counts: userData.counts,
            countsRefreshTime: userData.countsRefreshTime,
            diamond: userData.diamond,
            giveDiamond: userData.giveDiamond,
            buyDiamond: userData.buyDiamond,
            bag: userData.bag,
            gold: userData.gold
        };
        userDao.update(client, updateUser, {id: userData.id}, function (err, data) {
            if (err) return cb(err);
            var updateCoffers = {
                buildValue: coffersData.buildValue,
                lvl: coffersData.lvl,
                resource: coffersData.resource
            };
            cb(null, [updateCoffers, updateUser,addBuildValue,addGold]);
        });
    });

};


//获取己方防守数据
exports.getDefeseData = function (client, userId, cb) {
    var coffersData = g_coffers.getCoffers();
    exports.calEnemyDefeseData(client, userId, coffersData, cb)
};
//获取敌方防守数据
exports.getEnemyDefeseData = function (client, userId, serverId, cb) {
    _getServerCoffersDataAndClient(serverId, function(err,data){
        if (err) return cb(err);
        var sClient = data[0];
        var sCoffersData = data[1];
        if (!sClient||!sCoffersData) return cb("没有数据");
        exports.calEnemyDefeseData(sClient, userId, sCoffersData, function(err,cofferUsers){
            if (err) return cb(err);
            var myCoffersData = g_coffers.getCoffers();
            //生命值提高
            var curDefenceValue = c_lvl[sCoffersData.lvl].cofferPower;
            var hpAdd = curDefenceValue/10000;

            var curDefenceAttackValue = sCoffersData.buffBase;
            var attackValueCfg = c_game.coffers2[4];
            attackValueCfg = attackValueCfg.split(",");
            curDefenceAttackValue += parseInt(attackValueCfg[sCoffersData.buffLvl]||0) ;
            var attackAdd = curDefenceAttackValue/10000;

            //个人收益
            var personRate = c_game.coffers[10];
            var personResource = parseInt(sCoffersData.resource * personRate / 10000);
            if (personResource < 0) personResource = 0;

            //国库收益
            var coffersRate = c_game.coffers[11];
            var coffersResource = parseInt(sCoffersData.resource* coffersRate / 10000);
            if (coffersResource < 0) coffersResource = 0;


            var breakNum = 0;
            var lootRate = 0;
            var breakTimeData = sCoffersData.breakTimeData;
            for(var doorKey in breakTimeData){
                var locIsBreak = coffersUtils.checkBreak(doorKey, breakTimeData);
                if(locIsBreak){
                    breakNum++
                    lootRate++;
                }
            }

            var todayLootNum = coffersUtils.getLootNum(serverId, userId, myCoffersData.lootUserData);

            var isOutLoot = coffersUtils.checkIsOutLoot(sCoffersData.lvl,sCoffersData.resource);
            var isCanLoot = isOutLoot ? 0 : 1;

            var exDefenceData = new ds.ExDefenceData();
            exDefenceData.cofferUserArr = cofferUsers;//守卫数据
            exDefenceData.hpAdd = hpAdd;//生命加成百分比
            exDefenceData.attackAdd = attackAdd;//生命加成百分比
            exDefenceData.personResource = personResource;//个人收益
            exDefenceData.coffersResource = coffersResource;//国库收益

            exDefenceData.lootRate = lootRate;//掠夺倍率
            exDefenceData.breakNum = breakNum;//击破数量
            exDefenceData.isCanLoot = isCanLoot;//是否还可以掠夺
            exDefenceData.todayLootNum = todayLootNum;//今日已掠夺次数
            exDefenceData.coffersLvl = sCoffersData.lvl;//国库等级
            exDefenceData.curResource = sCoffersData.resource;
            cb(null,exDefenceData);
        });
    });
};

exports.calEnemyDefeseData = function (client, userId, coffersData,cb) {
    var defeseData = coffersData.defeseData;
    var userIds = [];
    var userDefeseDic = {};
    for (var key in defeseData) {
        var locValue = defeseData[key];
        userIds.push(locValue[1]);
        userDefeseDic[locValue[1]] = locValue;
    }
    if (userIds.length <= 0) return cb(null, []);
    userDao.listCols(client, "id,serverId,iconId,lvl,vip,nickName,combat,medalTitle", " id in(?) ", [userIds], function (err, userArr) {
        if (err) return cb(err);
        var reArr = [];
        for (var i = 0; i < userArr.length; i++) {
            var locUser = userArr[i];
            var c = new ds.CofferUser();
            c.userId = locUser.id;//用户id
            c.serverId = locUser.serverId;//服务器id
            c.door = userDefeseDic[locUser.id][0];//门
            c.rankType = userDefeseDic[locUser.id][2];//头衔类型
            c.icon = locUser.iconId;//头像
            c.lvl = locUser.lvl;//等级
            c.vip = locUser.vip;//vip
            c.name = locUser.nickName;//名字
            c.combat = locUser.combat;//战力
            c.isLoot = _checkIsLoot(c.door, userId, project.serverId, defeseData);
            c.isBreak = coffersUtils.checkBreak(c.door, coffersData.breakTimeData);//是否击破
            c.medalTitle = locUser.medalTitle;//战力

            c.breakReplaySeconds = coffersUtils.getBreakReplaySeconds(c.door, coffersData.breakTimeData);

            reArr.push(c);
        }
        cb(null, reArr);
    });
};


exports.getServerArr = function (client, userId, cb) {
    var serverId = project.serverId;
    coffersGroupBiz.inServerList(client, serverId, function (err, serverArr) {
        if (err) return cb(err);
        var taskArr = [];
        for (var i = 0; i < serverArr.length; i++) {
            var locServerId = serverArr[i];
            if (locServerId == project.serverId) continue;
            taskArr.push(function (cb1) {
                _getCoffersServer(client, this[0], this[1], cb1);
            }.bind([userId, locServerId]));
        }

        async.parallel(taskArr, function (err, dataList) {
            if (err) return cb(err);
            var reArr = [];
            for (var i = 0; i < dataList.length; i++) {
                var locData = dataList[i];
                if (locData) reArr.push(locData);
            }
            cb(null, reArr);
        })
    });
};

var _getCoffersServer = function (client, userId, serverId, cb) {
    serverInfoDao.select(loginClient, {serverId: serverId}, function (err, serverData) {
        if (err) return cb(err);
        if (!serverData) return cb(null, null);
        serverInfoBiz.getServerClient(serverId, function (err, sClient) {
            if (err) return cb(err);
            if (!sClient) return cb(null, null);
            _requestGetCoffers(serverData.host,serverData.port, function (err, coffersData) {
                if (err) return cb(err);
                if (!coffersData) return cb(null, null);

                var c = new ds.CoffersServer();
                c.serverName = _getServerName(serverData);//服务器名
                c.serverId = serverId;//服务器id
                c.resource = coffersData.resource;//国库储量
                c.isLootArr = [];
                c.isLootArr[c_prop.offersDoorKey.qinglong] = _checkIsLoot(c_prop.offersDoorKey.qinglong, userId, project.serverId, coffersData.defeseData);//麒麟状态 0：未掠夺，1：已掠夺
                c.isLootArr[c_prop.offersDoorKey.baihu] = _checkIsLoot(c_prop.offersDoorKey.baihu, userId, project.serverId, coffersData.defeseData);//青龙状态 0：未掠夺，1：已掠夺
                c.isLootArr[c_prop.offersDoorKey.xuanwu] = _checkIsLoot(c_prop.offersDoorKey.xuanwu, userId, project.serverId, coffersData.defeseData);//白虎状态 0：未掠夺，1：已掠夺
                c.isLootArr[c_prop.offersDoorKey.zhuque] = _checkIsLoot(c_prop.offersDoorKey.zhuque, userId, project.serverId, coffersData.defeseData);//玄武状态 0：未掠夺，1：已掠夺
                c.isBreakArr = [];
                c.isBreakArr[c_prop.offersDoorKey.qinglong] = coffersUtils.checkBreak(c_prop.offersDoorKey.qinglong, coffersData.breakTimeData);//麒麟状态 0：未掠夺，1：已掠夺
                c.isBreakArr[c_prop.offersDoorKey.baihu] = coffersUtils.checkBreak(c_prop.offersDoorKey.baihu, coffersData.breakTimeData);//青龙状态 0：未掠夺，1：已掠夺
                c.isBreakArr[c_prop.offersDoorKey.xuanwu] = coffersUtils.checkBreak(c_prop.offersDoorKey.xuanwu, coffersData.breakTimeData);//白虎状态 0：未掠夺，1：已掠夺
                c.isBreakArr[c_prop.offersDoorKey.zhuque] = coffersUtils.checkBreak(c_prop.offersDoorKey.zhuque, coffersData.breakTimeData);//玄武状态 0：未掠夺，1：已掠夺
                cb(null, c);
            });
        });
    });
};

//结算
exports.settle = function (client, cb) {
    var coffersData = g_coffers.getCoffers();
    exports.calDefeseData(client, coffersData, function (err, data) {
        if (err) return cb(err);
        g_coffers.setCoffers(coffersData);
        return cb(null);
    });
};

//计算守卫者
exports.calDefeseData = function (client, coffersData, cb) {
    _calDefeseUserIds(client, function (err, data) {
        if (err) return cb(err);
        var userIds = data[0];
        var rankTypeDic = data[1];
        var defeseData = {"0": [], "1": [], "2": [], "3": [], "4": []};
        var randomUserIds = commonUtils.getRandomArray(userIds, userIds.length);
        var qinglongId = randomUserIds[0];
        var baihuId = randomUserIds[1];
        var xuanwuId = randomUserIds[2];
        var zhuuqeId = randomUserIds[3];
        //[门类型，用户id,头衔类型，被掠夺的对手id组]
        //门类型
        defeseData[c_prop.offersDoorKey.qinglong][0] = c_prop.offersDoorKey.qinglong;
        defeseData[c_prop.offersDoorKey.baihu][0] = c_prop.offersDoorKey.baihu;
        defeseData[c_prop.offersDoorKey.xuanwu][0] = c_prop.offersDoorKey.xuanwu;
        defeseData[c_prop.offersDoorKey.zhuque][0] = c_prop.offersDoorKey.zhuque;
        //用户id
        defeseData[c_prop.offersDoorKey.qinglong][1] = qinglongId;
        defeseData[c_prop.offersDoorKey.baihu][1] = baihuId;
        defeseData[c_prop.offersDoorKey.xuanwu][1] = xuanwuId;
        defeseData[c_prop.offersDoorKey.zhuque][1] = zhuuqeId;
        //头衔
        defeseData[c_prop.offersDoorKey.qinglong][2] = rankTypeDic[qinglongId];
        defeseData[c_prop.offersDoorKey.baihu][2] = rankTypeDic[baihuId];
        defeseData[c_prop.offersDoorKey.xuanwu][2] = rankTypeDic[xuanwuId];
        defeseData[c_prop.offersDoorKey.zhuque][2] = rankTypeDic[zhuuqeId];
        //被掠夺的对手数据
        defeseData[c_prop.offersDoorKey.qinglong][3] = [];
        defeseData[c_prop.offersDoorKey.baihu][3] = [];
        defeseData[c_prop.offersDoorKey.xuanwu][3] = [];
        defeseData[c_prop.offersDoorKey.zhuque][3] = [];

        coffersData.defeseData = defeseData;
        cb(null);
    });
};

//初始化数据
exports.init = function (client, cb) {
    coffersDao.select(client, {}, function (err, coffersData) {
        if (err) return cb(err);
        if (coffersData) {
            g_coffers.init(coffersData);
            if(coffersData.defeseData&&Object.keys(coffersData.defeseData).length>0){
                return cb(null);
            }else{
               return exports.reset(client,cb);
            }
        }
        var coffersEntity = new CoffersEntity();
        /** 等级 **/
        coffersEntity.lvl = 1;
        /*等级*/
        /** 建设值 **/
        coffersEntity.buildValue = 0;
        /*建设值*/
        /** 国库当前储量 **/
        coffersEntity.resource = c_lvl[1].coffersBase;
        /*国库当前储量*/
        /** 今日掠夺储量 **/
        coffersEntity.lootResource = 0;
        /*今日掠夺储量*/
        /** 今日被劫储量 **/
        coffersEntity.beLootResource = 0;
        /*今日被劫储量*/
        /** 守卫玩家数据 **/
        coffersEntity.defeseData = null;
        /*守卫玩家数据*/
        /** 防守记录 **/
        coffersEntity.defeseRecordArr = [];
        /*防守记录*/
        /** 掠夺成功记录 **/
        coffersEntity.lootRecordArr = [];
        /*掠夺成功记录*/
        exports.calDefeseData(client, coffersEntity, function (err, data) {
            if (err) return cb(err);
            coffersDao.insert(client, coffersEntity, function (err, data) {
                if (err) return cb(err);
                coffersEntity.id = data.insertId;
                g_coffers.init(coffersEntity);
                return cb(null);
            });
        });
    });
};

//战斗开始
exports.fightStart = function (client, userId, serverId, door, cb) {
    async.parallel([
        function (cb1) {
            _getServerCoffersDataAndClient(serverId, cb1);
        },
        function (cb1) {
            userDao.selectCols(client, "id,counts,countsRefreshTime", "id = ?", [userId], cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var sClient = data[0][0], severCoffersData = data[0][1], userData = data[1];
        //掠夺时间
        var robStart = c_game.coffers[12];
        var robEnd = c_game.coffers[13];
        var nowDate = new Date();
        if (nowDate.getHours() < robStart || nowDate.getHours() > robEnd) return cb(getMsg(c_msgCode.peaceTimeCantRobe));
        //行动力限制
        var needAction = c_game.coffers[8];
        var reAction = coffersUtils.getReAction(userData);
        if (reAction < needAction)  return cb(getMsg(c_msgCode.noBattlePoint));
        coffersUtils.addAction(userData, needAction);

        //被掠夺保护
        //var isLoot = _checkIsLoot(door, userId, serverId, severCoffersData.defeseData);
        //if (isLoot)  return cb(getMsg(c_msgCode.gatesRobed));
        var isBreak = coffersUtils.checkBreak(door, severCoffersData.breakTimeData);
        if (isBreak)  return cb(null,[null, null, null, null,1]);

        //获取守门人id
        var enemyId = severCoffersData.defeseData[door][1];
        //设置对手
        g_data.setPkEnemyId(userId, enemyId);

        var updateUser = {
            counts: userData.counts,
            countsRefreshTime: userData.countsRefreshTime
        };

        userDao.selectCols(sClient, "id,robotId,lvl,equipBag,nickName,isKing,rebirthLvl,medalData,medalTitle,propertyData", " id=? ", [enemyId], function (err, eUserData) {
            if (err) return cb(err);
            async.parallel([
                function (cb1) {
                    heroBiz.getPkList(sClient, eUserData, cb1);
                },
                function (cb1) {
                    userDao.update(client, updateUser, {id: userData.id}, cb1);
                }
            ], function (err, data) {
                if (err) return cb(err);
                var heroPkDataList = data[0];
                var heroList = heroPkDataList[0];
                coffersUtils.calHeroProp(heroList,severCoffersData.lvl,severCoffersData.buffLvl,severCoffersData.buffBase);
                //计算血量
                var otherDataList = heroPkDataList[1];
                var fightData = heroPkDataList[2];
                cb(null, [updateUser, heroList, otherDataList, fightData,0]);
            });
        });

    });
};


//战斗结束
exports.fightEnd = function (client, userId, serverId, door, isWin,cb) {
    checkRequire();
    //个人收益
    //国库增加储量值
    //防守记录
    //攻击记录
    var coffersData = g_coffers.getCoffers();
    async.parallel([
        function (cb1) {
            _getServerCoffersDataAndClient(serverId, cb1);
        },
        function (cb1) {
            userDao.selectCols(client, "id,lvl,nickName,gold,counts,countsRefreshTime,combat,iconId,coffersPoints,todayCoffersPoints,bag,coffersKillNum", "id = ?", [userId], cb1);
        },
        function (cb1) {
            serverInfoDao.select(loginClient,{serverId:serverId},cb1);
        },
        function (cb1) {
            serverInfoDao.select(loginClient,{serverId:project.serverId},cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var sClient = data[0][0], severCoffersData = data[0][1], userData = data[1],defenceServerData = data[2],attackServerData = data[3];
        if(!defenceServerData) return cb("没有该服务器信息!");

        //获取守门人id
        var enemyId = severCoffersData.defeseData[door][1];
        userDao.selectCols(sClient, "id,robotId,lvl,equipBag,nickName,isKing,combat,iconId", " id=? ", [enemyId], function (err, eUserData) {
            if (err) return cb(err);
            var curEnemyId = g_data.getPkEnemyId(userId);
            if (curEnemyId != enemyId) return cb("无效的挑战对手");
            //校验一下战斗力
            isWin = fightUtils.checkIsWinByCombat(isWin,userData.lvl,userData.combat,eUserData.combat);

            g_data.setPkEnemyId(userId, -111);
            //[攻击玩家id,攻击玩家名，服务器id,服务器名称,是否胜利]
            var severName = _getServerName(attackServerData);
            var attackData = [userData.id,userData.nickName,attackServerData.serverId,severName,isWin?1:0];

            _requestLoot(attackData,door,defenceServerData.host, defenceServerData.port, function(err,lootData){
                lootData = lootData||[0,0,0];
                var lootStatus = lootData[0];
                var lootPersonResource  = lootData[1];
                var lootCoffersResource  = lootData[2];

                var f = new ds.FightResult();
                f.winStatus = isWin?consts.winStatus.win:consts.winStatus.lose;//1：胜利，2：失败
                f.attackMember = [userData.nickName,userData.combat,userData.iconId];//攻击方信息 [名字,战力,头像id]
                f.beAttackMember = [eUserData.nickName,eUserData.combat,eUserData.iconId];//被攻击方信息 [名字,战力,头像id]

                f.coffersPerson = lootPersonResource;//个人收益增加
                f.coffersCommon = lootCoffersResource;//国库储量增加
                f.coffersStatus = lootStatus;

                if (err) {
                    f.coffersStatus = 3;
                    return cb(null,f);
                }



                if(lootStatus==1) return cb(null,f);

                if(lootStatus==2){
                    //返回体力
                    var needAction = c_game.coffers[8];
                    coffersUtils.addAction(userData, -needAction);
                }
                //自己得到资源
                userUtils.addGold(userData,lootPersonResource);
                //掠夺资源
                coffersData.resource+= lootCoffersResource;
                coffersData.lootResource+= lootCoffersResource;
                var addPoints = 0;
                var bagItems = {};
                //英雄记录
                if(isWin&&lootStatus==0){

                    var todayWin = userUtils.getTodayCount(userData,c_prop.userRefreshCountKey.coffersWin);
                    //增加积分
                    addPoints =  c_game.coffers2[8];
                    if(todayWin>0){
                        addPoints += c_game.coffers2[6];
                    }
                    userData.coffersPoints += addPoints;
                    userData.todayCoffersPoints += addPoints;
                    coffersData.points += addPoints;
                    coffersData.todayPoints += addPoints;

                    //得到物品
                    var getItemData = c_game.coffers3[4];
                    getItemData = getItemData.split(",");
                    var getItemId = parseInt(getItemData[0]);
                    var getItemNum = parseInt(getItemData[1]);
                    bagItems[getItemId] = getItemNum;
                    userUtils.saveItems(userData,bagItems);

                    userUtils.addTodayCount(userData,c_prop.userRefreshCountKey.coffersWin,1);

                    var defenceServerName = _getServerName(defenceServerData);//服务器名称
                    /*            第一个%s：我服玩家名
                     第二个%s：他服的服务器名
                     第三个%s：青龙、白虎、朱雀、玄武
                     第四个%s：玩家名
                     第五个%s：跨服战积分数*/
                    chatBiz.addSysData(64,[userData.nickName,defenceServerName,door,eUserData.nickName,addPoints]);
                    chatBiz.addSysData(67,[userData.nickName,defenceServerName,door,eUserData.nickName,addPoints]);

                    var c = new ds.CoffersRecord();
                    c.isWin = 1;//是否胜利
                    c.time = new Date();//时间
                    c.attackName = userData.nickName;//攻击玩家名
                    c.serverName = defenceServerName;//服务器名称
                    c.door = door;//门
                    c.defeseName = eUserData.nickName;//防守玩家名
                    c.recource = lootCoffersResource;//得到的金币
                    c.points = addPoints;
                    coffersData.lootRecordArr.push(c);
                    if (coffersData.lootRecordArr.length > 100) coffersData.lootRecordArr.shift();

                    //颁发勋章
                    var medalId = c_game.coffers3[5];
                    var medalData = t_medal[medalId];
                    var lootType = parseInt(medalData.lootArg[0]);
                    var lootValue = parseInt(medalData.lootArg[1]);
                    userData.coffersKillNum++;
                    if(userData.coffersKillNum>=lootValue){
                        userData.coffersKillNum = 0;
                        var mailItems = {};
                        mailItems[medalId] = 1;
                        mailBiz.addByType(client, userId, c_prop.mailTypeKey.coffersKill, [], mailItems, function(){});
                    }

                }else{
                    userUtils.changeTodayCount(userData,c_prop.userRefreshCountKey.coffersWin,0);
                }

                var updateUser = {
                    gold:userData.gold,
                    counts: userData.counts,
                    coffersPoints: userData.coffersPoints,
                    todayCoffersPoints: userData.todayCoffersPoints,
                    countsRefreshTime: userData.countsRefreshTime,
                    bag:userData.bag,
                    coffersKillNum:userData.coffersKillNum
                };
                var updateCoffers = {
                    resource:coffersData.resource,
                    lootResource:coffersData.lootResource,
                    points:coffersData.points,
                    todayPoints:coffersData.todayPoints
                };


                g_coffers.setCoffers(coffersData);

                userDao.update(client, updateUser, {id: userData.id}, function(err,data){
                    if(err) return cb(err);
                    delete updateUser.bag;
                    f.updateUser = updateUser;
                    f.updateCoffers = updateCoffers;
                    f.coffersPoints = addPoints;
                    f.bagItems = bagItems;
                    cb(null,f);
                });
            });

        });
    });
};


//战斗开始
exports.fightCoffersStart = function (client, userId, serverId, cb) {
    async.parallel([
        function (cb1) {
            _getServerCoffersDataAndClient(serverId, cb1);
        },
        function (cb1) {
            userDao.selectCols(client, "id,counts,countsRefreshTime", "id = ?", [userId], cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var sClient = data[0][0], severCoffersData = data[0][1], userData = data[1];
        var myCoffersData = g_coffers.getCoffers();

        //国库储量上限
        if(coffersUtils.checkIsOutLoot(severCoffersData.lvl,severCoffersData.resource)) return cb("国库已损失过多，不可再掠夺");

        //击破
        var isBreak1 = coffersUtils.checkBreak(c_prop.offersDoorKey.qinglong, severCoffersData.breakTimeData);
        var isBreak2 = coffersUtils.checkBreak(c_prop.offersDoorKey.baihu, severCoffersData.breakTimeData);
        var isBreak3 = coffersUtils.checkBreak(c_prop.offersDoorKey.xuanwu, severCoffersData.breakTimeData);
        var isBreak4 = coffersUtils.checkBreak(c_prop.offersDoorKey.zhuque, severCoffersData.breakTimeData);
        var breakNum = isBreak1+isBreak2+isBreak3+isBreak4;
        if(breakNum<=0) return cb(getMsg(c_msgCode.noGuardDown));

        //行动力
        var needAction = c_game.coffers3[6];
        var reAction = coffersUtils.getReAction(userData);
        if (reAction < needAction)  return cb(getMsg(c_msgCode.noBattlePoint));
        coffersUtils.addAction(userData, needAction);
        //休战时间
        var robStart = c_game.coffers[12];
        var robEnd = c_game.coffers[13];
        var nowDate = new Date();
        if (nowDate.getHours() < robStart || nowDate.getHours() > robEnd) return cb(getMsg(c_msgCode.peaceTimeCantRobe));
        //每日次数限制
        var lootNum = coffersUtils.getLootNum(serverId, userId, myCoffersData.lootUserData);
        if(lootNum>=c_game.coffers3[7]) return cb(getMsg(c_msgCode.noMoreRob));
        coffersUtils.addLootNum(serverId, userId, myCoffersData.lootUserData);

        //设置对手
        g_data.setPkEnemyId(userId, severCoffersData.id);
        g_data.setCoffersBreakNum(userId, breakNum);

        var updateUser = {
            counts: userData.counts,
            countsRefreshTime: userData.countsRefreshTime
        };

        g_coffers.setCoffers(myCoffersData);

        async.parallel([
            function (cb1) {
                userDao.update(client, updateUser, {id: userData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [updateUser,severCoffersData.lvl]);
        });
    });
};


//战斗结束
exports.fightCoffersEnd = function (client, userId, hurt, serverId, cb) {
    checkRequire();
    var coffersData = g_coffers.getCoffers();
    async.parallel([
        function (cb1) {
            _getServerCoffersDataAndClient(serverId, cb1);
        },
        function (cb1) {
            userDao.selectCols(client, "id,lvl,nickName,gold,counts,countsRefreshTime,combat,iconId,coffersPoints,todayCoffersPoints,bag", "id = ?", [userId], cb1);
        },
        function (cb1) {
            serverInfoDao.select(loginClient,{serverId:serverId},cb1);
        },
        function (cb1) {
            serverInfoDao.select(loginClient,{serverId:project.serverId},cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var sClient = data[0][0], severCoffersData = data[0][1], userData = data[1],defenceServerData = data[2],attackServerData = data[3];
        if(!defenceServerData) return cb("没有该服务器信息!");

        var curEnemyId = g_data.getPkEnemyId(userId);
        if (curEnemyId != severCoffersData.id) return cb("无效的挑战对手");
        g_data.setPkEnemyId(userId, -111);
        var breakNum = g_data.getCoffersBreakNum(userId);
        _requestLootCoffers(hurt,breakNum,defenceServerData.host, defenceServerData.port, function(err,lootData){
        //_requestLootCoffers(hurt,breakNum,"127.0.0.1", "24200", function(err,lootData){
            lootData = lootData||[0,0,0];
            var lootStatus = lootData[0];
            var lootPersonResource  = lootData[1];
            var lootCoffersResource  = lootData[2];

            var f = new ds.FightResult();
            f.winStatus = consts.winStatus.win;//1：胜利，2：失败

            f.coffersPerson = lootPersonResource;//个人收益增加
            f.coffersCommon = lootCoffersResource;//国库储量增加
            f.coffersStatus = lootStatus;
            f.coffersHurt = hurt;

            if (err) {
                f.coffersStatus = 3;
                return cb(null,f);
            }

            if(lootStatus==2){
                //返回体力
                var needAction = c_game.coffers3[6];
                coffersUtils.addAction(userData, -needAction);
            }
            //自己得到资源
            userUtils.addGold(userData,lootPersonResource);
            //掠夺资源
            coffersData.resource+= lootCoffersResource;
            coffersData.lootResource+= lootCoffersResource;

            var updateUser = {
                gold:userData.gold,
                counts: userData.counts,
                countsRefreshTime: userData.countsRefreshTime
            };
            var updateCoffers = {
                resource:coffersData.resource,
                lootResource:coffersData.lootResource
            };

            g_coffers.setCoffers(coffersData);

            userDao.update(client, updateUser, {id: userData.id}, function(err,data){
                if(err) return cb(err);
                delete updateUser.bag;
                f.updateUser = updateUser;
                f.updateCoffers = updateCoffers;
                cb(null,f);
            });
        });
    });
};



//重置
exports.reset = function(client,cb){
    coffersDao.select(client,{},function(err,coffersData) {
        if (err) return cb(err);

        var updateCoffersData = {};
        /** 国库当前储量 **/
        updateCoffersData.resource = c_lvl[coffersData.lvl].coffersBase;
        /*国库当前储量*/
        /** 今日掠夺储量 **/
        updateCoffersData.lootResource = 0;
        /*今日掠夺储量*/
        /** 今日被劫储量 **/
        updateCoffersData.beLootResource = 0;
        /*今日被劫储量*/
        /** 守卫玩家数据 **/
        updateCoffersData.defeseData = null;
        /*[门类型，用户id,头衔类型，被掠夺的对手id组]*/
        /** 防守记录 **/
        updateCoffersData.defeseRecordArr = [];
        /*防守记录*/
        /** 掠夺成功记录 **/
        updateCoffersData.lootRecordArr = [];
        /*掠夺成功记录*/
        /** 今日积分 **/
        updateCoffersData.todayPoints = 0;/*今日积分*/
        /** buff等级 **/
        updateCoffersData.buffLvl = 0;/*buff等级*/
        /** buff经验 **/
        updateCoffersData.buffExpc = 0;/*buff经验*/
        updateCoffersData.lootUserData = {};
        updateCoffersData.breakTimeData = {};

        exports.calDefeseData(client, updateCoffersData, function (err, data) {
            if (err) return cb(err);
            g_coffers.setCoffers(updateCoffersData);
            coffersDao.update(client, updateCoffersData, {id: coffersData.id}, cb);
        });
    });
};

//重置国库和个人累计积分
exports.resetPoints = function(client,cb){
    var coffersData = g_coffers.getCoffers();
    coffersData.points = 0;
    g_coffers.setCoffers(coffersData);
    //coffersPoints
    userDao.update(client, {coffersPoints:0}, {id: coffersData.id}, cb);
};


/**
 * 发送奖励
 * @param client
 * @param cb
 */
exports.sendAward = function(client, cb) {

    coffersDao.select(client,{},function(err,coffersData){
        if (err) return cb(err);
        _bakCoffers(client,coffersData);
        var openLvl = c_open.coffers.lvlRequired;
        var expireDay = c_game.coffers[16];
        userDao.listCols(client,"id,lvl"," lvl>=? and lastUpdateTime >= ? and robotId =0 ",[openLvl,(new Date()).addDays(-expireDay)], function (err, userList) {
            //arenaDao.listCols(client, "rank,userId", {}, function (err, rankList) {
            if (err) return cb(err);
            var max = 1000;//分1000一批插入
            var groupList = [];
            var tempCount = 0;
            var tempList = [];
            for (var i = 0; i < userList.length; i++) {
                var loUserData = userList[i];
                var items = {};
                //[金币，元宝，声望]
                var locGold = coffersUtils.getPersonResource(coffersData.resource,loUserData.lvl);
                if(locGold) items[c_prop.spItemIdKey.gold] = locGold;

                if(Object.keys(items).length==0) continue;
                var mailEntity = mailBiz.createEntityByType(loUserData.id, c_prop.mailTypeKey.coffers, [coffersData.resource,locGold], items);
                mailEntity.addTime = new Date();
                tempList.push(mailEntity);
                if(tempCount>=max){
                    tempCount = 0;
                    groupList.push(tempList.concat([]));
                    tempList.length =0;
                }
                tempCount++;
            }
            if(tempList.length >0){
                groupList.push(tempList.concat([]));
            }

            async.mapLimit(groupList,1, function (group, cb1) {
                mailBiz.addMailByList(client,group,cb1);
            }, function(err,data){
                if(err) return cb(err);
                exports.reset(client,cb);
            });
        });
    });

};

//获取掠夺记录
exports.getLootRecordArr = function(client,cb){
    var coffersData = g_coffers.getCoffers();
    cb(null,coffersData.lootRecordArr);
};

//获取防守掠夺记录
exports.defeseRecordArr = function(client,cb){
    var coffersData = g_coffers.getCoffers();
    cb(null,coffersData.defeseRecordArr);
};
/***********************************************private********************************************************/

var _bakCoffers = function(client,oldData,cb){
    var bakData = new CoffersBakEntity();
    for(var key in oldData){
        if(key=="id") continue;
        bakData[key] = oldData[key];
    }
    bakData.bakDate = (new Date()).addDays(-1).clearTime();
    coffersBakDao.insert(client,bakData,function(err,data){
        if(err) logger.error(err);
    });
};

var _getServerCoffersDataAndClient = function (serverId, cb) {
    serverInfoDao.select(loginClient, {serverId: serverId}, function (err, serverData) {
        if (err) return cb(err);
        if(!serverData) return  cb(null, [null, null]);
        serverInfoBiz.getServerClient(serverId, function (err, sClient) {
            if (err) return cb(err);
            if (!sClient) return cb(null, [null, null]);
            _requestGetCoffers(serverData.host, serverData.port, function (err, coffersData) {
                if (err) return cb(err);
                cb(null, [sClient, coffersData]);
            });
        });
    });
};


var _calDefeseUserIds = function (client, cb) {
    //竞技场1名
    //杀戮榜1名
    //剩余战力榜
    //取霸主1名
    //最多4个
    var userIds = [];
    var rankTypeDic = {};
    challengeCupDao.selectCols(client, "championUserId", "", [], function (err, challengeCupData) {
        if (err) return cb(err);
        if (challengeCupData && challengeCupData.championUserId) {
            userIds.push(challengeCupData.championUserId);
            rankTypeDic[challengeCupData.championUserId] = c_prop.coffersRankTypeKey.king;
        }
        arenaDao.getBakArenaRank1(client, userIds, function (err, arenaUserId) {
            if (err) return cb(err);
            if (arenaUserId) {
                userIds.push(arenaUserId);
                rankTypeDic[arenaUserId] = c_prop.coffersRankTypeKey.arena;
            }
            pkOutDao.getBakPkOutRank1(client, userIds, function (err, pkUserId) {
                if (err) return cb(err);
                if (pkUserId) {
                    userIds.push(pkUserId);
                    rankTypeDic[pkUserId] = c_prop.coffersRankTypeKey.pk;
                }
                userDao.getCombatRankNum(client, userIds, 4 - userIds.length, function (err, combatUserIds) {
                    if (err) return cb(err);
                    for (var i = 0; i < combatUserIds.length; i++) {
                        var locUserId = combatUserIds[i];
                        userIds.push(locUserId);
                        rankTypeDic[locUserId] = c_prop.coffersRankTypeKey.combat;
                    }
                    cb(null, [userIds, rankTypeDic]);
                });
            });
        });
    })
};


var _checkIsLoot = function (doorKey, userId, serverId, defeseData) {
    //没有这个状态了
    return 0;
    var lootArr = defeseData[doorKey][3] || [];
    var status = 0;
    for (var i = 0; i < lootArr.length; i++) {
        var locLootData = lootArr[i];
        var locUserId = locLootData[0];
        var locServerId = locLootData[1];
        if (locUserId == userId && locServerId == serverId) {
            status = 1;
            break;
        }
    }
    return status;
};


/**
 * 请求掠夺守卫门
 * @param attackData [攻击玩家id,攻击玩家名，服务器id,服务器名称,是否胜利]
 * @param door
 * @param serverHost
 * @param serverPort
 * @private
 */
var _requestLoot = function(attackData,door,serverHost,serverPort,cb){
    var args = {};
    var argsKeys = iface.admin_coffers_lootDefense_args;
    args[argsKeys.attackData] = attackData;
    args[argsKeys.door] = door;
    serverUtils.requestServer(iface.admin_coffers_lootDefense,args,serverHost,serverPort,cb);
};


/**
 * 请求掠夺国库
 * @param hurt
 * @param breakNum
 * @param serverHost
 * @param serverPort
 * @private
 */
var _requestLootCoffers = function(hurt,breakNum,serverHost,serverPort,cb){
    var args = {};
    var argsKeys = iface.admin_coffers_lootCoffersDefense_args;
    args[argsKeys.hurt] = hurt;
    args[argsKeys.breakNum] = breakNum;
    serverUtils.requestServer(iface.admin_coffers_lootCoffersDefense,args,serverHost,serverPort,cb);
};

/**
 * 请求国库数据
 * @param serverHost
 * @param serverPort
 * @param cb
 * @private
 */
var _requestGetCoffers = function(serverHost,serverPort,cb){
    var args = {};
    serverUtils.requestServer(iface.admin_coffers_getCache,args,serverHost,serverPort,cb);
};

var _getServerName = function(serverData){
   return serverData.mergerName?serverData.mergerName:(serverData.name+"-"+serverData.area);
};

//_requestLoot([24041,"s1.不需要了解","QQ浏览器专区-1服",10001,0],3,"121.43.191.197",51002,function(err,data){console.log(err,data)});

//_requestLoot([101770,"s2.名字","服务器名称"],2,"127.0.0.1",24200,function(err,data){console.log(err,data)});
