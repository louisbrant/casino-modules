/**
 * Created by Administrator on 2014/5/9.
 */
var uwData = require("uw-data");
var c_prop = uwData.c_prop;
var formula = require("uw-formula");
var c_game = uwData.c_game;
var consts = uwData.consts;
var c_pkLvl = uwData.c_pkLvl;
var UserEntity = require('uw-entity').UserEntity;
var UserRankEntity = require('uw-entity').UserRankEntity;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var commonUtils = require("uw-utils").commonUtils;
var rankDao = require("../dao/rankDao");
var userDao = require("uw-user").userDao;
var arenaDao = require("uw-arena").arenaDao;
var guildDao = require("uw-guild").guildDao;
var g_guild = require("uw-global").g_guild;
var guildPersonalDao = require("uw-guild").guildPersonalDao;
var heroDao = require("uw-hero").heroDao;
var crystalDao = require("uw-crystal").crystalDao;
var userUtils = require("uw-user").userUtils;
var mailBiz =  require("uw-mail").mailBiz;
var g_guild = require("uw-global").g_guild;
var ds = require("uw-ds").ds;
var exports = module.exports;

//获取排行榜数据       【个人排名，个人排行数据，所有排行数据】
exports.allRankArr = function(client,userId,rankType, cb){
    async.parallel([
        function(cb1){
            exports.getUserRank(client,userId, rankType,cb1);
        },
        function(cb1){
            exports.getRankList(client,rankType,cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userRank = 0;
        var userRankData = {};
        var guildName = {};
        var tempRank = 0;
        var tempRankData = null;
        var rankList = data[1];
        var getUserRankData = data[0];
        if(rankType == c_prop.rankTypeKey.guildRank || rankType == c_prop.rankTypeKey.guildCombatRank || rankType == c_prop.rankTypeKey.chairmanCombatRank){
            userRank = getUserRankData[0].userRank;
            userRankData = getUserRankData[0].userRankData;
            for(var i = 0;i<rankList.length;i++){
                var guildId = rankList[i].userId;
                var guildData = g_guild.getGuild(guildId);
                var name = "";
                if(guildData) name = guildData.name;
                guildName[guildId] = name;
            }
            for(var i = 0;i<rankList.length;i++){
                tempRank++;
                var locData = rankList[i];
                if(locData.userId==getUserRankData[1]){
                    tempRankData = locData;
                    break;
                }
            }
        }else{
            userRank = getUserRankData.userRank;
            userRankData = getUserRankData.userRankData;
            for(var i = 0;i<rankList.length;i++){
                tempRank++;
                var locData = rankList[i];
                if(locData.userId==userId){
                    tempRankData = locData;
                    break;
                }
            }
        }
        if(tempRankData){
            userRank = tempRank;
            userRankData = tempRankData;
        }
        cb(null,[userRank,userRankData,data[1],guildName]);
    })
};

//获取公会相关排行
exports.getGuildRank = function(client,rankType, cb){
    exports.getRankList(client,rankType,function(err,data){
        if(err) return cb(err);
        var guildName = {};
        for(var i = 0;i<data.length;i++){
            var guildId = data[i].userId;
            var guildData = g_guild.getGuild(guildId);
            var name = "";
            if(guildData) name = guildData.name;
            guildName[guildId] = name;
        }
        cb(null,[data,guildName]);
    });
};

/**
 * 批量更新用户排行。
 * @param client
 * @param cb
 */
exports.updateUserRanks = function(client, cb){
    client.query("TRUNCATE TABLE uw_user_rank", function(err){
        if(err) return cb(err);
        async.series([
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount) SELECT a.* FROM (SELECT id, nickName, iconId, lvl L1, lvl L2, ?, vip FROM uw_user WHERE accountId != 0 ORDER BY lvl DESC,expc DESC,createTime ASC LIMIT 100)a ";
                client.query(sql, [c_prop.rankTypeKey.lvlRank], cb1);   //等级榜
            },
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount) SELECT a.* FROM (SELECT id, nickName, iconId, lvl, combat, ?, vip FROM uw_user WHERE accountId != 0 ORDER BY combat DESC,lvl DESC,createTime ASC LIMIT 100)a";
                client.query(sql, [c_prop.rankTypeKey.combatRank], cb1);    //总战榜
            },
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount) SELECT a.* FROM (SELECT T2.id, T2.nickName, T2.iconId, T2.lvl, SUM(T1.diamond) AS dia, ?, T2.vip FROM uw_recharge T1 INNER JOIN uw_user T2 ON T1.userId = T2.id WHERE 1=1 GROUP BY T1.userId ORDER BY dia DESC,T2.lvl DESC,T2.createTime ASC LIMIT 100)a";
                client.query(sql, [c_prop.rankTypeKey.goldRank], cb1);    //财富榜
            },
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount) SELECT a.* FROM (SELECT T2.id, T2.nickName, T2.iconId, T2.lvl, SUM(SUBSTRING_INDEX(SUBSTRING_INDEX(T1.wingArr,',',2),',',-1)+0) A, ?, T2.vip FROM uw_hero T1 INNER JOIN uw_user T2 ON T1.userId = T2.id WHERE T1.wingArr != '[]' AND T1.wingArr IS NOT NULL GROUP BY T1.userId ORDER BY A DESC, SUM(SUBSTRING_INDEX(SUBSTRING_INDEX(wingArr,',',3),',',-1)+0) DESC, T2.createTime ASC LIMIT 100)a ";
                client.query(sql, [c_prop.rankTypeKey.wingRank], cb1);      //神翼榜
            },
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount) SELECT a.* FROM ( SELECT T2.id, T2.nickName, T2.iconId, T2.lvl, T1.killValue, ?, T2.vip FROM uw_pkout T1 INNER JOIN uw_user T2 ON T1.userId = T2.id WHERE T2.accountId != 0 ORDER BY T1.killValue DESC LIMIT 100)a ";
                client.query(sql, [c_prop.rankTypeKey.killRank], cb1);      //杀戮榜
            },
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount) SELECT a.* FROM ( SELECT T2.id, T2.nickName, T2.iconId, T2.lvl, T1.rank, ?, T2.vip FROM uw_arena T1 INNER JOIN uw_user T2 ON T1.userId = T2.id WHERE T2.accountId != 0 ORDER BY T1.rank ASC LIMIT 100)a ";
                client.query(sql, [c_prop.rankTypeKey.arenaRank], cb1);     //竞技榜
            },
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount) SELECT a.* FROM ( SELECT T2.id, T2.nickName, T2.iconId, T2.lvl, T1.combat, ?, T2.vip FROM uw_hero T1 INNER JOIN uw_user T2 ON T1.userId = T2.id WHERE T1.tempId = 1 AND T2.accountId != 0 ORDER BY T1.combat DESC, T2.combat DESC, T2.createTime ASC LIMIT 100)a ";
                client.query(sql, [c_prop.rankTypeKey.zsRank], cb1);        //战神榜
            },
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount) SELECT a.* FROM ( SELECT T2.id, T2.nickName, T2.iconId, T2.lvl, T1.combat, ?, T2.vip FROM uw_hero T1 INNER JOIN uw_user T2 ON T1.userId = T2.id WHERE T1.tempId = 2 AND T2.accountId != 0 ORDER BY T1.combat DESC, T2.combat DESC, T2.createTime ASC LIMIT 100)a ";
                client.query(sql, [c_prop.rankTypeKey.fsRank], cb1);        //法神榜
            },
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount) SELECT a.* FROM ( SELECT T2.id, T2.nickName, T2.iconId, T2.lvl, T1.combat, ?, T2.vip FROM uw_hero T1 INNER JOIN uw_user T2 ON T1.userId = T2.id WHERE T1.tempId = 3 AND T2.accountId != 0 ORDER BY T1.combat DESC, T2.combat DESC, T2.createTime ASC LIMIT 100)a ";
                client.query(sql, [c_prop.rankTypeKey.dsRank], cb1);        //道尊榜
            },
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount,combat) SELECT a.* FROM ( SELECT T1.id AS guildId, T2.nickName, T2.iconId, T2.lvl AS userLvl, T1.lvl, ?, T2.vip,T2.combat FROM uw_guild T1 INNER JOIN uw_user T2 ON T1.chairmanId = T2.id WHERE T2.accountId != 0 ORDER BY T1.lvl DESC,T2.combat DESC,T1.id ASC LIMIT 20)a ";
                client.query(sql, [c_prop.rankTypeKey.guildRank], cb1);        //行会等级榜
            },
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount,combat) SELECT a.* FROM ( SELECT b.guildId,U1.nickName,U1.iconId,U1.lvl AS userLvl,b.SumCombat,?,U1.vip,U1.combat FROM (SELECT GP.guildId,G.chairmanId,SUM(U.combat) AS SumCombat FROM uw_guild_personal GP INNER JOIN uw_user U ON GP.userId = U.id INNER JOIN uw_guild G ON G.id = GP.guildId  WHERE GP.guildId != 0 GROUP BY GP.guildId ORDER BY SUM(U.combat) DESC,G.lvl DESC,G.id ASC LIMIT 20)b INNER JOIN uw_user U1 ON b.chairmanId = U1.id)a ";
                client.query(sql, [c_prop.rankTypeKey.guildCombatRank], cb1);        //行会战力榜
            },
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount,combat) SELECT a.* FROM ( SELECT T1.id AS guildId, T2.nickName, T2.iconId, T2.lvl AS userLvl, T2.combat, ?, T2.vip,T2.combat AS combat1 FROM uw_guild T1 INNER JOIN uw_user T2 ON T1.chairmanId = T2.id WHERE T2.accountId != 0 ORDER BY T2.combat DESC,T1.lvl DESC,T1.id ASC LIMIT 20)a ";
                client.query(sql, [c_prop.rankTypeKey.chairmanCombatRank], cb1);        //会长战力榜
            },
            function(cb1){
                var sql = "INSERT INTO uw_user_rank (userId,userName,iconId,userLvl,rankValue,rankType,pkWinCount) SELECT a.* FROM (SELECT id, nickName, iconId, lvl, highPaTa, ?,vip FROM uw_user WHERE accountId != 0 ORDER BY highPaTa DESC,combat DESC,id ASC LIMIT 100)a ";
                client.query(sql, [c_prop.rankTypeKey.paTaRank], cb1);        //爬塔榜
            }
        ],function(err,data){
            cb(err);
        })
    });
};

