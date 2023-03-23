/**
 * Created by Administrator on 2015/6/29.
 * 充值竞技场某些数据
 */
require("date-utils")
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;

var userDao = require("../../src/dao/userDao");
var async = require("async");


var checkExData = function(){
    userDao.list(uwClient,{},function(err,dataList) {
        if(err) return console.error("出错啦",err);
        async.map(dataList,function(locData,cb1){
            var exData = locData.exData;
            if(exData instanceof Array){
                locData.exData = {};
                for(var i = 1;i < exData.length;i++){
                    locData.exData[i] = exData[i];
                }
            }
            userDao.update(uwClient,{exData:locData.exData},{id:locData.id},cb1);
        },function(err,data){
            if(err) return console.error("出错啦",err);
            console.log("check finish!");
        });
    })
}
checkExData();




