/**
 * Created by Administrator on 2014/6/7.
 */
var exports = module.exports;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var pkOutDao = require("uw-pkOut").pkOutDao;
exports.run = function(cfg){
    pkOutDao.bakData(uwClient, function(err){
        if(err) return console.log(err);
        logger.debug("备份野外pk数据成功!");
        //先备份完数据才清零
        pkOutDao.update(uwClient,{killValue:0},function(err,data){});

        setTimeout(function(){
            pkOutDao.update(uwClient," killValue = 0 ", " killValue > ?",[200],function(err,data){});
        },_getRandomNumber(2,3)*60*1000);

        setTimeout(function(){
            pkOutDao.update(uwClient," killValue = 0 ", " killValue > ?",[400],function(err,data){});
        },_getRandomNumber(4,7)*60*1000);
    })
};
//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};
exports.runOnce = function(){

};