/**
 * Created by John on 2016/4/15.
 */
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').TreasureRecordEntity;
    this.castCols = {
        items:BaseDao.CAST_OBJECT
    };
    //++++++++++++++++++begin++++++++++++++++++++++
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();