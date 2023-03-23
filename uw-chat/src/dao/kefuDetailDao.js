var util = require("util");
var BaseDao = require("uw-db").BaseDao;
function Dao(){
    BaseDao.call(this);
    this.Entity = 'customer_chat_logs';
}
util.inherits(Dao,BaseDao);
module.exports = new Dao();
