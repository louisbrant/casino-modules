/**
 * Created by Administrator on 2014/5/6.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').HeroEntity;
    this.castCols = {
        equipData:BaseDao.CAST_OBJECT,
        skillLvlArr:BaseDao.CAST_ARRAY,
        intensifyArr:BaseDao.CAST_ARRAY,
        starArr:BaseDao.CAST_ARRAY,
        gemArr:BaseDao.CAST_ARRAY,
        wingArr:BaseDao.CAST_ARRAY,
        propArr:BaseDao.CAST_ARRAY,
        realmArr:BaseDao.CAST_ARRAY,
        refineArr: BaseDao.CAST_ARRAY,
        starTopArr: BaseDao.CAST_ARRAY,
        talismanData:BaseDao.CAST_OBJECT,
        talismanFg:BaseDao.CAST_OBJECT,
        soulArr:BaseDao.CAST_OBJECT
    };
    //++++++++++++++++++begin++++++++++++++++++++++
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();