/**
 * 获取个人排行榜
 * @param client
 * @param userId
 * @param rankType
 * @param cb
 */
exports.getUserRank = function(client, userId, rankType, cb){
    if(rankType == c_prop.rankTypeKey.guildRank || rankType == c_prop.rankTypeKey.guildCombatRank || rankType == c_prop.rankTypeKey.chairmanCombatRank){
        //userId（公会id）,userName（会长名称）,iconId（会长头像）,userLvl（会长等级）,rankValue（公会等级）,rankType（类型）,pkWinCount（会长vip）,combat（会长战力）
        guildPersonalDao.select(client, {userId: userId}, function(err,guildPersonalData){
            if (err) return cb(err);
            var guildId = guildPersonalData.guildId;
            rankDao.select(client, " userId = ? and rankType = ?", [guildId, rankType], function (err, rankData) {
                if (err) return cb(err);
                var exUserRankData = new ds.ExUserRankData();
                exUserRankData.userRankData = {};
                exUserRankData.userRank = 0;
                if (rankData) {       //排行榜存在数据
                    return cb(null, [exUserRankData,guildId]);
                } else {      //排行榜不存在数据
                    if (!guildPersonalData || !guildPersonalData.guildId) return cb(null, [exUserRankData,guildId]);
                    var guildData = g_guild.getGuild(guildPersonalData.guildId);
                    if (!guildData) return cb(null, [exUserRankData,guildId]);

                    var userRankData = new UserRankEntity();
                    userRankData.rankType = rankType;
                    if(rankType == c_prop.rankTypeKey.guildRank){
                        guildDao.getGuildRank(client,guildId,function(err,guildRank){
                            if(guildRank[0]){
                                userRankData.rankValue = guildRank[0].value;
                                exUserRankData.userRank = guildRank[0].rank;
                                exUserRankData.userRankData = userRankData;
                            }
                            return cb(null, [exUserRankData,guildId]);
                        });
                    }else if(rankType == c_prop.rankTypeKey.guildCombatRank){
                        guildDao.getGuildCombatRank(client,guildId,function(err,guildCombatRank){
                            if(guildCombatRank[0]) {
                                userRankData.rankValue = guildCombatRank[0].value;
                                exUserRankData.userRank = guildCombatRank[0].rank;
                                exUserRankData.userRankData = userRankData;
                            }
                            return cb(null, [exUserRankData,guildId]);
                        });
                    }else if(rankType == c_prop.rankTypeKey.chairmanCombatRank){
                        guildDao.getChairmanCombatRank(client,guildId,function(err,chairmanCombatRank){
                            if(chairmanCombatRank[0]) {
                                userRankData.rankValue = chairmanCombatRank[0].value;
                                exUserRankData.userRank = chairmanCombatRank[0].rank;
                                exUserRankData.userRankData = userRankData;
                            }
                            return cb(null, [exUserRankData,guildId]);
                        });
                    }
                }
            });
        });
    }else {
        rankDao.select(client, " userId = ? and rankType = ?", [userId, rankType], function (err, rankData) {
            if (err) return cb(err);
            var exUserRankData = new ds.ExUserRankData();
            if (rankData) {       //排行榜存在数据
                //var condition = "rankValue >= ?";
                //if(rankType == c_prop.rankTypeKey.arenaRank) condition = "rankValue <= ?";
                //_getUserRank(client,rankData,condition,rankType,function(err,data){
                //    exUserRankData.userRankData = rankData;
                //    exUserRankData.userRank = data;
                //    return cb(null,exUserRankData);
                //});
                exUserRankData.userRankData = {};
                exUserRankData.userRank = 0;
                return cb(null, exUserRankData);
            } else {      //排行榜不存在数据
                userDao.select(client, {id: userId}, function (err, userData) {
                    if (err) return cb(err);
                    var userRankData = new UserRankEntity();
                    userRankData.id = 23;
                    userRankData.userId = userId;
                    userRankData.userName = userData.nickName;
                    userRankData.iconId = userData.iconId;
                    userRankData.userLvl = userData.lvl;
                    userRankData.rankType = rankType;
                    _getAllArr(client, rankType, userData, function (err, data) {
                        exUserRankData.userRank = data[0];
                        userRankData.rankValue = data[1];
                        exUserRankData.userRankData = userRankData;
                        return cb(null, exUserRankData);
                    })
                });
            }
        });
    }
}

