/**
 * Created by Administrator on 2014/5/9.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var c_lvl = uwData.c_lvl;
var c_hero = uwData.c_hero;
var c_genuineQi = uwData.c_genuineQi;
var c_demonLotus = uwData.c_demonLotus;
var t_itemLogic = uwData.t_itemLogic;
var c_prop = uwData.c_prop;
var c_vip = uwData.c_vip;
var t_talismanSkill = uwData.t_talismanSkill;
var t_copy = uwData.t_copy;
var t_item = uwData.t_item;
var t_copyLoot = uwData.t_copyLoot;
var t_monster = uwData.t_monster;
var t_medal = uwData.t_medal;
var t_medalLvl = uwData.t_medalLvl;
var c_giftPack = uwData.c_giftPack;
var formula = require("uw-formula");
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var UserEntity = require('uw-entity').UserEntity;
var project = require('uw-config').project;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var commonUtils = require("uw-utils").commonUtils;
var propUtils = require("uw-utils").propUtils;
var shopBiz = require("uw-shop").shopBiz;
var mainClient = require("uw-db").mainClient;
var loginClient = require("uw-db").loginClient
var taskBiz = require("uw-task").taskBiz;
var g_chat = require("uw-global").g_chat;
var g_redEnvelope = require("uw-global").g_redEnvelope;
var g_data = require("uw-global").g_data;
var g_boss = require("uw-global").g_boss;
var g_buff =  require("uw-global").g_buff;
var g_challengCup = require("uw-global").g_challengCup;
var g_guildWar = require("uw-global").g_guildWar;
var g_guild = require("uw-global").g_guild;
var g_lootConfig = require("uw-global").g_lootConfig;
var ds =  require("uw-ds").ds;
var exports = module.exports;
var refreshUtils = require("uw-utils").refreshUtils;
var biBiz = require('uw-log').biBiz;
var genuineQiObj = require('uw-log').genuineQiObj;

var userDao = null;
var userUtils = null;
var rankBiz = null;
var accountBiz = null;
var accountDao = null;
var mailBiz = null;
var heroBiz = null;
var copyBiz = null;
var pkOutDao = null;
var rechargeBiz = null;
var copyProgressDao = null;
var heroDao = null;
var heroPropHelper = null;
var lotteryDao = null;
var taskDao = null;
var itemBiz = null;
var arenaDao = null;
var serverInfoDao = null;
var guildPersonalBiz = null;
var bonusBiz = null;
var bossBiz = null;
var chatBiz = null;
var fightUtils = null;
var guildPersonalDao =null;
var demonLotusDao =null;
var treasureBiz = null;

var giftRefreshHour = 21;

var checkRequire = function(){
    userDao = userDao || require("uw-user").userDao;
    userUtils = userUtils || require("uw-user").userUtils;
    rankBiz = rankBiz || require("uw-rank").rankBiz;
    accountBiz = accountBiz || require("uw-account").accountBiz;
    accountDao = accountDao || require("uw-account").accountDao;
    mailBiz = mailBiz || require("uw-mail").mailBiz;
    heroBiz = heroBiz || require("uw-hero").heroBiz;
    copyBiz = copyBiz || require("uw-copy").copyBiz;
    pkOutDao = pkOutDao || require("uw-pkOut").pkOutDao;
    rechargeBiz = rechargeBiz || require("uw-recharge").rechargeBiz;
    heroDao = heroDao || require("uw-hero").heroDao;
    heroPropHelper = heroPropHelper || require('uw-hero').heroPropHelper;
    copyProgressDao = copyProgressDao || require('uw-copy').copyProgressDao;
    lotteryDao = lotteryDao || require("uw-lottery").lotteryDao;
    taskDao = taskDao || require("uw-task").taskDao;
    itemBiz = itemBiz || require("uw-item").itemBiz;
    arenaDao = arenaDao || require("uw-arena").arenaDao;
    serverInfoDao = serverInfoDao || require("uw-server-info").serverInfoDao;
    guildPersonalBiz = guildPersonalBiz || require("uw-guild").guildPersonalBiz;
    bonusBiz = bonusBiz || require("uw-bonus-share").bonusBiz;
    bossBiz = bossBiz || require("uw-boss").bossBiz;
    chatBiz = chatBiz || require("uw-chat").chatBiz;
    fightUtils = fightUtils || require("uw-fight").fightUtils;
    guildPersonalDao = guildPersonalDao || require("uw-guild").guildPersonalDao;
    demonLotusDao = demonLotusDao || require("uw-demon-lotus").demonLotusDao;
    treasureBiz = treasureBiz || require("uw-treasure").treasureBiz;
};


/**
 * 获取用户初始信息
 * @param client
 * @param accountId
 * @param loginKey
 * @param serverIndexId
 * @param cb
 */
exports.getInitData = function(client,accountId, loginKey,serverIndexId,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            accountDao.select(loginClient,{id:accountId},cb1);
        },
        function(cb1){
            userDao.select(client,{accountId:accountId,serverIndexId:serverIndexId},cb1);
        }
    ],function(err,data){
        if (err) return cb(err);
        var accountData = data[0], userData = data[1];
        if (!accountData || accountData.loginKey.indexOf(loginKey) <= -1) return cb("账号验证出错");
        if (!userData) return cb(null, []);
        if(accountData.status == consts.accountStatus.lock||accountData.status == consts.accountStatus.lockDevice) return cb(getMsg(c_msgCode.accountLockout));//
        serverInfoDao.select(loginClient,{serverId:userData.serverId},function(err,serverData){
            if (!serverData || serverData.status == consts.serverStatus.closed) return cb("服务器维护中....");
            accountData.exData[c_prop.accountExDataKey.lastLoginServer] = userData.serverId;
            var updateAcc = {
              exData:   accountData.exData
            };
            accountDao.update(loginClient, updateAcc, {id:accountId}, function(err, up){console.log(err);})
            _handleAndGetData(client, accountData, userData, cb);
        });
    });
};

//处理并且获得数据
var _handleAndGetData = function(client,accountData,userData,cb){
    _handleData(client,userData,function(err,handleData){
        if(err) return cb(err);
        _getOtherData(client,userData,function(err,otherData){
            if(err) return cb(err);
            cb(null,[accountData,userData,handleData,otherData]);
        })
    });
};

