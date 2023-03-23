/**
 * Created by Administrator on 2014/5/6.
 */

var BaseDao = require("uw-db").BaseDao;

var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').GuildWarSignEntity;
    this.castCols = {

    };
    //++++++++++++++++++begin++++++++++++++++++++++
    //复制竞技场表数据
    this.clear = function(client,cb){
        client.query("TRUNCATE TABLE uw_guild_war_sign", cb);
    };
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();