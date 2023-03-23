//var logger = require('pomelo-logger').getLogger("uw-logger",__filename);
var util = require("util");
var BaseDao = require("uw-db").BaseDao;
function Dao(){
    BaseDao.call(this);
    this.Entity = require('uw-entity').CopyProgressEntity;
    this.castCols = {
        copyObj : BaseDao.CAST_OBJECT,
        timeArr : BaseDao.CAST_ARRAY,
        copyStar : BaseDao.CAST_OBJECT,
        timesPerDay : BaseDao.CAST_OBJECT,
        resetCounts : BaseDao.CAST_OBJECT,
        isPickAward : BaseDao.CAST_ARRAY,
        isPickChests : BaseDao.CAST_ARRAY,
        readObj : BaseDao.CAST_OBJECT
    };

    //++++++++++自定义方法+++++++++++++++++++++
};
util.inherits(Dao,BaseDao);
module.exports = new Dao();