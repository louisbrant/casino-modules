var logger = require('uw-log').getLogger("uw-logger", __filename);
var uwData = require("uw-data");
var c_game = uwData.c_game;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var c_prop = uwData.c_prop;
var c_arenaRankReward = uwData.c_arenaRankReward;
var sysMsgCode = uwData.sysMsgCode;
var c_reward = uwData.c_reward;
var formula = require("uw-formula");
var uwClient = require("uw-db").uwClient;
var ArenaEntity = require('uw-entity').ArenaEntity;
var fightUtils = require("uw-utils").fightUtils;
var loginClient = require("uw-db").loginClient;
var project = require("uw-config").project;

var g_data = require("uw-global").g_data;

var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);

var arenaDao = require("./../dao/arenaDao");


var propUtils = require("uw-utils").propUtils;
var commonUtils = require("uw-utils").commonUtils;

var userUtils = require("uw-user").userUtils;

var mailBiz =  require("uw-mail").mailBiz;

var ds = require("uw-ds").ds;

var exports = module.exports;

//竞技场默认每日挑战次数

//取对手排名特殊值范围
var SPECIAL_RANG = {
    r1: [2, 3, 4],
    r2: [1, 3, 4],
    r3: [1, 2, 4],
    r4: [1, 2, 3]
};

var g_arena = null;
var arenaRecordBiz =  null;
var arenaRecordDao =  null;
var userDao = null;
var userBiz = null;
var heroBiz = null;
var serverInfoDao = null;
var guildPersonalBiz = null;
var fiveDaysTargetBiz = null;
var activityDao = null;
var checkRequire = function () {
    arenaRecordBiz = require("uw-arena-record").arenaRecordBiz;
    arenaRecordDao = require("uw-arena-record").arenaRecordDao;
    g_arena = g_arena || require("uw-global").g_arena;
    userDao = require("uw-user").userDao;
    userBiz = require("uw-user").userBiz;
    heroBiz = require("uw-hero").heroBiz;
    guildPersonalBiz = guildPersonalBiz || require("uw-guild").guildPersonalBiz;
    fiveDaysTargetBiz = fiveDaysTargetBiz || require("uw-fiveDaysTarget").fiveDaysTargetBiz;
    activityDao = activityDao || require("uw-activity").activityDao;
    serverInfoDao = serverInfoDao || require("uw-server-info").serverInfoDao;
};

/**
 * 获取竞技场信息
 * @param client
 * @param userId
 * @param cb
 */
exports.getInfo = function (client, userId, cb) {
    checkRequire();
    //获取
    exports.selectArena(client, userId, function (err, arenaData) {
        if (err) return cb(err);
        _calReNumData(arenaData);
        cb(null, arenaData);
    });
};

/**
 * 查询数据，不存在则创建
 * @param client
 * @param userId
 * @param cb
 */
