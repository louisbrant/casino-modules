/**
 * Created by Administrator on 2014/5/6.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').ServerInfoEntity;
    //++++++++++++++++++begin++++++++++++++++++++++
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();