/**
 * 获取排行榜
 * @param client
 * @param rankType
 * @param cb
 */
exports.getRankList = function(client, rankType, cb){
    var rankCondition = "ORDER BY rankValue DESC,id ASC";
    if(rankType == c_prop.rankTypeKey.arenaRank) rankCondition = "ORDER BY rankValue ASC";
    if(rankType == c_prop.rankTypeKey.guildRank || rankType == c_prop.rankTypeKey.guildCombatRank || rankType == c_prop.rankTypeKey.chairmanCombatRank) rankCondition = "ORDER BY id ASC";
    rankDao.list(client,"rankType = ? " + rankCondition, [rankType],function(err,rankList){
        if(err) return cb(err);
        cb(null,rankList);
    });
};


/**
 * 获取排行榜前几名
 * @param client
 * @param rankType
 * @param top
 * @param cb
 */
exports.getRankListTop = function(client, rankType, top,cb){
    var rankCondition = "ORDER BY rankValue DESC limit ?";
    if(rankType == c_prop.rankTypeKey.arenaRank) rankCondition = "ORDER BY rankValue ASC limit ?";
    if(rankType == c_prop.rankTypeKey.guildRank) rankCondition = "ORDER BY id ASC limit ?";
    rankDao.list(client,"rankType = ? " + rankCondition, [rankType,top],function(err,rankList){
        if(err) return cb(err);
        cb(null,rankList);
    });
};


