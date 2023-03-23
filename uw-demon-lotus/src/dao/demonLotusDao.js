/**
 * Created by Administrator on 2014/5/6.
 */

var BaseDao = require("uw-db").BaseDao;

var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').DemonLotusEntity;
    this.castCols = {
    };
    //++++++++++++++++++begin++++++++++++++++++++++

};

util.inherits(Dao, BaseDao);
module.exports = new Dao();