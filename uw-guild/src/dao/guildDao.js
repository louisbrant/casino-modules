/**
 * Created by Administrator on 2014/5/6.
 */

var BaseDao = require("uw-db").BaseDao;

var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').GuildEntity;
    this.castCols = {
        ennobleData : BaseDao.CAST_OBJECT,
        viceChairmanId : BaseDao.CAST_ARRAY,
        appliedMembers : BaseDao.CAST_ARRAY,
        guildCopyData : BaseDao.CAST_OBJECT
    };
    //++++++++++++++++++begin++++++++++++++++++++++
    this.getGuildRank = function (client, guildId, cb) {
        var strSql = "SELECT COUNT(*) AS rank,(SELECT lvl FROM uw_guild WHERE id = ?) AS value FROM uw_guild WHERE lvl >= (SELECT lvl FROM uw_guild WHERE id = ?)";
        client.query(strSql, [guildId,guildId], cb);
    };
    this.getGuildCombatRank = function (client, guildId, cb) {
        var strSql = "SELECT COUNT(*) AS rank,(SELECT SUM(U1.combat) FROM uw_guild_personal GP1 INNER JOIN uw_user U1 ON GP1.userId = U1.id WHERE GP1.guildId != 0 AND GP1.guildId = ? GROUP BY GP1.guildId) AS value FROM ( SELECT SUM(U.combat) AS SumCombat FROM uw_guild_personal GP INNER JOIN uw_user U ON GP.userId = U.id INNER JOIN uw_guild G ON G.id = GP.guildId  WHERE GP.guildId != 0  GROUP BY GP.guildId ORDER BY SUM(U.combat) DESC,G.lvl DESC,G.id ASC )a WHERE a.SumCombat >= (SELECT SUM(U1.combat) FROM uw_guild_personal GP1 INNER JOIN uw_user U1 ON GP1.userId = U1.id WHERE GP1.guildId != 0 AND GP1.guildId = ? GROUP BY GP1.guildId)";
        client.query(strSql, [guildId,guildId], cb);
    };
    this.getGuildCombat = function (client, guildId, cb) {
        var strSql = " SELECT SUM(u.combat) AS combat FROM uw_user u WHERE u.id IN ( SELECT gp.userId FROM uw_guild_personal gp WHERE gp.guildId = ?)";
        var args = [guildId];
        client.query(strSql, args, function(err,data){
            if(err) return cb(err);
            var fData = data[0]||{};
            cb(null,fData.combat||0);
        });
    };
    this.getUserListByCombat = function (client, guildId, num,cb) {
        var strSql = " SELECT * FROM uw_user u WHERE u.id IN ( SELECT gp.userId FROM uw_guild_personal gp WHERE gp.guildId = ?) and u.accountId<>0 order by u.combat desc limit 0,?";
        var args = [guildId,num];
        client.query(strSql, args, function(err,data){
            if(err) return cb(err);
            cb(null,data);
        });
    };
    this.getChairmanCombatRank = function (client, guildId, cb) {
        var strSql = "SELECT COUNT(*) AS rank,(SELECT T4.combat FROM uw_guild T3 INNER JOIN uw_user T4 ON T3.chairmanId = T4.id WHERE T3.id = ?) AS value FROM ( SELECT T2.combat FROM uw_guild T1 INNER JOIN uw_user T2 ON T1.chairmanId = T2.id WHERE T2.accountId != 0 ORDER BY T2.combat DESC,T1.lvl DESC,T1.id ASC)a WHERE a.combat >= (SELECT T4.combat FROM uw_guild T3 INNER JOIN uw_user T4 ON T3.chairmanId = T4.id WHERE T3.id = ?)";
        client.query(strSql, [guildId,guildId], cb);
    };
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();