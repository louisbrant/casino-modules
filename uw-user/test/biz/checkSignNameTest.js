/**
 * Created by Administrator on 2015/6/29.
 * 充值竞技场某些数据
 */
require("date-utils")
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;

var userDao = require("../../src/dao/userDao");
var async = require("async");

var  checkSignName = function(){
    userDao.list(uwClient,{},function(err,dataList){
        if(err) return console.error("出错啦",err);
        async.map(dataList,function(locData,cb1){
            var signName = locData.exData[c_prop.userExDataKey.sign];
            locData.signName = signName;
            userDao.update(uwClient,{signName:locData.signName},{id:locData.id},cb1);
        },function(err,data){
            if(err) return console.error("出错啦",err);
            console.log("check finish!");
        });
    })
};


/*************************************************************/
checkSignName();