//处理数据
var _handleData = function(client,userData,cb){
    async.series([
        function(cb1){
            //实际上是创建普通副本
            copyBiz.getInfo(client,userData.id,c_prop.copyTypeKey.normal,cb1);
        },
        function(cb1){
            //
           exports.offlineEarnings(client,userData,cb1);
        },
        function(cb1){
            guildPersonalBiz.initGuildIdToGlobal(client, userData.id, cb1);
        }
    ],function(err,data){
        if (err) return cb(err);
        var offLineData = data[1];
        cb(null,[offLineData]);
    });
};
//获取其他数据
var _getOtherData = function(client, userData, cb){
    var userId = userData.id;
    async.parallel([
        function(cb1){
            rechargeBiz.getInfo(client,userId,cb1);
        },
        /*function(cb1){
         arenaRecordBiz.getHasNotRead(client,userId,cb1);
         },
         function(cb1){
         arenaRecordBiz.getHasNotReadArena(client,userId,cb1);
         },*/
        function(cb1){
            copyProgressDao.list(client,{userId:userId},cb1);
        },
        function(cb1){
            heroBiz.calAndGetHeroList(client,userData,cb1);
        },
        function(cb1){
            pkOutDao.select(client,{userId:userId},cb1);
        },
        function(cb1){
            lotteryDao.select(client,{userId:userId},cb1);
        },
        function(cb1){
            taskDao.select(client,{userId:userId},cb1);
        },
        function(cb1){
            arenaDao.select(client,{userId:userId},cb1);
        },
        function(cb1){
            guildPersonalDao.selectCols(client, "guildId", {userId:userId} ,cb1);
        },
        function(cb1){
            demonLotusDao.selectCols(client, "advanceLvl", {userId:userId} ,cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var rechargeData = data[0], copyProgressList = data[1], heroList = data[2], pkOut = data[3], lottery = data[4], task = data[5], arena = data[6], gp = data[7],demonLotusData = data[8];
        var guildId = (gp && gp.guildId)? gp.guildId : 0; //可能没有加过公会
        if(guildId){
            var guildData = g_guild.getGuild(guildId);
            if(guildData){
                guildData.lastLgTime = new Date();
                g_guild.setGuild(guildData.id,guildData);
            }
        }
        g_data.setGuildId(userId,guildId);
        if(userData.isKing){
            if(userData.lastUpdateTime.getSecondsBetween(new Date())>c_game.king[5]){
                chatBiz.addSysData(51,[userData.nickName]);
            }
        }
        userData.lastUpdateTime = new Date();
        //修正名字，有些名字是空的或者因为字符问题为空
        if(!userData.nickName || userData.nickName== ("s" +userData.serverIndexId +".")){
            userData.nickName = "s" +userData.serverIndexId +"."+ userData.id;
        }
        if(!userData.exData[c_prop.userExDataKey.genuineQi] && c_genuineQi[userData.lvl]){
            userData.exData[c_prop.userExDataKey.genuineQi] = [new Date()];
            var genuLimit = 0;
            var advanceLvl = 0;
            if(demonLotusData) advanceLvl = demonLotusData.advanceLvl;
            var genqiAccLimit = parseInt(c_demonLotus[advanceLvl].genqiAccLimit);
            genuLimit = parseInt(c_genuineQi[userData.lvl].genuLimit) + genqiAccLimit;    //真气上限
            userData.genuineQi = genuLimit;
        }

        userDao.update(client,userData,{id:userId},function(err,data){
            if (err) return cb(err);
            g_data.setUserLvl(userId,userData.lvl);
            g_data.setPreLootTime(userId,null);
            bossBiz.exitAllFight(client,userId,function(){});
            g_challengCup.exitFight(userId);
            var lootTypeArr = g_lootConfig.getLootTypeArr();
            cb(null,[rechargeData,copyProgressList,heroList,pkOut,lottery,task,arena,lootTypeArr]);
        });
    });
};


/**
 * 获取用户布阵信息
 * @param client
 * @param userId
 * @param cb
 */
exports.getHeroEmbattle = function(client,userId,cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if(err) return cb(err);
        var heroEmbattle = userData.heroEmbattle;
        cb(null,heroEmbattle);
    });
};

/**
 * 保存用户布阵信息
 * @param client
 * @param userId
 * @param HeroEmbattle
 * @param cb
 */
exports.setHeroEmbattle = function(client,userId,heroEmbattle, cb){
    checkRequire();
    userDao.update(client,{heroEmbattle:heroEmbattle},{id:userId},function(err,data){
        if(err) return cb(err);
        cb(null,heroEmbattle);
    });
};



/**
 *
 * @param client
 * @param accountId
 * @param name
 * @param heroTempId
 * @param sex
 * @param serverIndexId
 * @param cb
 */
exports.createUser = function(client,accountId,name,heroTempId,sex,serverIndexId,shareKey,cb){
    checkRequire();
    if(!accountId) return cb("accountId值为空！");
    async.series([
        function(cb1){
            userDao.select(client,{accountId:accountId,serverIndexId:serverIndexId},cb1);
        },
        function(cb1){
            accountDao.select(loginClient,{id:accountId},cb1);
        }
    ],function(err,data){
        if (err) return cb(err);
        var userData = data[0],accountData = data[1];
        if(userData) return cb(null,[userData,null]);
        if(name.indexOf(" ")>=0) return cb("角色名不能包含空格");
        if(name.indexOf("\n")>=0 || name.indexOf("\\n")>=0 || name.indexOf("\r")>=0 || name.indexOf("\\r")>=0|| name.indexOf("\"")>=0) return cb("角色名不能包含回车换行或双引号");
        name=name.replace("\\n","");name=name.replace("\n","");
        name=name.replace("\\r","");name=name.replace("\r","");
        name=name.replace("\"","");
        name = "s" +serverIndexId +"."+ name;
        userDao.select(client,{nickName:name},function(err,data) {
            if (err) return cb(err);
            if(data) return cb("角色名已经被占用！");
            //如果不存在则创建一个用户
            var userEntity = new UserEntity();

            //userEntity.signName = _getRandomSignName();
            /** 账号id **/
            userEntity.accountId = accountId;/*账号id*/
            /** 昵称 **/
            userEntity.nickName = name;/*昵称*/
            //userEntity.nickName = "s" +serverIndexId +"."+ name;/*昵称*/
            /** 金币 **/
            userEntity.gold = 0;/*金币*/
            /** 总钻石 **/
                //todo 临时999999
            userEntity.diamond = 0;/*钻石*/
            /** 绑定钻石 **/
            userEntity.giveDiamond = 0;/*绑定钻石，即送的钻石*/
            /** 非绑定钻石 **/
            userEntity.buyDiamond = 0;/*非绑定钻石，即购买的钻石*/
            /** 背包（只存放静态物品） **/
            userEntity.bag = {};/*背包(只存放静态物品，格式：{&quot;物品id&quot;:数量,&quot;物品id&quot;:数量.............})*/
            /** 等级 **/
            userEntity.lvl = 1;/*等级(不同于英雄等级)*/
            /** 经验 **/

            userEntity.expc = 0;/*经验*/
            /** 体力 **/
            userEntity.strength = 0;/*体力*/
            /** VIP等级 **/
            userEntity.vip = 0;/*VIP等级*/
            /** VIP积分 **/
            userEntity.vipScore = 0;/*VIP积分*/
            /** 荣誉值 **/
            userEntity.honor = 0;/*荣誉值*/

            /** 扩展数据 **/
            userEntity.exData = {};/*刷新数据
             {key:value}
             具体看c_prop的userExData*/
            /** 战力 **/
            userEntity.combat = 0;/*战力*/
            /** 成就数据 **/
            userEntity.honorData = null;/*成就数据
             {&quot;id&quot;:[是否完成，是否领取],&quot;id&quot;:[是否完成，是否领取],..........}*/

            /** 刷新次数数据 **/
            userEntity.counts = null;/*刷新数据

             /** 刷新次数数据 **/
            userEntity.countsRefreshTime = null;/*刷新数据

             {key:value}
             具体看c_prop的userRefreshCount*/
            /** 头像 **/
            userEntity.iconId = getIconId(heroTempId,sex) ;/**/
            /** 签到数据 **/
            userEntity.sign = [];/*签到数据,[签到次数,最近一次签到时间]*/
            /** 活动数据 **/
            userEntity.activity = {};
            userEntity.lastUpdateTime = new Date();
            userEntity.createTime = new Date();
            userEntity.sdkChannelId = accountData.sdkChannelId;

            userEntity.serverId = project.serverId;
            userEntity.serverIndexId = serverIndexId;
            userEntity.equipBag = {};
            userEntity.medalData = {};
            userEntity.propertyData = {};

            userDao.insert(client, userEntity, function(err, data){
                if(err) return cb(err);
                userEntity.id = data.insertId;
                //lvl ,equipBag, id,rebirthLvl,medalData,isKing,propertyData

                heroBiz.createByTempId(client,userEntity,heroTempId,sex,0,function(err,heroData){
                    if(err) return cb(err);
                    accountBiz.addUserServer(mainClient,accountId,project.serverId,userEntity.id,client,function(){});
                    cb(null,[userEntity,heroData]);
                });
                if (shareKey)
                    bonusBiz.inviteeLogin(client, userEntity.id, shareKey, function(){});
            });
        });
    });
};

/**
 * 改名字
 * @param client
 * @param name
 * @param userId
 * @param heroTempId
 * @param cb
 */
