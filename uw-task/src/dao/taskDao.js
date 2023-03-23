/**
 * Created by Administrator on 2014/5/6.
 */

var BaseDao = require("uw-db").BaseDao;

var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').TaskEntity;
    this.castCols = {
        dailyTasks : BaseDao.CAST_OBJECT,
        tasks : BaseDao.CAST_OBJECT,
        tasksValue : BaseDao.CAST_OBJECT,
        vitalityChests : BaseDao.CAST_ARRAY,
        doneTasks : BaseDao.CAST_ARRAY
    };
    //++++++++++++++++++begin++++++++++++++++++++++

};

util.inherits(Dao, BaseDao);
module.exports = new Dao();