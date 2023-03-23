var util = require("util");
var BaseDao = require("uw-db").BaseDao;
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').EventEntity;
    this.castCols = {
        beginEvents : BaseDao.CAST_ARRAY,
        record : BaseDao.CAST_OBJECT,
        items : BaseDao.CAST_OBJECT
    };
    //++++++++++++++++++begin++++++++++++++++++++++
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();