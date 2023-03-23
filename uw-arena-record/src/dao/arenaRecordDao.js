
var util = require("util");
var BaseDao = require("uw-db").BaseDao;
function Dao(){
    BaseDao.call(this);
    this.Entity = require('uw-entity').ArenaRecordEntity;
    this.castCols = {
        fightData:BaseDao.CAST_OBJECT
    }
    //++++++++++自定义方法+++++++++++++++++++++
    //获取今天掠夺的次数
    this.getTodayWinCount = function(client,userId,cb){
        var strSql = "SELECT count(id) tCount FROM uw_arena_record WHERE userId = ? and isWin =1 and fightTime>? and fightTime<?";
        var sTime = (new Date()).clearTime();
        var eTime = (new Date()).clearTime().addHours(24);
        client.query(strSql,[userId,sTime,eTime],function(err,data){
            if(err) return cb(err);
            var sum = data[0].tCount||0;
            cb(err,sum) ;
        });
    };
    //获取今天被掠夺的次数
    this.getTodayBeWinCount = function(client,userId,cb){
        var strSql = "SELECT count(id) tCount FROM uw_arena_record WHERE enemyId = ? and isWin =1 and fightTime>? and fightTime<?";
        var sTime = (new Date()).clearTime();
        var eTime = (new Date()).clearTime().addHours(24);
        client.query(strSql,[userId,sTime,eTime],function(err,data){
            if(err) return cb(err);
            var sum = data[0].tCount||0;
            cb(err,sum) ;
        });
    };
    //获取仇人表
    this.getEnemyList = function (client, userIds, cb) {
        var strSql = "SELECT * FROM uw_arena_record where enemyId = ? fightType = 1 GROUP BY userId";
        client.query(strSql, [userIds], cb);
    };
}
util.inherits(Dao,BaseDao);
module.exports = new Dao();