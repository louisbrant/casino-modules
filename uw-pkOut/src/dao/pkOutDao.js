/**
 * Created by Administrator on 2014/5/6.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').PkOutEntity;
    this.castCols = {
        enemyIds:BaseDao.CAST_ARRAY,
        enemyTypes:BaseDao.CAST_ARRAY
    };
    //++++++++++++++++++begin++++++++++++++++++++++

    this.getPkOutUserList = function (client, userIds, cb) {
        if(userIds.length<=0) return cb(null,[]);
        var strSql = "SELECT p.killValue,p.pkValue,p.pkValueTime, p.userId, u.lvl, u.vip, u.nickName, u.robotId, u.iconId, u.gold, u.combat FROM uw_pkout p left join uw_user u on p.userId = u.id   where p.userId in (?) ";
        client.query(strSql, [userIds], cb);
    };

    this.getRankList = function (client, count, cb) {
        //var strSql = "SELECT p.killValue, p.pkValue,p.pkValueTime,u.nickName, u.combat,u.iconId,u.lvl FROM uw_pkout p left join uw_user u on p.userId = u.id   order by p.killValue desc limit 0,?";
        var strSql = "SELECT p.killValue, p.pkValue,p.pkValueTime,p.userId,u.nickName, u.combat,u.iconId,u.lvl,u.vip FROM uw_pkout p left join uw_user u on p.userId = u.id where u.robotId =0  order by p.killValue desc limit 0,?";
        client.query(strSql, [count], cb);
    };

    //
    this.getAllRankList = function (client, cb) {
        var strSql = "SELECT p.userId FROM uw_pkout p left join uw_user u on p.userId = u.id where u.robotId =0  order by p.killValue desc";
        client.query(strSql, [], cb);
    };

    //获取排名
    this.getRank = function(client, killValue, cb){
        var strSql = "SELECT count(p.id) as rank FROM uw_pkout p left join uw_user u on p.userId = u.id where u.robotId =0 and killValue > ?  order by p.killValue desc ";

        //var strSql = "SELECT count(id) as rank FROM uw_pkout  where killValue > ?";
        client.query(strSql, [killValue], function(err,data){
            if(err) return cb(err);
            cb(null, data[0].rank +1);
        });
    };

    //备份数据
    this.bakData = function (client, cb) {
        client.query("TRUNCATE TABLE uw_pkout_bak", function(err) {
            if (err) return cb(err);
            var strSql = "insert into uw_pkout_bak select * from uw_pkout";
            client.query(strSql, [], cb);
        } );
    };

    //
    this.getBakRankList = function (client, cb) {
        var strSql = "SELECT p.userId FROM uw_pkout_bak p left join uw_user u on p.userId = u.id where u.robotId =0  order by p.killValue desc";
        client.query(strSql, [], cb);
    };

    //获取上一天杀戮的最高名
    this.getBakPkOutRank1 = function(client,ignoreIds,cb){
        var strSql = "SELECT userId FROM uw_pkout_bak where userId not in (?) and killValue>0 order by killValue desc limit 1";
        client.query(strSql,[[0].concat(ignoreIds)], function(err,data){
            if(err) return cb(err);
            if(data.length<=0) return cb(null,0);
            cb(null,data[0].userId);
        });
    };
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();