exports.changeName = function (client, name, heroTempId, userId, cb) {
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if(!userData.nickName){
            //限制长度
            var nameLength = commonUtils.getStringLength(name);
            if(nameLength>14) return cb(getMsg(c_msgCode.roleNameOutLenght));//长度超出啦
            //过滤敏感字符
            if(commonUtils.checkFuckWord(name)) return cb(getMsg(c_msgCode.sensitiveInRoleName));

            userDao.select(client, {nickName: name}, function (err, data) {
                if (err) return cb(err);
                if (data)  return cb(getMsg(c_msgCode.roleNameUsed));//已经存在该名字
                //创建英雄
                var updateData = {
                    nickName:name,
                    iconId:heroTempId
                };

                async.parallel([
                    function(cb1){
                        userDao.update(client, updateData, {id:userId},cb1);
                    },
                    function(cb1){
                        heroBiz.createByTempId(client,userId,heroTempId,cb1)
                    }
                ],function(err,data){
                    if(err) return cb(err);
                    var heroData = data[1];
                    cb(null,[updateData,heroData]);
                });
            });
        }else{
            return cb("已设置用户名");
        }
    });
};

/**
 * 升级
 * @param client
 * @param userId
 * @param cb
 */
exports.upLvl = function(client,userId,cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if(err) return cb(err);
        userUtils.calGold(userData);
        var lvl = userData.lvl;     //当前等级
        var maxLvl = c_game.userMaxLvl[0];      //用户最高等级
        if(lvl>=maxLvl) return cb(getMsg(c_msgCode.roleLvMax));
        var calUserLvlCost = c_lvl[lvl + 1].upUserCost;     //升到下一级所需消耗
        var upUserCostType = c_lvl[lvl + 1].upUserCostType;     //升到下一级类型

        var costGold = 0;//这个数值，外面记录需要
        var costDiamond = 0;//这个数值，外面记录需要
        //金币
        if(upUserCostType==1){
            if(userData.gold < calUserLvlCost) return cb(getMsg(c_msgCode.noGolds));
            costGold = calUserLvlCost;
            //消耗
            userUtils.addGold(userData,-calUserLvlCost);
        }else{
            //钻石
            if(userData.diamond < calUserLvlCost) return cb(getMsg(c_msgCode.noGolds));
            costDiamond = calUserLvlCost;
            //消耗
            userUtils.reduceDiamond(userData,calUserLvlCost);
        }

        //影响属性
        var ownRate = 0, newRate = 0;
        newRate = c_lvl[lvl + 1].upUserCostRate;
        //攻击、防御、生命、暴击
        userData.attack += newRate*c_game.userLvl[0];
        userData.defence += newRate*c_game.userLvl[1];
        userData.hp += newRate*c_game.userLvl[2];
        userData.crit += newRate*c_game.userLvl[3];

        //获取随即英雄
        var lvlData = c_lvl[lvl + 1];
        var randomHeroData = userUtils.getRandomHeroData(consts.heroGetType.normal,lvlData.upUserHeroType,lvlData.upUserHero,userData);

        for(var key in randomHeroData){
            var locId = parseInt(key);
            var locNum = parseInt(randomHeroData[key]);
            userUtils.addHero(userData,locId,locNum);
        }

        userUtils.calHeroRecord(userData);
        userUtils.calHeroProduceFix(userData);
        //随即获得小弟
        var updateData = {
            lvl:lvl+1,
            diamond:userData.diamond,
            record: userData.record,
            gold:userData.gold,
            goldAddCount:userData.goldAddCount,
            lastCalGoldTime:userData.lastCalGoldTime,
            attack:userData.attack,
            defence:userData.defence,
            hp:userData.hp,
            crit:userData.crit,
            heroSum:userData.heroSum,
            heroStarSum:userData.heroStarSum,
            produceFix:userData.produceFix,
            producePer:userData.producePer,
            copyWipeRate:userData.copyWipeRate,
            heroData: userData.heroData
        };

        userDao.update(client,updateData,{id:userId},function(err,data){
            if(err) return cb(err);
            cb(null,[updateData,costGold,costDiamond]);
        });

    });
};

/**
 * 同步信息
 * @param client
 * @param sendData
 * @param userId
 * @param cb
 */
exports.syncData = function(client, sendData, userId,cb){
    checkRequire();
    var isChat = 0;
    var isGuildChat = 0;
    var isRedEnvelope = 0;
    var isTask = 0;
    var isDealPk = 0;
    var isKefu = 0; //是否有客服消息
    var isSysMsg = 0;
    var isRankDealPk = 0;
    var isBePkKill = 0;
    var isInspire = 0;
    var openBossIds = [];
    var guildWarIsOpen = 0;

    var lastId = sendData[0];
    var taskUpdateId = sendData[1];
    var kefuId = sendData[2];
    var sysMsgId = sendData[3];
    var inspireNum = sendData[4];
    var redLastId = sendData[5];
    var guildLastId = sendData[6];
    var guildId = sendData[7];

    var curChatUID = g_chat.getCurUID();
    if(lastId!=curChatUID){
        isChat = 1;
    }

    var curChatGID = g_chat.getCurGID(guildId);
    if(guildLastId!=curChatGID){
        isGuildChat = 1;
    }

    var curRedEnvelopeUID = g_redEnvelope.getCurUID();
    if(redLastId!=curRedEnvelopeUID){
        isRedEnvelope = 1;
    }

    //todo 请求数据库太频繁，先注释掉
    //var curTaskUpdateId = g_data.getTaskUpdateId(userId);
    //if(taskUpdateId!=curTaskUpdateId){
    //    isTask = 1;
    //}

    var hasDealPk = g_data.getHasDealPk(userId);
    if(hasDealPk){
        isDealPk = 1;
    }

    var bePkKill = g_data.getBePkKill(userId);
    if(bePkKill){
        isBePkKill = 1;
    }

    //暂未实现
    isKefu = 0;

    if (sysMsgId != g_chat.getLastSysMsgId()) {
        isSysMsg = 1;
    }

    var hasRankDealPk = g_data.getHasRankDealPk(userId);
    if(hasRankDealPk){
        isRankDealPk = 1;
    }

    var isGuildChange = g_data.getGuildChange(userId);
    //todo 临时注释
    /*
    if(inspireNum != bossBiz.getInspireNum(userId,null)){
        isInspire = 1;
    }

    if(g_boss.isOpen()){
        var bossData = g_boss.getBossData();
        if(!bossData.isOver)
            isBossOpen = 1;
    }*/
    openBossIds = g_boss.getOpenBossIds();

    var buffArr =  fightUtils.getBuffArr();

    guildWarIsOpen = g_guildWar.isOpen();

    var exData = new ds.AsyncData();
    exData.chat = isChat;
    exData.task = isTask;
    exData.pkDeal = isDealPk;
    exData.rankPkDeal = isRankDealPk;

    //hd {
    exData.kefu = isKefu;
    exData.sysMsg = isSysMsg;
    //hd }

    exData.bePkKill = isBePkKill;
    exData.inspire = isInspire;
    exData.isBossOpen = openBossIds;
    exData.redEnvelope = isRedEnvelope;
    exData.buffArr = buffArr;
    exData.guildChat = isGuildChat;
    exData.isGuildChange = isGuildChange;
    exData.guildWarIsOpen = guildWarIsOpen;

    cb(null,exData);

};


/**
 * 同步信息2
 * @param client
 * @param userId
 * @param cb
 */
exports.syncData2 = function(client,userId,cb){
    checkRequire();

    userDao.update(client,{lastUpdateTime:new Date()},{id:userId},function(){});

    var asyncData2 = new ds.AsyncData2();
    asyncData2.lastUpdateTime = new Date();//最后更新时间
    asyncData2.lootTypeArr = g_lootConfig.getLootTypeArr();//掉落的类型组
    cb(null,asyncData2);
};

/**
 * 购买金币
 * @param client
 * @param userId
 * @param cb
 */
