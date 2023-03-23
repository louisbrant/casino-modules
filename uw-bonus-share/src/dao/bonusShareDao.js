
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    // this.Entity = require('uw-entity').BonusShareEntity;
    this.Entity = 'uw_bonus_share';
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();
