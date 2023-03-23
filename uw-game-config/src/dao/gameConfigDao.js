/**
 * Created by Administrator on 2014/5/6.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').GameConfigEntity;
    this.castCols = {
        guildWarSign:BaseDao.CAST_ARRAY,
        guildWarOpen:BaseDao.CAST_ARRAY,
        redisHostArr:BaseDao.CAST_ARRAY,
        noSignServerArr:BaseDao.CAST_ARRAY
    };
    //++++++++++++++++++begin++++++++++++++++++++++
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();