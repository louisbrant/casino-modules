/**
 * Created by Administrator on 2014/5/6.
 */

var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').HeartStuntEntity;
    this.castCols = {
        stateArr : BaseDao.CAST_ARRAY,
        heartLvlArr : BaseDao.CAST_ARRAY
    };
    //++++++++++++++++++begin++++++++++++++++++++++
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();