exports.buyGold = function (client, userId,  cb) {
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if (err) return cb(err);
        var buyData = _getBuyGoldData(userData);
        var getGold = buyData[0],costDiamond = buyData[1];      //,buyCount = buyData[2],maxCount = buyData[3];

        //if (buyCount >= maxCount) return cb(getMsg(c_msgCode.cantUseMax, buyCount));//购买次数不能超过限制

        //判断被扣除钻石
        if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));//钻石不足

        //改变次数
        userUtils.addTodayCount(userData, c_prop.userRefreshCountKey.buyGold, 1);
        //扣除钻石
        userUtils.reduceDiamond(userData,costDiamond,consts.diamondConsumeType.user_3,"");

        //增加的金币
        userUtils.addGold(userData, getGold);

        //需要更新的数据
        var updateData = {};
        updateData.diamond = userData.diamond;//砖石
        updateData.giveDiamond = userData.giveDiamond;
        updateData.buyDiamond = userData.buyDiamond;
        updateData.gold = userData.gold;//金币
        updateData.counts = userData.counts;
        updateData.countsRefreshTime = userData.countsRefreshTime;

        userDao.update(client,updateData,{id:userId},function (err,data) {
            if(err) return cb(err);
            cb(null,[updateData,,costDiamond]);
        });
    });
};

/**
 * 购买凌云石
 * @param client
 * @param userId
 * @param cb
 */
exports.buyLingyun = function (client, userId,  cb) {
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if (err) return cb(err);

        var items = {};
        var getLingyun = c_game.buyLingyunCfg[0]|| 0;
        if(getLingyun <= 0) return cb("数据异常");
        items["56"] = getLingyun;
        var buyCount = userUtils.getTodayCount(userData, c_prop.userRefreshCountKey.buyLingyun);
        var costDiamond = 999999;
        var cosArr = c_game.buyLingyunCfg[1].split(";")||[];
        var lastArr = cosArr[cosArr.length - 1].split(",")||[];
        if((buyCount + 1)>=lastArr[0]){
            costDiamond = parseInt(lastArr[1])/10*getLingyun;
        }else{
            for(var i = 0;i<cosArr.length;i++){
                var costDiaArr = cosArr[i].split(",")||[];
                if(costDiaArr[0] && costDiaArr[1]){
                    if((buyCount + 1)<=costDiaArr[0]){
                        costDiamond = parseInt(costDiaArr[1])/10*getLingyun;
                        break;
                    }
                }
            }
        }
        var maxCount = c_vip[userData.vip].buyLingyunCount;
        if (buyCount >= maxCount) return cb(getMsg(c_msgCode.cantBusMax));//购买次数不能超过限制

        //判断被扣除钻石
        if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));//钻石不足

        //改变次数
        userUtils.addTodayCount(userData, c_prop.userRefreshCountKey.buyLingyun, 1);
        //扣除钻石
        userUtils.reduceDiamond(userData,costDiamond);

        //增加凌云石
        var itemsArr = userUtils.saveItems(userData,items);

        //需要更新的数据
        var updateData = {
            gold:userData.gold,
            honor:userData.honor,
            diamond:userData.diamond,
            prestige:userData.prestige,
            giveDiamond : userData.giveDiamond,
            buyDiamond : userData.buyDiamond,
            bag:userData.bag,
            equipBag:userData.equipBag,
            counts:userData.counts,
            countsRefreshTime:userData.countsRefreshTime
        };

        userDao.update(client,updateData,{id:userId},function (err,data) {
            if(err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            cb(null,[updateData,costDiamond,items]);
        });
    });
};

/**********************************************************/
var getIconId = function(heroTempId,sex){
    var iconId = 1;
    if(heroTempId==c_prop.heroJobKey.zs){
        if(sex==c_prop.sexKey.male){
            iconId = c_prop.roleIconKey.zs_nan;
        }else{
            iconId = c_prop.roleIconKey.zs_nv;
        }
    }

    if(heroTempId==c_prop.heroJobKey.fs){
        if(sex==c_prop.sexKey.male){
            iconId = c_prop.roleIconKey.fs_nan;
        }else{
            iconId = c_prop.roleIconKey.fs_nv;
        }
    }

    if(heroTempId==c_prop.heroJobKey.ds){
        if(sex==c_prop.sexKey.male){
            iconId = c_prop.roleIconKey.ds_nan;
        }else{
            iconId = c_prop.roleIconKey.ds_nv;
        }
    }

    return iconId;
};

/**
 * 获取购买金币获得数量和所需钻石
 * @returns [得到金币，消耗元宝，已经购买次数，最大购买次数]
 */
var _getBuyGoldData = function(userData){
    var lvl = userData.lvl;
    var buyCount = userUtils.getTodayCount(userData, c_prop.userRefreshCountKey.buyGold);
    var zengLiang = c_game.goldBuySet[0];
    var jiShu = c_lvl[lvl].buyGoldMult;
    var getGold = formula.calBuyGold(buyCount+1,zengLiang,jiShu);
    var costDiamond = formula.calBuyGoldDiamond(buyCount+1);
    //var maxCount = _getBuyGoldMaxCount(userData);
    return [getGold,costDiamond,buyCount];     //[getGold,costDiamond,buyCount,maxCount];
};

//获取每天可以购买的次数
var _getBuyGoldMaxCount = function(userData) {
    var vip = userData.vip;
    var maxCount = c_vip[vip].goldCount;//获取该玩家的最大购买次数
    return maxCount;
};

/**
 * 红点提示
 * @param client
 * @param userId
 * @return [成就是否有红点（0/1），挑战是否有红点（0/1）]  1为有红点
 */
exports.getRedPoint = function(client,userId,cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if(err) return cb(err);
        var redDot = [];
        var redDotHo = 0;
        var redDotPk = 0;
        var nowTime = new Date();
        var honorData = userData.honorData;
        var arenaData = userData.arenaData;
        var combat = userUtils.calCombat(userData);     //战斗力计算
        //判断有无成就可以领取
        for(var key in honorData){
            if(honorData[key][1] === 0){
                redDotHo = 1;
                break;
            }
        }
        //判断排位赛有开启，并且有次数、不在cd
        if(combat >= c_game.pkCfg[4]){
            if(arenaData[0] > 0){       //挑战次数大于0
                if(!arenaData[1] || nowTime.isAfter(new Date(arenaData[1]))){
                    redDotPk = 1;
                }
            }
        }
        redDot[0] = redDotHo;
        redDot[1] = redDotPk;
        cb(null,redDot);
    });
};

//更新引导
exports.updateGuide = function (client, userId, guideId, cb) {
    _updateExData(client, userId, c_prop.userExDataKey.guide, guideId, cb);
};

//更新自动挑战
exports.setAutoFight = function (client, userId, isAuto, cb) {
    _updateExData(client, userId, c_prop.userExDataKey.autoFight, isAuto, cb);
};

//更新时间报错次数
exports.setTimeError = function (client, userId, cb) {
    checkRequire();
    userDao.selectCols(client, "exData", {id:userId}, function(err,userData) {
        if (err) return cb(null);
        var timeErrorNum = userData.exData[c_prop.userExDataKey.timeError]||0;
        timeErrorNum++;
        userData.exData[c_prop.userExDataKey.timeError] = timeErrorNum;
        var updateData ={
            exData:userData.exData
        };
        userDao.update(client,updateData,{id:userId},function(err,data){
            if(err) return cb(err);
            cb(null,updateData);
        });
    });
};

//更新杀戮榜今天挑战赢
exports.setTodayRankWin = function (client, userId, eid, cb) {
    userDao.selectCols(client,"exData"," id = ?",[userId],function(err,userData){
        if(err) return cb(err);
        var winData = userData.exData[c_prop.userExDataKey.todayRankWin] || [];
        var time = winData[0];
        if(!time) time = new Date();
        var timeDate = new Date(time);
        var eids = winData[1]||[];
        if(!(new Date()).equalsDay(timeDate)){
            time =  new Date();
            eids = [];
        }
        if(eids.indexOf(eid)<=-1){
            eids.push(eid);
        }
        winData = [time,eids];

        _updateExData(client, userId, c_prop.userExDataKey.todayRankWin, winData, cb);
    });
};

