var util = require("util");
var BaseDao = require("uw-db").BaseDao;
function Dao(){
    BaseDao.call(this);
    this.Entity = require('uw-entity').UserEntity;
    this.castCols = {
        bag:BaseDao.CAST_OBJECT,
        equipBag:BaseDao.CAST_OBJECT,
        honorData : BaseDao.CAST_OBJECT,
        sign : BaseDao.CAST_ARRAY,
        activity : BaseDao.CAST_OBJECT,
        exData : BaseDao.CAST_OBJECT,
        counts : BaseDao.CAST_ARRAY,
        countsRefreshTime : BaseDao.CAST_ARRAY,
        record : BaseDao.CAST_OBJECT,
        redPointData : BaseDao.CAST_OBJECT,
        onlineLootData : BaseDao.CAST_ARRAY,
        medalData : BaseDao.CAST_OBJECT,
        propertyData : BaseDao.CAST_OBJECT
    }
    //++++++++++自定义方法+++++++++++++++++++++
    /**
     * sql语句
     * @param client
     * @param userId
     * @param cb
     */
    this.query = function(client,sqlStatement,cb){
        client.query(sqlStatement,function(err,data){
            if(err) return cb(err);
            cb(null,data);
        });
    };

    //获取战斗力最叼的几名
    this.getCombatRankNum = function(client,ignoreIds,num,cb){
        var userIds = [];
        if(num<=0) return cb(null,userIds);
        var strSql = "SELECT id,combat FROM uw_user where accountId > 0 and id not in (?)  order by combat desc limit 0,?";
        client.query(strSql,[[0].concat(ignoreIds),num], function(err,data){
            if(err) return cb(err);
            for(var i = 0;i<data.length;i++){
                userIds.push(data[i].id)
            }
            cb(null,userIds);
        });
    };
}
util.inherits(Dao,BaseDao);
module.exports = new Dao();