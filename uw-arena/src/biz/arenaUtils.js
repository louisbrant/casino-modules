
var logger = require('uw-log').getLogger("uw-logger", __filename);
var arenaDao = require("./../dao/arenaDao");
var arenaBiz = require("./arenaBiz");

var c_lvl = require("uw-data").c_lvl;
var commonUtils = require("uw-utils").commonUtils;
var ArenaEntity = require('uw-entity').ArenaEntity;
var exports = module.exports;
var async = require("async");
var userDao = null;
var checkRequire = function(){
    userDao = require("uw-user").userDao;
};

exports.initRobot = function(uwClient,cb){
    checkRequire();
    arenaDao.select(uwClient," 1=1 ",[],function(err,data){
        if(err) return cb(err);
        if(data) {
            logger.error("已经存在竞技场机器人，跳过初始化机器人!");
            return cb(null);
        }

        userDao.listCols(uwClient,"id"," accountId = 0 order by robotId desc ",[],function(err,userList){
            if(err) return cb(err);
            for(var i = 0;i<300;i++){
                var locLvlData = c_lvl[i];
                var locLvlData1 = c_lvl[i+1];
                if(!locLvlData||!locLvlData1) break;
                var locRobotRange  =  locLvlData.robotRange;
                var locRobotRange1  =  locLvlData1.robotRange;
                if(!locRobotRange||!locRobotRange1) break;
                _randomArr(userList,locRobotRange,locRobotRange1-1);
            }
            var taskArr = [];
            console.log("userList.length:",userList.length);
            for(var i = 0;i<userList.length;i++){
                var locUser = userList[i];
                var locId = locUser.id;
                var locRank = i+1;
                taskArr.push(function(cb1){
                    _createArena(uwClient,this[0],this[1],cb1);
                }.bind([locId,locRank]));
            }

            async.series(taskArr, function (err, data) {
                if (err) return cb(err);
                logger.debug("竞技场机器人初始化完成!");
                return cb(null);
            });
        });
    });
};

var _createArena = function(client,userId,rank,cb){
    var arenaEntity = new ArenaEntity();
    arenaEntity.userId = userId;
    arenaEntity.rank = rank;
    arenaEntity.highRank = rank;
    var fightRanks = arenaBiz.calRankRange(arenaEntity.rank);
    arenaEntity.fightRanks = fightRanks;
    arenaEntity.reNumData = [];
    arenaDao.insert(client, arenaEntity, function (err, data) {
        if (err) return cb(err);
        arenaEntity.id = data.insertId;
        cb(null, arenaEntity);
    });
};

var _randomArr = function(list,start,end){
    var tempList = [];
    for(var i = start;i<=end;i++){
        tempList.push(i);
    }
    var newList =commonUtils.getRandomArray(tempList,tempList.length);

    var copyList = list.concat([]);
    for(var i = 0;i<tempList.length;i++){
        var locNum = tempList[i];
        var locNum1 = newList[i];
        if(list[locNum]&&copyList[locNum1]){
            list[locNum] = copyList[locNum1];
        }
    }
};
