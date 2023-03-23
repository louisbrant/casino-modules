/**
 * Created by John on 2016/4/14.
 */
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').IncognitoEntity;
    this.castCols = {
    };
    //++++++++++++++++++begin++++++++++++++++++++++
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();