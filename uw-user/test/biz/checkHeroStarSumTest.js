/**
 * Created by Administrator on 2015/6/29.
 * 修正新加用户heroSum和heroStarSum数据
 */
require("date-utils")
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;

var userDao = require("../../src/dao/userDao");
var async = require("async");


var checkHeroStarSum = function(){
    userDao.list(uwClient,{},function(err,dataList) {
        if(err) return console.error("出错啦",err);
        async.map(dataList,function(locData,cb1){
            var heroData = locData.heroData;
            var heroSum = 0;
            var heroStarSum = 0;
            for(var key in heroData){
                heroData[key][2] = 0;
                heroSum += heroData[key][1];
                if(!heroData[key][3]) heroData[key][3] = 1;
                if(!heroData[key][4]){
                    heroData[key][4] = 1;
                    heroStarSum += 1;
                }else{
                    heroStarSum += heroData[key][4];
                }
            }
            locData.heroData = heroData;
            locData.heroSum = heroSum;
            locData.heroStarSum = heroStarSum;
            userDao.update(uwClient,{heroData:locData.heroData,heroSum:locData.heroSum,heroStarSum:locData.heroStarSum},{id:locData.id},cb1);
        },function(err,data){
            if(err) return console.error("出错啦",err);
            console.log("check finish!");
        });
    })
}
checkHeroStarSum();