/**
 * 获取绑定手机的url
 * @param mainClient
 * @param accountId
 * @param cb
 */

exports.getBindPhoneUrl = function(mainClient, accountId, cb){
    accountDao.selectCols(loginClient,"name","id=?",[accountId],function(err, accountData){
        if(err) return cb(err);
        var hgameBiz = require('uw-sdk').hgameBiz;
        hgameBiz.getBindPhoneUrl(accountData.name, function(err, data){
            if(err) return cb(err);
            cb(null, data)
        })
    });
};


/**
 * 保存桌面成功
 * @param client
 * @param userId
 * @param type
 * @param cb
 */
exports.saveDeskSuccess = function(client,userId,type,cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if(err) return cb(err);
        var items = null;
        var mailType = null;
        if(type==c_prop.userRecordTypeKey.saveDesk){
            //判断今日次数
            var saveDeskCount = userData.record[c_prop.userRecordTypeKey.saveDesk]||0;
            if(saveDeskCount>=1) return cb(getMsg(c_msgCode.collectSuccess));
            userData.record[c_prop.userRecordTypeKey.saveDesk] = 1;

            items = commonUtils.strToObj(c_game.otherReward[0]);

            mailType = c_prop.mailTypeKey.saveDesk;
        }
        if(type==c_prop.userRecordTypeKey.linkShare){
            //判断今日次数
            var saveDeskCount = userData.record[c_prop.userRecordTypeKey.linkShare]||0;
            if(saveDeskCount>=5) return cb(null,{});
            saveDeskCount++;
            userData.record[c_prop.userRecordTypeKey.linkShare] = saveDeskCount;
            items = {};
            items[c_prop.spItemIdKey.diamond] = 60;
            mailType = c_prop.mailTypeKey.linkShare;
        }
        if(type==c_prop.userRecordTypeKey.bindPhone){
            var saveDeskCount = userData.record[c_prop.userRecordTypeKey.bindPhone]||0;
            if(saveDeskCount) return cb(null,{});
            saveDeskCount = 1;
            userData.record[c_prop.userRecordTypeKey.bindPhone] = saveDeskCount;
            items = {};
            items = commonUtils.strToObj(c_game.otherReward[1]);
            //items[c_prop.spItemIdKey.diamond] = 60;
            mailType = c_prop.mailTypeKey.bindPhone;
        }

        var updateUser = {
            record:userData.record
        };

        async.parallel([
            function(cb1){
                userDao.update(client,updateUser,{id:userId},cb1);
            },
            function(cb1){
                if(items){
                    mailBiz.addByType(client, userId, mailType, null, items, cb1);
                }else{
                    cb1();
                }
            }
        ],function(err,data){
            if(err) return cb(err);
            cb(null,updateUser);
        });

    });
};

/**
 * 购买背包格子
 * @param client
 * @param userId
 * @param cb
 */
exports.buyBagGrid = function(client,userId,cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData) {
        if (err) return cb(err);
        var equipBagBuyCount = userData.equipBagBuyCount||0;        //购买次数
        var cosDiamond = formula.callBuyEquipBag(equipBagBuyCount);     //消耗钻石
        if(userData.diamond < cosDiamond) return cb("元宝不足");
        var addCount = c_game.equipBagCfg[1] + c_vip[userData.vip].addEquipBag;     //购买加的格数

        //次数添加
        userData.equipBagBuyCount = equipBagBuyCount + 1;
        //扣除钻石
        userUtils.reduceDiamond(userData,cosDiamond);

        //更新
        var updateData = {
            diamond: userData.diamond,
            buyDiamond:userData.buyDiamond,
            giveDiamond:userData.giveDiamond,
            equipBagBuyCount:userData.equipBagBuyCount
        };
        userDao.update(client,updateData,{id:userId},function (err,data) {
            if(err) return cb(err);
            cb(null,[updateData,cosDiamond]);
        });
    });
};

/**
 * 计算离线收益
 * @param client
 * @param userData
 * @param cb
 */
