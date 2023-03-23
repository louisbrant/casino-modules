/**
 * Created by Administrator on 2014/5/6.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').BossEntity;
    this.castCols = {
        resultData:BaseDao.CAST_OBJECT,
        callArr:BaseDao.CAST_ARRAY,
        errData:BaseDao.CAST_OBJECT
    };
    //++++++++++++++++++begin++++++++++++++++++++++

    //备份数据
    this.bakData = function (client, cb) {
        client.query("TRUNCATE TABLE uw_boss_bak", function(err) {
            if (err) return cb(err);
            var strSql = "insert into uw_boss_bak select * from uw_boss";
            client.query(strSql, [], cb);
        } );
    };
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();