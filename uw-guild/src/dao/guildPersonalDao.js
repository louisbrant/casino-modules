/**
 * Created by Administrator on 2014/5/6.
 */

var BaseDao = require("uw-db").BaseDao;

var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').GuildPersonalEntity;
    this.castCols = {
        outMsg : BaseDao.CAST_ARRAY,
        appliedMsg : BaseDao.CAST_ARRAY,
        actData : BaseDao.CAST_OBJECT
    };
    //++++++++++++++++++begin++++++++++++++++++++++
    this.getPersonUserList = function (client, guildId, cb) {
        var strSql = "SELECT p.addUpAct,p.guildAct,p.position,p.userId, u.lvl, u.vip, u.nickName, u.iconId, u.combat,u.lastUpdateTime,p.ennoble FROM uw_guild_personal p left join uw_user u on p.userId = u.id   where p.guildId =? ";
        client.query(strSql, [guildId], cb);
    };

    this.getQQBrownerPersonAccountList = function(client, guildId, cb) {
        var strSql = "SELECT u.accountId, p.userId FROM uw_guild_personal p left join uw_user u on p.userId = u.id where p.guildId = ? and (u.sdkChannelId = 100039 || u.sdkChannelId = 100069)";
        client.query(strSql, [guildId], function(err, dataList) {
            if (err || !dataList) return cb(err, dataList);
            cb(err, dataList);
        });
    };

};

util.inherits(Dao, BaseDao);
module.exports = new Dao();