exports.offlineEarnings = function(client,userData,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            copyProgressDao.select(client,{userId:userData.id,copyType:c_prop.copyTypeKey.normal},cb1);
        },
        function(cb1){
            heroDao.list(client, {userId: userData.id}, cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var copyProgressData = data[0],heroList = data[1];
        var returnArr = [0,0,0,0,0,0,[]];     //[离线时间（）秒、获得经验、获得金币、装备等级、件数、自动getCHe件数、[[id,铜宝箱件数]、[id,银宝箱件数]、[id,金宝箱件数]]]
        var nowTime = new Date();
        var lastUpdateTime = userData.lastUpdateTime;       //更新时间
        if(!lastUpdateTime) return cb(null,returnArr);
        var offlineDed = c_game.offlineCfg[0];      //离线N秒后开始进入离线时间
        var offlineLimit1 = c_game.offlineCfg[1];        //离线0至8小时时间(秒)（100%经验）
        var offlineLimit2 = c_game.offlineCfg[2];        //离线8至24小时获得经验（秒）（80%经验）
        var second = (nowTime.getTime()-lastUpdateTime.getTime())/1000;
        second = second - offlineDed;
        if(second < 0) return cb(null,returnArr);
        var addGold = 0;        //获得金币
        var addExp = 0;     //获得经验
        var addEquipCount = 0       //获得装备数量
        var equipItems = {};
        var equipGold = 0;      //超出装备转化金币
        if(second > 0){
            returnArr[0] = parseInt(second);
            if(second > offlineLimit2) second = offlineLimit2;

            //旧数据
            var copyObj = copyProgressData.copyObj||{};
            var copyId = 1;
            if(commonUtils.getLastKey(copyObj)) copyId = parseInt(commonUtils.getLastKey(copyObj));
            if(!t_copy[copyId]) copyId = 1;

            var onlineLootData = userData.onlineLootData;
            var perExpc = onlineLootData[0],perGold = onlineLootData[1],perMonsterSec = onlineLootData[2],hasCount = onlineLootData[3];
            var addRate1 = 0.85;
            var addRate2 = 0.7;
            var monsterTotal = 3;     //一波怪的数量
            var aMonsterTime = 0;   //击杀一波怪所需秒数

            //todo
            if(false){
                addExp = parseInt(perExpc*second*addRate1);
                addGold = parseInt(perGold*second*addRate1);
            }else{
                var offlineGold = parseInt((parseInt(t_copyLoot[t_copy[copyId].loot].moneyMin) + parseInt(t_copyLoot[t_copy[copyId].loot].moneyMax))/2);
                //var offlineExp = parseInt(t_monster[t_copy[copyId].randMonsters[0]].userExp);
                addGold = formula.callOfflineGold(offlineGold,userData.lvl,second);      //a:当前所在的普通关卡ID;b:领主等级;c:离线时间(秒)

                var heroDps = 0;
                var tMonster = t_monster[t_copy[copyId].randMonsters[0]];       //当前怪物表数据
                monsterTotal = t_copy[copyId].monsterTotal;     //一波怪的数量
                for(var i = 0; i < heroList.length; i++){
                    var locHero = heroList[i];
                    heroDps += heroPropHelper.getDamagePerSec(locHero,tMonster,userData.lvl);
                }
                var findMonsterSec = 5.3;//每波怪寻怪时间
                var sumHp = monsterTotal*tMonster.maxHp;     //一波怪总血量
                aMonsterTime = sumHp/heroDps+findMonsterSec;  //击杀一波怪所需秒数

                if(aMonsterTime<5) aMonsterTime = 5;
                //addExp = parseInt((second/aMonsterTime)*(monsterTotal*tMonster.userExp));
                //addExp = parseInt(formula.callOfflineExp((monsterTotal*tMonster.userExp)/aMonsterTime,second));
                var secondExp = (monsterTotal * tMonster.userExp) / aMonsterTime;

                if (second <= offlineLimit1) {
                    addExp = secondExp * second * addRate1;
                } else {

                    var outSeconds = second - offlineLimit1;
                    addExp = secondExp * offlineLimit1 * addRate1;
                    addExp += secondExp * outSeconds * addRate2;
                }
            }

            //addExp = formula.callOfflineExp(offlineExp,userData.lvl,second);        //todo a:当前所在的普通关卡ID;b:领主等级;c:离线时间(秒)
            var equipCount = formula.callOfflineEquipCount(second);     //获得装备数量
            var equipLvl = formula.callEquipLvl(copyId);        //获得装备等级
            returnArr[3] = equipLvl;
            var residualSpace = userUtils.getEquipBagResGrid(userData);        //剩余空间
            if(residualSpace < 0) residualSpace = 0;
            addEquipCount = equipCount;
            if(addEquipCount > residualSpace){
                addEquipCount = residualSpace;        //如果大于剩余空间取空间数量
                returnArr[4] = residualSpace;
                //剩余装备转换金币
                equipGold = (equipCount - residualSpace)*formula.callEquipTraGold(copyId);
                returnArr[5] = equipCount - residualSpace;
            }
            for(var i = 0; i < addEquipCount;i++){
                var tempId = formula.callOfflineEquipId(equipLvl);
                var cou = equipItems[tempId]||0;
                equipItems[tempId] = cou + 1;
            }

            //等级宝箱
            if(t_copyLoot[t_copy[copyId].loot].exItems){
                var exItems = t_copyLoot[t_copy[copyId].loot].exItems;
                for(var i = 0;i<exItems.length;i++){
                    var chestsNum = 0;
                    var exItemsId = exItems[i][0];
                    if(parseInt(exItemsId/100) == 51){
                        chestsNum = formula.calCuChests(second/60);      //铜箱子
                    }
                    if(parseInt(exItemsId/100) == 52){
                        chestsNum = formula.calAgChests(second/60);      //银箱子
                    }
                    if(parseInt(exItemsId/100) == 53){
                        chestsNum = formula.calAuChests(second/60);      //金箱子
                    }
                    if(exItemsId == 1545 || exItemsId == 1550|| exItemsId == 1551){     //宝箱钥匙
                        chestsNum = Math.round(second/aMonsterTime*monsterTotal*(exItems[i][2]/10000));
                    }
                    if(chestsNum>0){
                        equipItems[exItemsId] = chestsNum;
                        returnArr[6].push([exItemsId,chestsNum]);
                    }
                }
            }

            //vip加成
            //var offlineGoldAdd = c_vip[userData.vip].offlineGoldAdd;
            //var offlineExpAdd = c_vip[userData.vip].offlineExpAdd;
            //if(offlineGoldAdd > 0) addGold = addGold*(offlineGoldAdd + 100)/100;
            //if(offlineExpAdd > 0) addExp = addExp*(offlineGoldAdd + 100)/100;


            //技能影响
            var skillPro = 0;
            var exData = userData.exData||{};
            if(exData[c_prop.userExDataKey.talismanSkill] && exData[c_prop.userExDataKey.talismanSkill][c_prop.talismanSkillTypeKey.exp]){
                var skillArr =exData[c_prop.userExDataKey.talismanSkill][c_prop.talismanSkillTypeKey.exp];
                for(var i = 0 ;i<skillArr.length;i++){
                    var skillId = skillArr[i];
                    if(t_talismanSkill[skillId]){
                        skillPro += parseInt(t_talismanSkill[skillId].effect[0][0]);
                    }
                }
            }
            addExp = addExp * (skillPro/10000+1);
        }

        returnArr[1] = parseInt(addExp);
        returnArr[2] = parseInt(addGold);

        userUtils.addGold(userData,addGold);
        userUtils.addGold(userData,equipGold);

        userUtils.addUserExpc(userData,addExp);

        userUtils.saveItems(userData,equipItems);

        cb(null,returnArr);
    });
};

/**
 * 打开背包宝箱
 * @param client
 * @param userId
 * @param chestId
 * @param count
 * @param cb
 */
exports.getBagChest = function(client,userId,chestId,count,cb) {
    checkRequire();
    count = parseInt(count);
    if(count<=0 || !t_item[chestId]) return cb("打开背包宝箱异常！");

    async.parallel([
        function(cb1){
            userDao.select(client, {id: userId},cb1);
        },function(cb1){
            demonLotusDao.select(client,{userId:userId},cb1);
        }
    ],function(err,data){
        if (err) return cb(err);
        var userData = data[0],demonLotusData = data[1];

        var level = t_item[chestId].level || 1;
        if(level > userData.lvl) return cb(getMsg(c_msgCode.noLvlUse),level);
        var levelVip = t_item[chestId].vip || 0;
        if(levelVip > userData.vip) return cb(getMsg(c_msgCode.vipItemRequire),levelVip);
        var bag = userData.bag;
        if(!bag[chestId] || bag[chestId] < count) return cb("宝箱数量不足");
        var itemsArr = [];
        var bagItems = {};
        var delBagItems = {};
        var equipBagItems = {};
        var expSum = 0;
        var rebirthExpSum = 0;
        var genuineQi = 0;
        //同步真气
        var costObj = {};
        var genuineQiArr = userUtils.calGenuineQi(userData,demonLotusData);
        var oldGenuineQi =  genuineQiArr[0];

        var items = {};
        var mailItems = {};
        var getDiamond = 0;
        for(var i = 0; i < count;i++){
            var logicItems = itemBiz.calLogicItems(chestId);        //宝箱随机的物品
            if(t_itemLogic[chestId].chestType == c_prop.chestTypeKey.equipLvl){
                var equipLvlObj = {};
                for(var key in logicItems){
                    var equipLvlId = parseInt(key);
                    var equipLvl = parseInt(formula.calEquipLvlCfg(userData.lvl));
                    equipLvlObj[(equipLvlId + equipLvl)] = logicItems[key];
                }
                logicItems = equipLvlObj;
            }
            if(logicItems[c_prop.spItemIdKey.genuineQi]){
                if(!costObj[chestId]) costObj[chestId] = 0;
                costObj[chestId] += 1;
            }
            items = propUtils.mergerProp(items,logicItems);
        }
        var equipBagResGrid = userUtils.getEquipBagResGrid(userData);       //装备背包剩余格数
        for(var key in items){
            if(key == c_prop.spItemIdKey.diamond) getDiamond += items[key];
            if(t_item[key].type == c_prop.itemTypeKey.equip){       //装备需要判断背包是否有空间
                if(items[key] <= equipBagResGrid){
                    equipBagResGrid -= items[key];
                }else{
                    mailItems[key] = items[key] - equipBagResGrid;
                    items[key] = equipBagResGrid;
                    equipBagResGrid = 0;
                    if(items[key] == 0) delete items[key];
                }
            }

            if(_isTreasureChest(chestId)){
                treasureBiz.insertTreasureRecord(client, c_prop.treasureRecordTypeKey.openTreasure, userData, chestId ,items,function(err, insertData) {if(err) return console.log(err);});
                if(t_item[key].color >= 5) {
                    chatBiz.addSysData(76, [t_item[chestId].name, userData.nickName, t_item[key].color,t_item[key].name]);
                }
            }
        }
        //获得物品
        itemsArr = userUtils.saveItems(userData, items);
        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
        expSum = itemsArr[2];
        rebirthExpSum = itemsArr[3];
        genuineQi = itemsArr[4];

        //是否需要钥匙
        if(t_itemLogic[chestId].needItems){
            var needItems = t_itemLogic[chestId].needItems;
            var needItemsId = needItems[0];
            var needItemsNum = needItems[1]*count;
            if(!bag[needItemsId] || bag[needItemsId] < needItemsNum) return cb("开启所需道具不足");
            userData.bag[needItemsId] -= needItemsNum;
            delBagItems[needItemsId] = needItemsNum;
            if(userData.bag[needItemsId] == 0) delete userData.bag[needItemsId];
        }
        //扣除宝箱
        userData.bag[chestId] -= count;
        delBagItems[chestId] = count;
        if(userData.bag[chestId] == 0) delete userData.bag[chestId];


        var GenuineQiObj = new genuineQiObj();
        if(Object.keys(costObj).length > 0){
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
            GenuineQiObj.costObj = costObj;

            /** 真气 **/
            GenuineQiObj.oldGenuineQi = oldGenuineQi;    /** 原本真气值 **/
            GenuineQiObj.newGenuineQi = userData.genuineQi;   /** 当前真气值 **/
            biBiz.genuineQiBi(JSON.stringify(GenuineQiObj));
        }

        //var bag = userData.bag;
        //var medalData = userData.medalData;
        //for(var key in t_medal){
        //    if(!medalData[t_medal[key].id] && bag[t_medal[key].id] && bag[t_medal[key].id] > 0 ){
        //        userData.medalData[t_medal[key].id] = [parseInt(t_medal[key].id)*100];
        //        userData.bag[t_medal[key].id] -= 1;
        //        bagItems[t_medal[key].id] -= 1;
        //        if(userData.bag[t_medal[key].id] == 0) delete userData.bag[t_medal[key].id];
        //        if(bagItems[t_medal[key].id] == 0) delete bagItems[t_medal[key].id];
        //    }
        //}

        //更新
        var updateData = {
            lvl:userData.lvl,
            expc:userData.expc,
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag,
            prestige: userData.prestige,
            rebirthExp: userData.rebirthExp,
            genuineQi:userData.genuineQi,
            medalData: userData.medalData,
            exData:userData.exData
        };
        userDao.update(client, updateData, {id: userId}, function(err,data){
            if (err) return cb(err);
            var isMail = false;
            delete updateData.bag;
            delete updateData.equipBag;
            if(JSON.stringify(mailItems) != "{}"){
                mailBiz.addByType(client, userId, c_prop.mailTypeKey.equipChest, [], mailItems, function(err,data1){
                    if (err) return cb(err);
                    isMail = true;
                    return cb(null, [updateData,isMail,bagItems,delBagItems,equipBagItems,expSum,getDiamond,rebirthExpSum,genuineQi,userData.genuineQi]);
                });
            }else{
                return cb(null, [updateData,isMail,bagItems,delBagItems,equipBagItems,expSum,getDiamond,rebirthExpSum,genuineQi,userData.genuineQi]);
            }
        });
    });
};

