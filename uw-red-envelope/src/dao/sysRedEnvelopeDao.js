/**
 * Created by John on 2016/5/30.
 */

var BaseDao = require("uw-db").BaseDao;

var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').SysRedEnvelopeEntity;
    this.castCols = {
        limitZone : BaseDao.CAST_ARRAY
    };
    //++++++++++++++++++begin++++++++++++++++++++++

};

util.inherits(Dao, BaseDao);
module.exports = new Dao();