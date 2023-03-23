/**
 * Created by Administrator on 2014/5/6.
 */

var BaseDao = require("uw-db").BaseDao;

var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').RedEnvelopePersonalEntity;
    this.castCols = {
        getData : BaseDao.CAST_ARRAY,
        exData : BaseDao.CAST_OBJECT,
        exAddUpGet: BaseDao.CAST_OBJECT
    };
    //++++++++++++++++++begin++++++++++++++++++++++

};

util.inherits(Dao, BaseDao);
module.exports = new Dao();