/**
 * 激活战印
 * @param client
 * @param userId
 * @param cb
 */
exports.activeMedal = function(client,userId,warPrintedId,cb){
    checkRequire();
    if(!t_medal[warPrintedId]) return cb("战印数据异常");
    userDao.selectCols(client, "id,bag,lvl,medalData"," id = ? ",[userId], function(err,userData) {
        if (err) return cb(err);
        var delBagItems = {};
        var medalData = userData.medalData;
        if(medalData[warPrintedId]) return cb("已拥有该战印");
        var bag = userData.bag;
        if(!bag[warPrintedId] || bag[warPrintedId] <= 0 ) return cb("还未拥有该战印");
        if(userData.lvl < t_item[warPrintedId].level) return cb(getMsg(c_msgCode.NoLvlOpen));
        //添加战印数据
        userData.medalData[warPrintedId] = [parseInt(warPrintedId)*100];
        userData.bag[warPrintedId] -= 1;
        delBagItems[warPrintedId] = 1;
        if(userData.bag[warPrintedId] == 0) delete userData.bag[warPrintedId];

        var updateData = {
            bag:userData.bag,
            medalData:userData.medalData
        };
        userDao.update(client, updateData, {id: userId}, function(err,data){
            if (err) return cb(err);
            delete updateData.bag;
            return cb(null, [userData.medalData,delBagItems]);
        });
    });
};

/**
 * 修改战印头衔
 * @param client
 * @param userId
 * @param cb
 */
exports.setMedalTitle = function(client,userId,warPrintedId,cb){
    checkRequire();
    if(!t_medal[warPrintedId]) return cb("战印数据异常");
    userDao.selectCols(client, "id,medalTitle,medalData"," id = ? ",[userId], function(err,userData) {
        if (err) return cb(err);
        var medalData = userData.medalData;
        if(!medalData[warPrintedId]) return cb("还未拥有该战印");

        //修改
        userData.medalTitle = warPrintedId;

        var updateData = {
            medalTitle:userData.medalTitle
        };
        userDao.update(client, updateData, {id: userId}, function(err,data){
            if (err) return cb(err);
            return cb(null, [userData.medalTitle]);
        });
    });
};

/**
 * 获取战印榜
 * @param client
 * @param userId
 * @param cb
 */
exports.getWarPrintedList = function(client,userId,cb){
    checkRequire();
    userDao.selectCols(client, "id,bag,medalData"," id = ? ",[userId], function(err,userData) {
        if (err) return cb(err);
        var bag = userData.bag;
        var medalData = userData.medalData;
        var delBagItems = {};
        var isUpdata = false;

        if(isUpdata){
            for(var key in t_medal){
                if(!medalData[t_medal[key].id] && bag[t_medal[key].id] && bag[t_medal[key].id] > 0 ){
                    userData.medalData[t_medal[key].id] = [parseInt(t_medal[key].id)*100];
                    userData.bag[t_medal[key].id] -= 1;
                    delBagItems[t_medal[key].id] = 1;
                    if(userData.bag[t_medal[key].id] == 0) delete userData.bag[t_medal[key].id];
                }
            }
            var updateData = {
                bag: userData.bag,
                medalData:userData.medalData
            };
            userDao.update(client, updateData, {id: userId}, function(err,data){
                if (err) return cb(err);
                delete updateData.bag;
                return cb(null, [userData.medalData,isUpdata,delBagItems]);
            });
        }else{
            cb(null,[userData.medalData,isUpdata,delBagItems]);
        }
    });
};

/**
 * 战印强化
 * @param client
 * @param userId
 * @param warPrintedId
 * @param cb
 */
exports.warPrintedStrength = function(client,userId,warPrintedId,cb){
    checkRequire();
    if(!t_medal[warPrintedId]) return cb("战印数据异常");
    userDao.selectCols(client, "id,lvl,bag,medalData"," id = ? ",[userId], function(err,userData) {
        if (err) return cb(err);
        var delBagItems = {};
        var bag = userData.bag;
        var medalData = userData.medalData;
        if(!medalData[warPrintedId]) return cb("战印数据异常");
        var strengthLvl = medalData[warPrintedId][0];
        var nextMedalLvlId = strengthLvl + 1;
        if(!t_medalLvl[nextMedalLvlId]) return cb("已强化到最高级");
        var reqItems = t_medalLvl[nextMedalLvlId].reqItems || []; //所需物品
        var needLvl = t_medalLvl[nextMedalLvlId].needLvl||999;
        if(userData.lvl < needLvl) return cb(getMsg(c_msgCode.NoLvlOpen));


        //判断合成材料
        for(var i = 0, li = reqItems.length; i < li; i++){
            var reqCfg = reqItems[i];
            var key = reqCfg[0];
            var num = reqCfg[1];
            var ownCount = bag[key]||0;        //拥有所需合成材料的数量
            if(!ownCount || ownCount < num) return cb("材料不足")
        }

        //扣除材料
        for(var i = 0, li = reqItems.length; i < li; i++){
            var reqCfg = reqItems[i];
            var key = reqCfg[0];
            var num = reqCfg[1];
            bag[key] -= num;
            delBagItems[key] = num;
            if(bag[key] == 0) delete bag[key];
        }

        //加强化等级
        medalData[warPrintedId][0] = nextMedalLvlId;

        //更新
        var updateData ={
            bag:userData.bag,
            medalData:userData.medalData
        };
        userDao.update(client,updateData,{id:userId},function(err,data){
            if(err) return cb(err);
            return cb(null,[userData.medalData,delBagItems]);
        });
    });
};

