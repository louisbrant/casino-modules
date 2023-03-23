/**
 * Created by Administrator on 2015/6/29.
 * 充值竞技场某些数据
 */
require("date-utils")
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;

var userDao = require("../../src/dao/userDao");
var async = require("async");

var  checkArenaData = function(){
    userDao.list(uwClient,{},function(err,dataList){
        if(err) return console.error("出错啦",err);
        async.map(dataList,function(locData,cb1){
            locData.arenaData[5] = (new Date()).addHours(-2);
            userDao.update(uwClient,{arenaData:locData.arenaData},{id:locData.id},cb1);
        },function(err,data){
            if(err) return console.error("出错啦",err);
            console.log("check finish!");
        });
    })
};

/*************************************************************/
checkArenaData();