/**
 * 获取用户排行
 * @param client
 * @param cb
 */
exports.getUserRanks = function(client, cb){
    //todo
    var count = c_game.pkCfg[7];
    rankDao.list(client,"id < ?", [count],function(err,rankList){
        if(err) return cb(err);
        var userList = [];
        for(var i = 0;i < rankList.length;i ++){
            var opponent = new ds.PKUserData();
            var locRankData = rankList[i];
            opponent.userId = locRankData.userId;
            opponent.lvl = locRankData.userLvl;
            opponent.iconId = locRankData.iconId;
            opponent.nickName = locRankData.userName;
            opponent.pkWinCount = locRankData.pkWinCount;
            opponent.rank = locRankData.id;
            userList.push(opponent);
        }
        if(userList.length<=0) return cb(null,userList);
        _initUserSign(client,userList,function(err,data){
            if(err) return cb(err);
            cb(null,userList);
        });
    });
};

/**
 * 发送奖励
 * @param client
 * @param cb
 */
exports.sendAward = function(client, cb) {
    //todo
    rankDao.listCols(client, "id,userId,pkWinCount", {}, function (err, rankList) {
        if (err) return cb(err);

        var max = 1000;//分500一批插入
        var groupList = [];
        var tempCount = 0;
        var tempList = [];
        for (var i = 0; i < rankList.length; i++) {
            var locRankData = rankList[i];
            var items = {};
            var locPKLvl = userUtils.getPKLvl({pkWinCount:locRankData.pkWinCount});
            var pkLvlData = c_pkLvl[locPKLvl];
            items[c_prop.spItemIdKey.diamond] = pkLvlData.rewardPerDay;
            if(!items) continue;
            var mailEntity = mailBiz.createEntityByType(locRankData.userId, c_prop.mailTypeKey.arenaRank, [pkLvlData.name], items);
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

        async.map(groupList, function (group, cb1) {
            mailBiz.addMailByList(client,group,cb1);
        }, cb);
    });
};

/**
 * 获取自己的排名
 * @param client
 * @param userId
 * @param cb
 */
exports.getRank = function(client,userId,cb){
    //todo
    rankDao.select(client,{userId:userId},function(err, rankData){
        if(err) return cb(err);
        if(!rankData){
            var rank = 0;
        }else{
            var rank = rankData.id;
        }
        cb(null,rank);
    });
};

/***********************************************************private***************************************************************/

//初始化签名
var _initUserSign = function(client,userList,cb){
    var userIds = [];
    for(var i = 0;i < userList.length;i ++) {
        var locUser = userList[i];
        userIds.push(locUser.id);
    }
    //获取排名
    userDao.listCols(client," id,signName "," id in (?) ",[userIds],function(err,dataList){
        if(err) return cb(err);
        for(var i = 0;i < userList.length;i ++){
            var locUser = userList[i];
            for(var j = 0;j<dataList.length;j++){
                var locData = dataList[j];
                if(locUser.id == locData.id){
                    locUser.sign = locData.signName;
                }
            }
        }
        cb(null,userList);
    });
};

//用户在用户排行存在时的排名
var _getUserRank = function(client,rankData,condition,rankType,cb){
    rankDao.count(client, " rankType = ? and " + condition, [rankType,rankData.rankValue], function(err,rankCount)  {
        if (err) return cb(err);
        cb(null,rankCount);
    });
};

var _getAllArr = function(client,rankType,userData,cb){
    if(rankType == c_prop.rankTypeKey.arenaRank){
        _getArenaRank(client,userData.id,cb);
    }else{
        _getOtherArr(client,userData,rankType,cb);
    }
}

//获取用户巅峰赛排名
var _getArenaRank = function(client,userId,cb){
    arenaDao.select(client, {userId:userId}, function(err,arenaData){
        if(err) return cb(err);
        var arrayObj = [];
        var rank = 0;
        if(arenaData) rank = arenaData.rank;
        arrayObj.push(rank);
        arrayObj.push(rank);
        cb(null,arrayObj);
    });
};

//获取用户水晶系统排名和当前关数[排名,当前关数]
var _getCrystalArr = function(client,userId,cb){
    crystalDao.select(client, {userId:userId}, function(err,crystalData){
        if(err) return cb(err);
        var arrayObj = [];
        var rank = 0;
        arrayObj.push(rank);
        arrayObj.push(rank);
        if(!crystalData) return cb(null,arrayObj);
        var crystalId = crystalData.crystalId;
        crystalDao.count(client, " crystalId > ? ", [crystalId], function(err,crystalCount) {
            if (err) return cb(err);
            var arrayObj = [];
            arrayObj.push(crystalCount);
            arrayObj.push(crystalData.crystalId);
            cb(null,arrayObj);
        });
    });
};

//获取除巅峰赛的排名和当前value[排名,当前value]
var _getOtherArr = function(client,userData,rankType,cb){
    var strWhere = "";
    var value = 0;
    switch(rankType){
        case c_prop.rankTypeKey.lvlRank:   //等级榜
            strWhere = "SELECT COUNT(*) as rank FROM uw_user WHERE accountId != 0 AND lvl > " + userData.lvl;
            value = userData.lvl;
            break;
        case c_prop.rankTypeKey.combatRank:    //总战榜
            strWhere = "SELECT COUNT(*) as rank FROM uw_user WHERE accountId != 0 AND combat > " + userData.combat;
            value = userData.combat;
            break;
        case c_prop.rankTypeKey.goldRank:    //财富榜
            strWhere = "SELECT COUNT(a) AS rank,(SELECT SUM(diamond) FROM uw_recharge WHERE userId = " + userData.id + " GROUP BY userId) AS value FROM (SELECT SUM(diamond) A FROM uw_recharge WHERE 1=1 GROUP BY userId)a WHERE A > (SELECT SUM(diamond) FROM uw_recharge WHERE userId = " + userData.id + " GROUP BY userId)";
            break;
        case c_prop.rankTypeKey.wingRank:      //神翼榜
            strWhere = "SELECT COUNT(a) as rank,(SELECT SUM(SUBSTRING_INDEX(SUBSTRING_INDEX(wingArr,',',2),',',-1)+0) FROM uw_hero WHERE userId = " + userData.id + " AND wingArr != '[]' AND wingArr IS NOT NULL GROUP BY userId) as value FROM (SELECT SUM(SUBSTRING_INDEX(SUBSTRING_INDEX(wingArr,',',2),',',-1)+0) A FROM uw_hero WHERE wingArr != '[]' AND wingArr IS NOT NULL GROUP BY userId)a WHERE A > (SELECT SUM(SUBSTRING_INDEX(SUBSTRING_INDEX(wingArr,',',2),',',-1)+0) FROM uw_hero WHERE userId = " + userData.id + " AND wingArr != '[]' AND wingArr IS NOT NULL GROUP BY userId)";
            break;
        case c_prop.rankTypeKey.killRank:      //杀戮榜
            strWhere = "SELECT COUNT(a) AS rank,(SELECT killValue FROM uw_pkout WHERE userId = " + userData.id + ") AS value FROM (SELECT killValue A,userId FROM uw_pkout)a LEFT JOIN uw_user u ON a.userId = u.id WHERE u.robotId =0 AND A > (SELECT killValue FROM uw_pkout WHERE userId = " + userData.id + ")";
            //strWhere = "SELECT COUNT(p.id) AS rank FROM uw_pkout p LEFT JOIN uw_user u ON p.userId = u.id WHERE u.robotId =0 AND killValue > (SELECT killValue FROM uw_pkout WHERE userId = " + userData.id + ") ORDER BY p.killValue DESC";
            break;
        case c_prop.rankTypeKey.zsRank:        //战神榜
            strWhere = "SELECT COUNT(a) AS rank,(SELECT combat FROM uw_hero WHERE userId = " + userData.id + " AND tempId = 1) AS value FROM (SELECT combat A FROM uw_hero WHERE tempId = 1)a WHERE A > (SELECT combat FROM uw_hero WHERE userId = " + userData.id + " AND tempId = 1)";
            break;
        case c_prop.rankTypeKey.fsRank:        //法神榜
            strWhere = "SELECT COUNT(a) AS rank,(SELECT combat FROM uw_hero WHERE userId = " + userData.id + " AND tempId = 2) AS value FROM (SELECT combat A FROM uw_hero WHERE tempId = 2)a WHERE A > (SELECT combat FROM uw_hero WHERE userId = " + userData.id + " AND tempId = 2)";
            break;
        case c_prop.rankTypeKey.dsRank:        //道尊榜
            strWhere = "SELECT COUNT(a) AS rank,(SELECT combat FROM uw_hero WHERE userId = " + userData.id + " AND tempId = 3) AS value FROM (SELECT combat A FROM uw_hero WHERE tempId = 3)a WHERE A > (SELECT combat FROM uw_hero WHERE userId = " + userData.id + " AND tempId = 3)";
            break;
        case c_prop.rankTypeKey.paTaRank:        //爬塔榜
            strWhere = "SELECT COUNT(*) as rank FROM uw_user WHERE accountId != 0 AND highPaTa > " + userData.highPaTa;
            value = userData.highPaTa;
            break;
    }
    client.query(strWhere, [], function(err,userCount) {
        if (err) return cb(err);
        var arrayObj = [];
        if(rankType == c_prop.rankTypeKey.goldRank || rankType == c_prop.rankTypeKey.wingRank || rankType == c_prop.rankTypeKey.killRank || rankType == c_prop.rankTypeKey.zsRank || rankType == c_prop.rankTypeKey.fsRank || rankType == c_prop.rankTypeKey.dsRank) value = userCount[0].value;
        arrayObj.push(userCount[0].rank);
        arrayObj.push(value);
        cb(null,arrayObj);
    });
};