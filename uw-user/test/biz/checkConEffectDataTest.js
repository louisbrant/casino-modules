/**
 * Created by Administrator on 2015/6/29.
 * 充值竞技场某些数据
 */
require("date-utils")
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;

var userDao = require("../../src/dao/userDao");
var async = require("async");


var checkConEffectData = function(){
    userDao.list(uwClient,{},function(err,dataList) {
        if(err) return console.error("出错啦",err);
        async.map(dataList,function(locData,cb1) {
            var conEffectData = locData.conEffectData;
            if(!conEffectData[0] || conEffectData == {}){
                locData.conEffectData = [];
                for(var key in conEffectData){
                    var arr = [key,conEffectData[key][0],conEffectData[key][1],conEffectData[key][2]]
                    locData.conEffectData.push(arr);
                }
            }
            userDao.update(uwClient,{conEffectData:locData.conEffectData},{id:locData.id},cb1);
        },function(err,data){
            if(err) return console.error("出错啦",err);
            console.log("check finish!");
        });
    })
}

/*************************************************************/

checkConEffectData();



