
var util = require("util");
var BaseDao = require("uw-db").BaseDao;
function Dao(){
    BaseDao.call(this);
    this.Entity = require('uw-entity').AccountEntity;
    this.castCols = {
        sdkData : BaseDao.CAST_OBJECT,
        exData : BaseDao.CAST_OBJECT,
        userServers : BaseDao.CAST_ARRAY,
        loginKey : BaseDao.CAST_ARRAY,
        rechargeCom : BaseDao.CAST_ARRAY
    }
    //++++++++++自定义方法+++++++++++++++++++++
}
util.inherits(Dao,BaseDao);
module.exports = new Dao();