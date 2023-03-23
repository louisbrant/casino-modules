var util = require("util");
var BaseDao = require("uw-db").BaseDao;
function Dao(){
    BaseDao.call(this);
    this.Entity = 'uw_system_message';
}
util.inherits(Dao,BaseDao);
module.exports = new Dao();