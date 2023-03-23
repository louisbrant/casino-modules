/**
 * Created by Administrator on 2015/7/20.
 */

var pkOutBiz = require("../../src/biz/pkOutBiz.js");
var uwClient = require("uw-db").uwClient;
var end = function(){

    pkOutBiz.end(uwClient,5,2,{"0":1,"1":50,"2":100},function(err,data){
        console.log(err,data);

    });
};

var getEnemyList = function(){
    pkOutBiz.getEnemyList(uwClient,53,function(err,data){
        console.log(err,data);
    });
};

/********************************************/
//end();
getEnemyList();