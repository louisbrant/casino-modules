var logger = require('uw-log').getLogger("uw-logger",__filename);
var util = require("util");
var BaseDao = require("uw-db").BaseDao;


function Dao(){
    BaseDao.call(this);
    this.Entity = require('uw-entity').RechargeRequestEntity;

}
util.inherits(Dao,BaseDao);
module.exports = new Dao();