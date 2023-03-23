/**
 * Created by Administrator on 2014/5/6.
 */

var BaseDao = require("uw-db").BaseDao;

var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').GuildGroupEntity;
    this.castCols = {
        serverArr:BaseDao.CAST_ARRAY,
        lastRankData:BaseDao.CAST_OBJECT
    };
    //++++++++++++++++++begin++++++++++++++++++++++

};

util.inherits(Dao, BaseDao);
module.exports = new Dao();