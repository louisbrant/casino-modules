var util = require("util");
var BaseDao = require("uw-db").BaseDao;
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').GameRecordEntity;
    this.castCols = {
        rechargeRecord : BaseDao.CAST_OBJECT,
        shopRecord : BaseDao.CAST_OBJECT,
        costGoldRecord : BaseDao.CAST_OBJECT,
        costDiamondRecord : BaseDao.CAST_OBJECT,
        costDiamondRecord1 : BaseDao.CAST_OBJECT,
        costDiamondRecord2 : BaseDao.CAST_OBJECT,
        getDiamondRecord : BaseDao.CAST_OBJECT,
        getDiamondRecord1 : BaseDao.CAST_OBJECT,
        getDiamondRecord2 : BaseDao.CAST_OBJECT
    };
    //++++++++++++++++++begin++++++++++++++++++++++
    this.getTodayCost = function(client, userId, cb){
        var strSql = " userId = ? and recordTime>=? and recordTime<?";
        var sTime = (new Date()).clearTime();
        var eTime = (new Date()).clearTime().addHours(24);
        this.selectCols(client," costDiamondRecord ",strSql,[userId,sTime,eTime],function(err,data){
            if(err) return cb(err);
            if(!data) return cb(null,0);
            var count = 0;
            var costDiamondRecord = data.costDiamondRecord||{};
            for(var key in costDiamondRecord){
                var locNum = costDiamondRecord[key]||0;
                count+=locNum;
            }
            cb(null,count);
        });
    };

    this.getAllCost = function(client, userId, startTime, endTime,cb){
        if(!startTime||!endTime) return cb(null,0);
        var strSql = " userId = ? and recordTime>=? and recordTime<?";
        this.listCols(client," costDiamondRecord ", strSql,[userId,startTime, endTime],function(err,dataList){
            if(err) return cb(err);
            var count = 0;
            for(var i = 0;i<dataList.length;i++){
                var locData = dataList[i];
                var costDiamondRecord = locData.costDiamondRecord||{};
                for(var key in costDiamondRecord){
                    var locNum = costDiamondRecord[key]||0;
                    count+=locNum;
                }
            }
            cb(null,count);
        });
    };
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();