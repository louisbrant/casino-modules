
var util = require("util");
var BaseDao = require("uw-db").BaseDao;
function Dao(){
    BaseDao.call(this);
    this.Entity = require('uw-entity').UserRankEntity;
    this.castCols = {

    }
    //++++++++++自定义方法+++++++++++++++++++++
}
util.inherits(Dao,BaseDao);
module.exports = new Dao();