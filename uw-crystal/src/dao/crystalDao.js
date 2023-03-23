/**
 * Created by Administrator on 2014/5/6.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').CrystalEntity;
    this.castCols = {
        canPickIds:BaseDao.CAST_ARRAY,
        skillTimes:BaseDao.CAST_ARRAY
    };
    this.getCount = function(client, whereStr, args,cb){
        var strSql = "SELECT count(id) idCount FROM uw_crystal WHERE "+whereStr;
        client.query(strSql,args,function(err,data){
            if(err) return cb(err);
            var count = data[0].idCount||0;
            cb(err,count) ;
        });
    }
    //++++++++++++++++++begin++++++++++++++++++++++
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();