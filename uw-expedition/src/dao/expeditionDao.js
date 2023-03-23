/**
 * Created by Administrator on 2016/7/6.
 */
var util = require("util");
var BaseDao = require("uw-db").BaseDao;
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').ExpeditionEntity;
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();