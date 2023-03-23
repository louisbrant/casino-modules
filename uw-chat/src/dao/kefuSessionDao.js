var util = require("util");
var BaseDao = require("uw-db").BaseDao;
function Dao(){
    BaseDao.call(this);
    this.Entity = 'customer_game_roles';
    //++++++++++自定义方法+++++++++++++++++++++
}
util.inherits(Dao,BaseDao);
module.exports = new Dao();
