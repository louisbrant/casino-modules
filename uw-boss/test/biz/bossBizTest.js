/**
 * Created by Administrator on 2015/7/20.
 */

var bossBiz = require("../../src/biz/bossBiz");
var uwClient = require("uw-db").uwClient;
var getInfo = function(){
    bossBiz.getInfo(uwClient,1,function(err,data){
        console.log(err,data);
    });
};