exports.selectArena = function (client, userId, cb) {
    async.parallel([
        function (cb1) {
            arenaDao.select(client, {userId: userId}, cb1);
        },
        function (cb1) {
            arenaDao.select(client, {_orderBy: ["rank desc"]}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var arenaData = data[0],lastArenaData = data[1];
        var maxRank = lastArenaData ? lastArenaData.rank : 0;
        g_arena.setLowestRank(maxRank);
        if (arenaData) return cb(null, arenaData);
        exports.createArena(client, userId,maxRank, cb);
    });
};

exports.createArena = function (client, userId,maxRank, cb) {
    //如果不存在则创建
    _calMaxRank(client, 0,maxRank, function (err, maxRank) {
        if (err) return cb(err);
        var arenaEntity = new ArenaEntity();
        arenaEntity.userId = userId;
        arenaEntity.rank = maxRank + 1;
        g_arena.setLowestRank(arenaEntity.rank);
        arenaEntity.highRank = maxRank + 1;
        var fightRanks = exports.calRankRange(arenaEntity.rank);
        arenaEntity.fightRanks = fightRanks;
        arenaEntity.reNumData = [];
        arenaDao.insert(client, arenaEntity, function (err, data) {
            if (err) return cb(err);
            arenaEntity.id = data.insertId;
            cb(null, arenaEntity);
        });
    });
};

/**
 * 刷新挑战对手
 * @param client
 * @param userId
 * @param cb
 */
exports.resetFightRanks = function (client, userId, cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        }, function (cb1) {
            arenaDao.select(client, {userId: userId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0], arenaData = data[1], updateUser = {};

        var nowTime = new Date();
        var reNumData = arenaData.reNumData;
        var lastResetTime = reNumData[c_prop.arenaDataKey.lastResetTime];
        if(lastResetTime){
            var gameCds = c_game.arenaCfg[6]||999999;
            var cds = parseInt((nowTime.getTime() - new Date(lastResetTime).getTime())/1000);
            if(cds < gameCds){
                var cosDiamond = c_game.arenaCfg[7]||999999;
                if(userData.diamond < cosDiamond) return cb("元宝不足");
                //扣除钻石
                userUtils.reduceDiamond(userData,cosDiamond);
            }
        }
        arenaData.reNumData[c_prop.arenaDataKey.lastResetTime] = nowTime;
        var updateData = {
            diamond: userData.diamond
        };
        //更新挑战对手
        var fightRanks = exports.calRankRange(arenaData.rank);
        async.parallel([
            function (cb1) {
                //todo
                userDao.update(client,updateData,{id:userId},cb1);
            }, function (cb1) {
                arenaDao.update(client, {fightRanks: fightRanks,reNumData:arenaData.reNumData}, {id: arenaData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            return cb(null,{reNumData:arenaData.reNumData});
        });
    });
};


/**
 * 获取挑战对手
 * @param client
 * @param userId
 * @param cb
 */
exports.getFightUserList = function (client, userId, cb) {
    checkRequire();
    arenaDao.select(client, {userId: userId}, function (err, arenaData) {
        if (err) return cb(err);
        //更新挑战对手
        var fightRanks = arenaData.fightRanks;
        var isUpdate = false;
        if(fightRanks.length <= 3){
            isUpdate = true;
            fightRanks = exports.calRankRange(arenaData.rank);
        }
        _calUsersByRanks(client, fightRanks, function (err, fightUsers) {
            if (err) return cb(err);
            if(isUpdate){
                arenaDao.update(client, {fightRanks:fightRanks}, {id: arenaData.id}, function(err,upArena){
                    if (err) return cb(err);
                    return cb(null, fightUsers);
                });
            }else{
                return cb(null, fightUsers);
            }

        });
    });
};


/**
 * 购买挑战次数
 * @param client
 * @param userId
 * @param cb
 */
exports.buyPKNum = function (client, userId, cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        },
        function (cb1) {
            arenaDao.select(client, {userId: userId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0], arenaData = data[1];
        _calReNumData(arenaData);
        var reNumData = arenaData.reNumData;
        var reNum = reNumData[0] || 0;     //当前剩余挑战次数

        var calBuyPKDiamond = c_game.arenaCfg[4];    //当前购买次数对应所需砖石
        if (userData.diamond < calBuyPKDiamond) return cb(getMsg(c_msgCode.noDiamond));

        userUtils.reduceDiamond(userData, calBuyPKDiamond);

        reNumData[0] = reNum + 1;
        //diamond giveDiamond buyDiamond
        var updateUser = {
            diamond: userData.diamond,
            giveDiamond: userData.giveDiamond,
            buyDiamond: userData.buyDiamond
        };
        var updateArena = {
            reNumData: reNumData
        };
        async.parallel([
            function (cb1) {
                userDao.update(client, updateUser, {id: userId}, cb1);
            },
            function (cb1) {
                arenaDao.update(client, updateArena, {id: arenaData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [updateUser, updateArena, calBuyPKDiamond]);
        });
    });
};

/**
 * 刷新cd
 * @param client
 * @param userId
 * @param cb
 */
exports.refreshCD = function (client, userId, cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        },
        function (cb1) {
            arenaDao.select(client, {userId: userId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0], arenaData = data[1];
        _calReNumData(arenaData);
        var reNumData = arenaData.reNumData;

        var freshDiamond = c_game.arenaCfg[3];    //秒CD花费元宝
        if (userData.diamond < freshDiamond) return cb(getMsg(c_msgCode.noDiamond));

        userUtils.reduceDiamond(userData, freshDiamond);

        reNumData[c_prop.arenaDataKey.nextFightTime] = new Date();
        //diamond giveDiamond buyDiamond
        var updateUser = {
            diamond: userData.diamond,
            giveDiamond: userData.giveDiamond,
            buyDiamond: userData.buyDiamond
        };
        var updateArena = {
            reNumData: reNumData
        };
        async.parallel([
            function (cb1) {
                userDao.update(client, updateUser, {id: userId}, cb1);
            },
            function (cb1) {
                arenaDao.update(client, updateArena, {id: arenaData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [updateUser, updateArena, freshDiamond]);
        });
    });
};

//战斗开始
exports.fightStart = function(client, userId, rank, cb) {
    checkRequire();

    async.parallel([
        function (cb1) {
            arenaDao.select(client, {userId: userId}, cb1);
        },
        function (cb1) {
            arenaDao.select(client, {rank: rank}, cb1);
        },
        function(cb1) {
            userDao.select(client,{id:userId},cb1);
        },
        function (cb1) {
            activityDao.select(client, {type: c_prop.activityTypeKey.fiveDaysTarget, isOpen: 1}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var arenaData = data[0], enemyArenaData = data[1], userData = data[2], activityData = data[3];
        _calReNumData(arenaData);
        //cd相关
        var nextFightTime = arenaData.reNumData[c_prop.arenaDataKey.nextFightTime]||new Date();
        nextFightTime = new Date(nextFightTime);
        var freshDiamond = c_game.arenaCfg[3];
        if(nextFightTime.isAfter(new Date())) return cb(getMsg(c_msgCode.cleanArenaTime,freshDiamond));
        var cd = c_game.arenaCfg[2];//参数3：竞技场CD时间(s)
        arenaData.reNumData[c_prop.arenaDataKey.nextFightTime] = (new Date()).addSeconds(cd);
        //挑战次数相关
        var reNum = arenaData.reNumData[c_prop.arenaDataKey.reNum] || 0;
        var calBuyPKDiamond = c_game.arenaCfg[4];
        if (reNum <= 0) return cb(getMsg(c_msgCode.noArenaTimes,calBuyPKDiamond));
        //剩余挑战次数-1
        reNum-=1;
        arenaData.reNumData[c_prop.arenaDataKey.reNum] = reNum;


        if (arenaData.fightRanks.indexOf(rank) < 0) return cb(getMsg(c_msgCode.rankChanged));

        //战斗中
        if (g_arena.isFighting(enemyArenaData.id)) {
            return cb(getMsg(c_msgCode.userFighting));
        }
        //设置对手
        g_data.setPkEnemyId(userId, enemyArenaData.id);

        //添加到全局缓存
        g_arena.addFight(arenaData.id, enemyArenaData.id, arenaData.rank, enemyArenaData.rank);

        var updateArena = {
            reNumData:arenaData.reNumData
        };
        //增加竞技场记录
        var ex = userData.exData|| {};
        ex[c_prop.userExDataKey.arenaCount] = ex[c_prop.userExDataKey.arenaCount] || 0;
        var day = fiveDaysTargetBiz.getCurDay(activityData);
        if (day >= 2)
            ex[c_prop.userExDataKey.arenaCount] += 1;
        userData.exData = ex;
        var updateUser = {
            exData: userData.exData
        };

        userDao.select(client,{id:enemyArenaData.userId},function(err,eUserData){
            if (err) return cb(err);
            async.parallel([
                function (cb1) {
                    heroBiz.getPkList(client,eUserData,cb1);
                },
                function (cb1) {
                    arenaDao.update(client,updateArena,{id:arenaData.id},cb1);
                },
                function(cb1) {
                    userDao.update(client, updateUser, {id:userData.id}, cb1);
                }
            ],function(err,data){
                if (err) return cb(err);
                var heroPkDataList = data[0];
                var heroList = heroPkDataList[0];
                var otherDataList = heroPkDataList[1];
                var fightData = heroPkDataList[2];
                cb(null, [updateArena,heroList,otherDataList,fightData,updateUser]);
            });
        });
    });
};

/**
 * 战斗结束
 * @param client
 * @param userId
 * @param rank
 * @param isWin
 * @param cb
 */
exports.fightEnd = function (client, userId, rank, isWin,cb) {
    checkRequire();

    _getArenaUserData(client, userId, rank, function (err, data) {
        if (err) return cb(err);
        var arenaData = data[0], enemyArenaData = data[1], userData = data[2], enemyData = data[3];
        //校验一下战斗力
        isWin = fightUtils.checkIsWinByCombat(isWin,userData.lvl,userData.combat,enemyData.combat);

        var fightResult = new ds.FightResult();
        fightResult.winStatus = isWin?consts.winStatus.win:consts.winStatus.lose;

        var curEnemyId = g_data.getPkEnemyId(userId);
        if (curEnemyId != enemyArenaData.id) return cb("无效的挑战对手");
        g_data.setPkEnemyId(userId, -111);

        //排名已经变化
        arenaData.rank = g_arena.getFightRank(arenaData.id);
        enemyArenaData.rank = g_arena.getFightRank(enemyArenaData.id);
        if(!arenaData.rank||!enemyArenaData.rank||arenaData.fightRanks.indexOf(rank) < 0) {
            fightResult.hasChangeRank = 1;
            fightResult.changeRank = 0;
            fightResult.curRank = arenaData.rank;
            fightResult.gold = 0;
            fightResult.prestige = 0;
            fightResult.attackMember = [userData.nickName,userData.combat,userData.iconId];
            fightResult.beAttackMember = [enemyData.nickName,enemyData.combat,enemyData.iconId];
            return cb(null,[fightResult,userData.lvl]);
        }
        var oldRank = arenaData.rank;


        if (isWin) {
            //更换排名,只要排名比他高才替换
            if (oldRank > enemyArenaData.rank) {
                arenaData.rank = enemyArenaData.rank;
                enemyArenaData.rank = oldRank;
                g_arena.changeRank(arenaData.id, enemyArenaData.id);
                logger.debug("竞技场排名发生变化：%s--->%s", oldRank, arenaData.rank);
            }

            //判断是否最高纪录
            if (arenaData.rank < arenaData.highRank) {
                arenaData.highRank = arenaData.rank;
            }

        }

        var changeRank = oldRank -arenaData.rank;//竞技场排行升了几名
        fightResult.changeRank = changeRank;
        fightResult.curRank = arenaData.rank;

        //获得声望,金币
        var getRewardData =  _getFightRankReward(enemyArenaData.rank,isWin);
        var getGold = getRewardData[0],getPrestige = getRewardData[1];
        userUtils.addGold(userData,getGold);
        userData.prestige+=getPrestige;

        fightResult.gold = getGold;
        fightResult.prestige = getPrestige;

        //插入记录
        arenaRecordBiz.insertRecord(client,userData,enemyData,fightResult,c_prop.fightTypeKey.arena,function(){});
        var updateArena = null;
        var updateUser = null;

        async.parallel([
            function (cb1) {
                if (isWin) {
                    //更新
                    var fightRanks = exports.calRankRange(arenaData.rank);
                    updateArena = {
                        reNumData:arenaData.reNumData,
                        fightRanks: fightRanks,
                        rank: arenaData.rank,
                        highRank: arenaData.highRank
                    };
                    arenaDao.update(client, updateArena, {id: arenaData.id}, cb1);
                } else {
                   cb1();
                }
            },
            function (cb1) {
                if (isWin) {
                    //更新被挑战对手
                    var fightRanks = exports.calRankRange(enemyArenaData.rank);
                    arenaDao.update(client, {
                        fightRanks: fightRanks,
                        rank: enemyArenaData.rank
                    }, {id: enemyArenaData.id}, cb1);
                } else {
                    cb1();
                }
            },
            function (cb1) {
                updateUser = {
                    gold: userData.gold,
                    prestige:userData.prestige
                };
                userDao.update(client, updateUser, {id: userData.id}, cb1);
            },
            function (cb1) {
                guildPersonalBiz.otherAct(client, userId,5, cb1);
            }
        ], function (err) {
            if (err) return cb(err);
            g_arena.removeFight(arenaData.id, enemyArenaData.id);
            fightResult.updateArena = updateArena;
            fightResult.updateUser = updateUser;
            fightResult.attackMember = [userData.nickName,userData.combat,userData.iconId];
            fightResult.beAttackMember = [enemyData.nickName,enemyData.combat,enemyData.iconId];

            var actData = data[3];
            var guildData = actData[0];
            var guildPersonalData = actData[1];
            fightResult.guildData = guildData;
            fightResult.guildPersonalData = guildPersonalData;
            return cb(null, [fightResult,userData.lvl]);
        });
    });
};

/**
 * 利用了数据库的unique，只能更新其中一个到0再互换
 * @param client
 * @param arenaData
 * @param enemyArenaData
 * @param cb
 */
exports.changeRank = function (client, arenaData, enemyArenaData, cb) {
    //查询排名
    async.parallel([
        function (cb1) {
            arenaDao.update(client, {rank: 0}, {id: arenaData.id}, cb1);
        },
        function (cb1) {
            arenaDao.update(client, {rank: enemyArenaData.rank}, {id: enemyArenaData.id}, cb1);
        },
        function (cb1) {
            arenaDao.update(client, {rank: arenaData.rank, highRank: arenaData.highRank}, {id: arenaData.id}, cb1);
        }
    ], cb);
};

//计算挑战对手的排行
exports.calRankRange = function (rank) {
    var returnArr = [];
    var RANG_PER1 = c_game.arenaRankCfg[0]/100;//截取界限1，百分比
    var RANG_PER2 = c_game.arenaRankCfg[1]/100;//截取界限2，百分比
    var RANG_PER3 = c_game.arenaRankCfg[2]/100;//截取界限3，百分比
    var RANG_PER4 = c_game.arenaCfg[5];

    var range0, range1, range2;
    if (rank >= 1 && rank <= 4) {
        range0 = new Range(SPECIAL_RANG["r" + rank][0], SPECIAL_RANG["r" + rank][0]);
        range1 = new Range(SPECIAL_RANG["r" + rank][1], SPECIAL_RANG["r" + rank][1]);
        range2 = new Range(SPECIAL_RANG["r" + rank][2], SPECIAL_RANG["r" + rank][2]);
    } else {
        //5%,25%,60%
        var range0End = rank - 1;
        var range0Start = Math.round(rank - rank * RANG_PER1);
        range0Start = range0Start >= range0End ? range0End : range0Start;
        range0 = new Range(range0Start, range0End);

        var range2Start = Math.round(rank - rank * RANG_PER3);
        var range2End = Math.round(rank - rank * RANG_PER2);
        range2End = range2End >= (range0End - 2) ? (range0End - 2) : range2End;
        range2 = new Range(range2Start, range2End);

        range1 = new Range(range2End + 1, range0Start - 1);

    }

    var pos0 = range0.start + (0 | Math.random() * (range0.end - range0.start + 1));
    var pos1 = range1.start + (0 | Math.random() * (range1.end - range1.start + 1));
    var pos2 = range2.start + (0 | Math.random() * (range2.end - range2.start + 1));

    returnArr = [pos2, pos1, pos0];
    //添加一名排行比自己低的玩家
    var lowestRank = g_arena.getLowestRank();
    if(lowestRank && rank<lowestRank){
        var rankDif = parseInt(lowestRank)-parseInt(rank);
        if(rankDif > RANG_PER4){
            returnArr.push((rank + parseInt(RANG_PER4)));
        } else{
            returnArr.push(lowestRank);
        }
    }

    return returnArr;
};

/**
 * 发送奖励
 * @param client
 * @param cb
 */
exports.sendAward = function(client, cb) {
    arenaDao.getRankBakList(client, function (err, rankList) {
    //arenaDao.listCols(client, "rank,userId", {}, function (err, rankList) {
        if (err) return cb(err);

        var max = 1000;//分1000一批插入
        var groupList = [];
        var tempCount = 0;
        var tempList = [];
        for (var i = 0; i < rankList.length; i++) {
            var locRankData = rankList[i];
            var items = {};
            //[金币，元宝，声望]
            var locRewardData = _getRankReward(locRankData.rank);
            var locAward = locRewardData[0]||0;
            if(locAward) items[c_prop.spItemIdKey.gold] = locAward;
            var locDiamond = locRewardData[1]||0;
            if(locDiamond) items[c_prop.spItemIdKey.diamond] = locDiamond;
            var locPrestige = locRewardData[2]||0;
            if(locPrestige) items[c_prop.spItemIdKey.prestige] = locPrestige;
            var locRewardItems = locRewardData[3]||0;
            if(locRewardItems && Object.keys(locRewardItems).length > 0){
                items = propUtils.mergerProp(items,locRewardItems);
            }

            if(!items) continue;
            var mailEntity = mailBiz.createEntityByType(locRankData.userId, c_prop.mailTypeKey.arenaRank, [locRankData.rank], items);
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
        }, cb);
    });
};

//复制竞技场表数据
exports.sqlArenaBak = function(client,cb){
    arenaDao.sqlArenaBak(client,cb);
};

//获取记录
exports.getRecordList = function(client,userId,index,count, cb){
    checkRequire();
    arenaRecordDao.list(client," (userId=? or enemyId=?) and fightType = ? order by id desc limit ?,? ",[userId,userId,c_prop.fightTypeKey.arena,index,count],function(err,arenaRecordList){
        if(err) return cb(err);

        for(var i=0;i<arenaRecordList.length;i++){
            var locRecord = arenaRecordList[i];
            if(locRecord.enemyId==userId){
                locRecord.enemyId = locRecord.userId;
                locRecord.enemyLvl = locRecord.userLvl;
                locRecord.enemyName = locRecord.userName;
                locRecord.enemyIconId = locRecord.userIconId;
                locRecord.isWin = locRecord.isWin ? 0 : 1;
                var changeRank = locRecord.fightData.changeRank||0;
                changeRank *= -1;
                locRecord.fightData.changeRank = changeRank;
            }
        }
        cb(null,arenaRecordList);
    });
};


/**
 * 获取排名信息
 * @param client
 * @param count
 * @param cb
 */
exports.getRankList = function (client, count, cb) {
    arenaDao.getRankList(client, count, function (err, dataList) {
        if (err) return cb(err);
        var rankList = [];
        for (var i = 0; i < dataList.length; i++) {
            var locRankData = dataList[i];
            var locRank = new ds.Rank();
            locRank.rank = locRankData.rank;//领主排名
            locRank.name = locRankData.nickName;//领主名字
            locRank.iconId = locRankData.iconId;//领主头像id
            locRank.lvl = locRankData.lvl;//领主等级
            locRank.combat = locRankData.combat;//战斗力
            locRank.vip = locRankData.vip;//战斗力
            rankList.push(locRank);
        }
        cb(null, rankList);
    });
};

/*
 *竞技场结算
 * @param client
 * @param cb
 */
exports.clearData = function(client,cb){
    checkRequire();
    serverInfoDao.select(loginClient,{serverId:project.serverId},function(err,serverData) {
        if (err) return cb(err);
        var now = new Date();
        if(now.getDay() != 1) return;

        async.series([
            function (cb1) {
                client.query("TRUNCATE TABLE uw_arena_bak",cb1);
            },
            function (cb1) {
                client.query("INSERT INTO uw_arena_bak SELECT * FROM uw_arena",cb1);
            },
            function (cb1) {
                client.query("TRUNCATE TABLE uw_arena",cb1);
            },
            function (cb1) {
                client.query("delete FROM uw_arena_record WHERE fightType = ? ",[c_prop.fightTypeKey.pk],cb1);
            },
            function (cb1) {
                client.query("delete FROM uw_user_rank WHERE rankType = ? ",[c_prop.rankTypeKey.arenaRank],cb1);
            },
        ],function (err, data){
            if(err) return cb(err);
            g_arena.clearCache();
            cb();
        })
    });
}



/*
 *获取剩余时间
 * @param client
 * @param cb
 */
exports.getRefreshRemainTime = function(client,cb){
    checkRequire();
    serverInfoDao.select(loginClient,{serverId:project.serverId},function(err,serverData){
        var remainTime = _calOpenTime(serverData);
        return cb(null,remainTime);
    });
}


/*******************************************************private*************************************************************/

//获取排名奖励和段位奖励
//return [金币，元宝，声望，奖励物品]
var _getRankReward = function(rank){
    var prestige = 0;
    var gold = 0;
    var diamond = 0;
    var rewardItems = {};
    var curData = null;
    for (var i = 1; i < 50; i++) {
        var locData = c_arenaRankReward[i];
        if (!locData) break;
        if(rank>=locData.rangeStart&&rank<=locData.rangeEnd){
            curData = locData;
            break;
        }
    }
    if (curData) {
        var rewardId = curData.rewardId;
        var c_rewardData = c_reward[rewardId];
        prestige = c_rewardData.prestige;
        gold = c_rewardData.gold;
        diamond = c_rewardData.diamond;
        rewardItems = c_rewardData.rewardItems;
    }
    return [gold, diamond,prestige,rewardItems];
};

var _getArenaUserData = function (client, userId, rank, cb) {
    async.parallel([
        function (cb1) {
            arenaDao.select(client, {userId: userId}, cb1);
        },
        function (cb1) {
            arenaDao.select(client, {rank: rank}, cb1);
        },
    ], function (err, data) {
        if (err) return cb(err);
        var arenaData = data[0], enemyArenaData = data[1];
        //检验
        if (!arenaData || !enemyArenaData) {
            return cb(sysMsgCode.c_1_2);
        }
        async.parallel([
            function (cb1) {
                userDao.select(client, {id: userId}, cb1);
            },
            function (cb1) {
                userDao.select(client, {id: enemyArenaData.userId}, cb1);
            },
        ], function (err, data) {
            if (err) return cb(err);
            var userData = data[0];
            var enemyUserData = data[1];
            return cb(null, [arenaData, enemyArenaData, userData, enemyUserData]);
        });
    });
};

//根据排名获取挑战领主
var _calUsersByRanks = function (client, ranks, cb) {
    arenaDao.queryArenaUserByRanks(client, ranks, function (err, arenaUserList) {
        if (err) return cb(err);
        var fightUsers = [];
        var userIds = [];
        for (var i = 0; i < arenaUserList.length; i++) {
            var locFightUser = new ds.PKUserData();
            var locData = arenaUserList[i];
            locFightUser.userId = locData.userId;
            locFightUser.lvl = locData.lvl;
            locFightUser.iconId = locData.iconId;
            locFightUser.name = locData.nickName;
            locFightUser.rank = locData.rank;
            locFightUser.combat = locData.combat;
            locFightUser.vip = locData.vip;
            fightUsers.push(locFightUser);     //存入随机出的对手数据
            userIds.push(locData.userId);
        }
        guildPersonalBiz.getGuildNameByUserIds(client,userIds,function(err,guildNameData){
            if(err) return cb(err);
            for (var i = 0; i < fightUsers.length; i++) {
                var locData = fightUsers[i];
                locData.guildName = guildNameData[locData.id];
            }
            cb(null, fightUsers);
        });

    });
};

var _calMaxRank = function (client, rank,maxRank, cb) {
    if (rank > 0) return cb(null, rank);
    return cb(null, maxRank);
    //arenaDao.select(client, {_orderBy: ["rank desc"]}, function (err, data) {
    //    if (err) return cb(err);
    //    var maxRank = data ? data.rank : 0;
    //    g_arena.setLowestRank(maxRank);
    //    return cb(null, maxRank);
    //});
};


var Range = function (start, end) {
    this.start = start || 0;
    this.end = end || 0;
};



//计算巅峰赛信息，主要是恢复挑战次数
var _calReNumData = function(arenaData){
    //[剩余挑战次数，上一次恢复次数时间，下一次可以挑战的时间(cd)]
    //计算每日购买次数
    var reNum = arenaData.reNumData[0]||0;
    var lastReplayTime = arenaData.reNumData[1];

    var maxNum = c_game.arenaCfg[1];//参数2：竞技场每天挑战次数
    var refreshData = commonUtils.calRefreshData(reNum,lastReplayTime,maxNum);

    arenaData.reNumData[0] = refreshData[0];
    arenaData.reNumData[1] = refreshData[1];
};

//获取挑战排名奖励
//return [金币，声望]
var _getFightRankReward = function (rank, isWin) {
    var prestige = 0;
    var gold = 0;
    var curData = null;
    for (var i = 1; i < 100; i++) {
        var locData = c_arenaRankReward[i];
        if (!locData) break;
        if(rank>=locData.rangeStart&&rank<=locData.rangeEnd){
            curData = locData;
            break;
        }
    }

    if (curData) {
        gold = curData.gold;
        prestige = isWin ? curData.winPrestige : curData.losePrestige;
    }
    return [gold, prestige];
};

var _getDiffDay = function(startTime, endTime) {
    if(!startTime){
        startTime = new Date();
    }
    return startTime.clone().clearTime().getDaysBetween(endTime.clone().clearTime());
};

var _calOpenTime = function(serverData){
    var now = new Date();
    var day = _getDiffDay(serverData.serverDate, now);
    var period = c_game.challengeCupCfg[6];//7天
    //if(day%serverDay!=0) return;
    var remainDay =period - day%period;
    var nextRefreshTime = now.addDays(remainDay);
    nextRefreshTime.setHours(0);
    nextRefreshTime.setMinutes(0);
    nextRefreshTime.setSeconds(0);
    var remain = (new Date()).getSecondsBetween(nextRefreshTime);
    return remain;
}