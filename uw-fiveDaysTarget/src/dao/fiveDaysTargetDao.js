/**
 * Created by Administrator on 2015/12/15.
 */
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
var uwData = require("uw-data");
var c_prop = uwData.c_prop;
var async = require("async");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').FiveDaysTargetEntity;
    this.castCols = {
        items:BaseDao.CAST_OBJECT
    };
    //++++++++++++++++++begin++++++++++++++++++++++
    //
    this.getRankListTop = function (client, rankType, top, cb) {
        var strSql = "";
        switch(rankType){
            case c_prop.rankTypeKey.combatRank:
            {
                strSql = "SELECT a.* FROM (SELECT id AS userId, nickName AS userName, iconId, lvl AS userLvl, combat AS rankValue, ? AS rankType, vip AS pkWinCount FROM uw_user WHERE accountId != 0 ORDER BY combat DESC,lvl DESC,createTime ASC LIMIT ?)a";
                break;
            }
            case c_prop.rankTypeKey.wingRank:
            {
                strSql = "SELECT a.* FROM (SELECT T2.id userId, T2.nickName userName, T2.iconId, T2.lvl userLvl, SUM(SUBSTRING_INDEX(SUBSTRING_INDEX(T1.wingArr,',',2),',',-1)+0) rankValue, ? rankType, T2.vip pkWinCount FROM uw_hero T1 INNER JOIN uw_user T2 ON T1.userId = T2.id WHERE T1.wingArr != '[]' AND T1.wingArr IS NOT NULL GROUP BY T1.userId ORDER BY rankValue DESC, SUM(SUBSTRING_INDEX(SUBSTRING_INDEX(wingArr,',',3),',',-1)+0) DESC, T2.createTime ASC LIMIT ?)a ";
                break;
            }
            case c_prop.rankTypeKey.arenaRank:
            {
                strSql = "SELECT a.* FROM ( SELECT T2.id userId, T2.nickName userName, T2.iconId, T2.lvl userLvl, T1.rank rankValue, ? rankType, T2.vip pkWinCount FROM uw_arena T1 INNER JOIN uw_user T2 ON T1.userId = T2.id WHERE T2.accountId != 0 ORDER BY T1.rank ASC LIMIT ?)a";
                break;
            }
            case c_prop.rankTypeKey.guildRank:
            {
                strSql = "SELECT a.* FROM ( SELECT T2.id  userId, T2.nickName userName, T2.iconId, T2.lvl  userLvl, T1.lvl rankValue, ? rankType, T2.vip pkWinCount,T2.combat combat FROM uw_guild T1 INNER JOIN uw_user T2 ON T1.chairmanId = T2.id WHERE T2.accountId != 0 ORDER BY T1.lvl DESC,T2.combat DESC,T1.id ASC LIMIT ?)a";
                break;
            }
            default :
                return cb(null,[]);
                break;
        }
        client.query(strSql, [rankType, top], cb);
    };

    this.getRankListTopBak = function (client, rankType, top, cb) {
        var strSql = "";
        switch(rankType){
            case c_prop.rankTypeKey.combatRank:
            {
                strSql = "SELECT a.* FROM (SELECT id AS userId, nickName AS userName, iconId, lvl AS userLvl, combat AS rankValue, ? AS rankType, vip AS pkWinCount FROM uw_user_bak WHERE accountId != 0 ORDER BY combat DESC,lvl DESC,createTime ASC LIMIT ?)a";
                break;
            }
            case c_prop.rankTypeKey.wingRank:
            {
                strSql = "SELECT a.* FROM (SELECT T2.id userId, T2.nickName userName, T2.iconId, T2.lvl userLvl, SUM(SUBSTRING_INDEX(SUBSTRING_INDEX(T1.wingArr,',',2),',',-1)+0) rankValue, ? rankType, T2.vip pkWinCount FROM uw_hero_bak T1 INNER JOIN uw_user_bak T2 ON T1.userId = T2.id WHERE T1.wingArr != '[]' AND T1.wingArr IS NOT NULL GROUP BY T1.userId ORDER BY rankValue DESC, SUM(SUBSTRING_INDEX(SUBSTRING_INDEX(wingArr,',',3),',',-1)+0) DESC, T2.createTime ASC LIMIT ?)a ";
                break;
            }
            case c_prop.rankTypeKey.arenaRank:
            {
                strSql = "SELECT a.* FROM ( SELECT T2.id userId, T2.nickName userName, T2.iconId, T2.lvl userLvl, T1.rank rankValue, ? rankType, T2.vip pkWinCount FROM uw_arena_bak T1 INNER JOIN uw_user_bak T2 ON T1.userId = T2.id WHERE T2.accountId != 0 ORDER BY T1.rank ASC LIMIT ?)a";
                break;
            }
            case c_prop.rankTypeKey.guildRank:
            {
                strSql = "SELECT a.* FROM ( SELECT T2.id  userId, T2.nickName userName, T2.iconId, T2.lvl  userLvl, T1.lvl rankValue, ? rankType, T2.vip pkWinCount,T2.combat combat FROM uw_guild_bak T1 INNER JOIN uw_user T2 ON T1.chairmanId = T2.id WHERE T2.accountId != 0 ORDER BY T1.lvl DESC,T2.combat DESC,T1.id ASC LIMIT ?)a";
                break;
            }
            default :
                return cb(null,[]);
                break;
        }
        client.query(strSql, [rankType, top], cb);
    };

    this.getCurTaskValue = function(client, userId,taskType, cb) {
        var strSql = "";
        switch(taskType) {
            case c_prop.cTaskType.wing:
            {
                strSql = "SELECT  SUM(SUBSTRING_INDEX(SUBSTRING_INDEX(T1.wingArr,',',2),',',-1)+0) rankValue FROM uw_hero T1 INNER JOIN uw_user T2 ON T1.userId = T2.id WHERE T1.wingArr != '[]' AND T1.wingArr IS NOT NULL AND T2.id = ?";
                break;
            }
             case  c_prop.cTaskTypeKey.guild:
             {
                strSql = "SELECT  COUNT(*) as count, guildId FROM uw_guild_personal WHERE userId = ?";
                 break;
             }
        }
        client.query(strSql, [userId], cb);
    }

    //复制竞技场表数据
    this.sqlTargetBak = function(client, day, cb){
        switch(day){
            case 1:
            {
                client.query("TRUNCATE TABLE uw_user_bak", function(err){
                    if (err) return cb(err);
                    client.query("INSERT INTO uw_user_bak SELECT id, accountId, iconId, nickName, lvl, expc, combat, vip, vipScore, exData, createTime FROM uw_user", cb);
                })
                break;
            }
            case 2:
            {
                async.parallel([
                    function (cb1) {
                        client.query("TRUNCATE TABLE uw_user_bak",cb1);
                    },
                    function (cb1) {
                        client.query("TRUNCATE TABLE uw_hero_bak",cb1);
                    }
                ], function(err, data) {
                    if (err) return cb(err);
                    async.parallel([
                        function(cb1){
                            client.query("INSERT INTO uw_user_bak SELECT id, accountId, iconId, nickName, lvl, expc, combat, vip, vipScore, exData, createTime FROM uw_user", cb1);
                        },
                        function(cb1) {
                            client.query("INSERT INTO uw_hero_bak SELECT id, userId, wingArr, wingSumLvl, gemSumLvl, realmSumLvl FROM uw_hero", cb1);
                        }
                    ], function(err, data){
                        cb(null)
                    })
                });
                break;
            }
            case 3:
            {
                client.query("TRUNCATE TABLE uw_user_bak", function(err){
                    if (err) return cb(err);
                    client.query("INSERT INTO uw_user_bak SELECT id, accountId, iconId, nickName, lvl, expc, combat, vip, vipScore, exData, createTime FROM uw_user", cb);
                })
                break;
            }
            case 4:
            {
                client.query("TRUNCATE TABLE uw_guild_bak", function(err){
                    if (err) return cb(err);
                    client.query("INSERT INTO uw_guild_bak SELECT id, chairmanId, lvl FROM uw_guild", cb);
                })
                break;
            }
            default:
                cb("活动时间已过")
        }
    };
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();