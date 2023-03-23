/**
 * Created by Administrator on 2016/1/5.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.castCols = {
        exData:BaseDao.CAST_OBJECT
    };
    this.Entity = require('uw-entity').ChallengeCupEntity;
    //++++++++++++++++++begin++++++++++++++++++++++
    this.getGuildInfo = function(client, userId, cb) {
        var strSql = "SELECT name, lvl FROM uw_guild WHERE id = (SELECT guildId  FROM uw_guild_personal a  WHERE userId = ?)";
        client.query(strSql, [userId], cb);
    }
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();