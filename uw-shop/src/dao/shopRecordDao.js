/**
 * Created by John on 2016/6/13.
 */
var util = require("util");
var BaseDao = require("uw-db").BaseDao;

function Dao(){
    BaseDao.call(this);
    this.Entity = require('uw-entity').ShopRecordEntity;
}
util.inherits(Dao,BaseDao);
module.exports = new Dao();