/**
 * Created by Sara on 2015/8/12.
 */
var util = require("util");
var BaseDao = require("uw-db").BaseDao;

function Dao(){
    BaseDao.call(this);
    this.Entity = require('uw-entity').ShopEntity;
    this.castCols = {
        items: BaseDao.CAST_ARRAY
    };
}
util.inherits(Dao,BaseDao);
module.exports = new Dao();