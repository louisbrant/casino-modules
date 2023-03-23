/**
 * Created by Administrator on 2014/5/6.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').ArenaEntity;
    this.castCols = {
        fightRanks:BaseDao.CAST_ARRAY,
        reNumData:BaseDao.CAST_ARRAY,
        awardData:BaseDao.CAST_ARRAY
    };
    //++++++++++++++++++begin++++++++++++++++++++++

    this.getRankList = function (client, count, cb) {
        var strSql = "SELECT a.rank, u.nickName, u.combat,u.iconId,u.lvl,u.vip FROM uw_arena a left join uw_user u on a.userId = u.id  order by a.rank asc limit 0,?";
        client.query(strSql, [count], cb);
    };

    this.queryArenaUserByRanks = function(client,ranks, cb){
        var strSql = "SELECT a.id, a.rank, a.userId,u.nickName,u.lvl,u.combat,u.iconId,u.vip FROM uw_arena a JOIN uw_user u ON a.userId = u.id WHERE  a.rank IN (?) ORDER BY a.rank asc";
        this.query(client,strSql,[ranks],function(err,dataArr){
            if(err) return cb(err);
            for(var i = 0;i<dataArr.length;i++){
                var locData = dataArr[i];
                if(locData.secret){
                    locData.secret = JSON.parse(locData.secret);
                }else{
                    locData.secret = {};
                }
            }
            cb(null,dataArr)
        });
    };

    /**
     * 获取竞技场用户信息
     * @param client
     * @param rank
     * @param cb
     */
    this.queryArenaUserByRank = function(client,rank, cb){
        var strSql = "SELECT a.id, a.rank, a.userId,u.name,u.lvl,u.secret,u.iconId FROM uw_arena a JOIN uw_user u ON a.userId = u.id WHERE  a.rank = ? ORDER BY a.rank asc limit 0,1";
        this.query(client,strSql,[rank],function(err,dataArr){
            if(err) return cb(err);
            var locData = dataArr[0];
            if(!locData) return cb(null);
            if(locData.secret){
                locData.secret = JSON.parse(locData.secret);
            }else{
                locData.secret = {};
            }
            cb(null,locData);
        });
    }

    /**
     * 备份竞技场数据
     * @param client
     * @param cb
     */
    //this.bakData = function(client, cb){
    //    var strSql = "INSERT INTO uw_arena_bak (rank,userId,ADDTIME)  SELECT rank,userId,NOW() FROM uw_arena ORDER BY rank ASC";
    //    this.query(client,strSql,[],cb);
    //}

    //获取竞技场表备份数据
    this.getRankBakList = function(client,cb){
        var strSql = "SELECT rank,userId FROM uw_arena_bak ";
        client.query(strSql, [], cb);
    };

    //复制竞技场表数据
    this.sqlArenaBak = function(client,cb){
        client.query("TRUNCATE TABLE uw_arena_bak", function(err){
            if(err) return cb(err);
            client.query("INSERT INTO uw_arena_bak SELECT * FROM uw_arena", cb);
        });
    };

    //获取上一天竞技场的最高名
    this.getBakArenaRank1 = function(client,ignoreIds,cb){
        var strSql = "SELECT userId FROM uw_arena_bak where userId not in (?) order by rank asc limit 1";
        client.query(strSql,[[0].concat(ignoreIds)], function(err,data){
            if(err) return cb(err);
            if(data.length<=0) return cb(null,0);
            cb(null,data[0].userId);
        });
    };
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();