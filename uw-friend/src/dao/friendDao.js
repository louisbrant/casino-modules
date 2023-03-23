var util = require("util");
var BaseDao = require("uw-db").BaseDao;
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').FriendEntity;
    this.castCols = {
        friendArr : BaseDao.CAST_ARRAY,
        requestedArr : BaseDao.CAST_ARRAY,
        cheerObj : BaseDao.CAST_OBJECT
    };
    //++++++++++++++++++begin++++++++++++++++++++++
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();