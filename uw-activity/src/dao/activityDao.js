/**
 * Created by Administrator on 13-12-14.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').ActivityEntity;
    this.castCols = {
        items:BaseDao.CAST_ARRAY,
        randomHeroes:BaseDao.CAST_ARRAY,
        exValues:BaseDao.CAST_ARRAY,
        exValues2:BaseDao.CAST_ARRAY,
        exValues3:BaseDao.CAST_ARRAY,
        exData : BaseDao.CAST_OBJECT
    };
    //++++++++++++++++++begin++++++++++++++++++++++
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();