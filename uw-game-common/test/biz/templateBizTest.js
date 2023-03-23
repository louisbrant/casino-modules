/**
 * Created by Administrator on 2015/7/20.
 */

var templateBiz = require("../../src/biz/templateBiz.js");
var uwClient = require("uw-db").uwClient;
var getInfo = function(){
    templateBiz.getInfo(uwClient,1,function(err,data){
        console.log(err,data);
    });
};