/**
 * 获取真气值
 * @param client
 * @param userId
 * @param cb
 */
exports.getGenuineQi = function(client,userId,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.selectCols(client,"id,lvl,genuineQi,exData",{id:userId},cb1);
        },
        function(cb1){
            demonLotusDao.selectCols(client,"advanceLvl",{userId:userId},cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], demonLotusData = data[1];
        if (!userData.exData[c_prop.userExDataKey.genuineQi] && c_genuineQi[userData.lvl]) {
            userData.exData[c_prop.userExDataKey.genuineQi] = [new Date()];
            var genuLimit = 0;
            var advanceLvl = 0;
            if (demonLotusData) advanceLvl = demonLotusData.advanceLvl;
            var genqiAccLimit = parseInt(c_demonLotus[advanceLvl].genqiAccLimit);
            genuLimit = parseInt(c_genuineQi[userData.lvl].genuLimit) + genqiAccLimit;    //真气上限
            userData.genuineQi = genuLimit;
        }

        var updateData = {
            exData: userData.exData,
            genuineQi: userData.genuineQi
        };

        userDao.update(client, updateData, {id: userId}, function (err, data) {
            if (err) return cb(err);
            cb(null, updateData);
        });
    });
};

exports.updateCombat = function(client,userId,cb){
    checkRequire();
    userDao.selectCols(client, "id,combat,lvl,equipBag,isKing,rebirthLvl,medalData,propertyData"," id = ? ",[userId], function(err,userData) {
        if (err) return cb(err);
        heroBiz.calAndGetHeroListNotUpdate(client,userData,function(err,heroList){
            if (err) return cb(err);
            var allCombat = 0;
            var maxCombat = 0;
            for(var i = 0;i<heroList.length;i++){
                var locHero = heroList[i];
                var locCombat = locHero.combat;
                allCombat+=locCombat;
                if(locCombat>maxCombat){
                    maxCombat = locCombat;
                }
            }
            userDao.update(client, {combat:allCombat}, {id: userId}, cb);
            taskBiz.setTaskValue(client,userId,c_prop.cTaskTypeKey.combat,maxCombat,function(){});
        });
    });
};


/**
 * 领取玩吧礼包
 * @param client
 * @param userId
 * @param os
 * @param gitfId
 * @param cb
 */
exports.getWanbaGift = function(client,userId,os,giftId,cb) {
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if(err) return cb(err);
        var items = {};
        var bagItems = {};
        var equipBagItems = {};
        var code = 1;
        var message = "";
        var now = new Date();
        var refreshDate = now.clone().setHours(giftRefreshHour, 0, 0, 0);
        //判断今日次数
        var wanbaGiftData = userData.record[c_prop.userRecordTypeKey.wanbaGift]||{};
        var getGiftDate = now;
        os = os.toLowerCase();
        if(wanbaGiftData[os]){
            getGiftDate = new Date(wanbaGiftData[os]);
        }else {
            getGiftDate = new Date(0);
        }
        var diffDay = getGiftDate.clone().clearTime().getDaysBetween(now.clone().clearTime());
        if (diffDay <0 || getGiftDate.isAfter(now)){//未来
            message = "亲，你提前消费了，你怎么做到的";
            logger.error(message);
            return cb(null, [-1,message,null]);
        }else if (diffDay == 0){//当天
            if(getGiftDate.isBefore(refreshDate) && now.isAfter(refreshDate)){
                code = 0;
            }
        }else if (diffDay == 1){//隔一天
            if(getGiftDate.isBefore(refreshDate) || now.isAfter(refreshDate)){
                code = 0;
            }
        }else {//隔好几天
            code = 0
        }
        if(code == 1){
            return cb(null, [code,message,null]);
        }
        wanbaGiftData[os] = now;
        userData.record[c_prop.userRecordTypeKey.wanbaGift] = wanbaGiftData;
        var giftData = c_giftPack[giftId];
        if(!giftData){
            return cb(null, [-1, "giftId 有误", null]);
        }
        for (var index in giftData.content){
            var itemData = giftData.content[index];
            items[itemData[0]] = itemData[1];
        }

        var itemsArr = userUtils.saveItems(userData,items);
        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);

        var getGold = userUtils.getNumOfItems(items,c_prop.itemTypeKey.gold);
        var getDiamond = userUtils.getNumOfItems(items,c_prop.itemTypeKey.diamond);
        //var bag = userData.bag;
        //var medalData = userData.medalData;
        //for(var key in t_medal){
        //    var medalId = t_medal[key].id;
        //    if(!medalData[medalId] && bag[medalId] && bag[medalId] > 0 ){
        //        userData.medalData[medalId] = [parseInt(medalId)*100];
        //        userData.bag[medalId] -= 1;
        //        bagItems[medalId] -= 1;
        //        if(userData.bag[medalId] == 0) delete userData.bag[medalId];
        //        if(bagItems[medalId] == 0) delete bagItems[medalId];
        //    }
        //}
        var updateUser = {      //gold,diamond,buyDiamond,giveDiamond,bag,equipBag,prestige
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond: userData.buyDiamond,
            giveDiamond: userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag,
            prestige: userData.prestige,
            medalData:userData.medalData,
            record:userData.record
        };

        async.parallel([
            function(cb1){
                userDao.update(client,updateUser,{id:userId},cb1);
            }
        ],function(err,data){
            if(err) return cb(err);
            delete updateUser.bag;
            delete updateUser.equipBag;
            return cb(null, [code, "", updateUser,getGold,getDiamond,bagItems,equipBagItems]);
        });
    });
};


exports.updateSetting = function(client, userId, catNoVipChat, autoBuyLittleHorn, cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if(err) return cb(err);
        var exData = userData.exData || {};
        exData[c_prop.userExDataKey.catNoVipChat] = catNoVipChat;
        exData[c_prop.userExDataKey.autoBuyLittleHorn] = autoBuyLittleHorn;
        userData.exData = exData;
        var upUserData = {
            exData: userData.exData
        }
        userDao.update(client,upUserData,{id:userId},function(err, data){
            if(err) return cb(err);
            return cb(null, userData);
        })
    });
};

exports.updateItems4Bag = function(client, userId, ItemId, cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if(err) return cb(err);
        var bag = userData.bag || {};
        var updateBag = {};
        updateBag[ItemId] = bag[ItemId] || 0;
        cb(null, updateBag);
    });
};


/******************************************************************************************************/

//判断是否是秘宝宝箱
var _isTreasureChest  = function(chestId){
    var itemId = parseInt(chestId);
    if(itemId > 7000 && itemId < 8000){
        return true;
    }
    return false;
}


/**
 * 计算购买金币暴击
 * @returns {number}
 * @private
 */
var _calBuyGoldCrit = function(){
    var buyGoldCfg = commonUtils.strToObj(c_game.goldBuySet[1]);
    var critNum = 1;
    var random = Math.random()*10000;
    for(var key in buyGoldCfg){
        var locRange = parseInt(key);
        if(random<locRange){
            critNum = buyGoldCfg[key];
            break;
        }
    }
    return critNum;
};


//更新扩展数据
var _updateExData = function(client,userId, key,value,cb){
    checkRequire();
    userDao.selectCols(client, "exData", {id:userId}, function(err,userData) {
        if (err) return cb(null);
        userData.exData[key] = value;
        var updateData ={
            exData:userData.exData
        };
        userDao.update(client,updateData,{id:userId},function(err,data){
            if(err) return cb(err);
            cb(null,updateData);
        });
    });
};
