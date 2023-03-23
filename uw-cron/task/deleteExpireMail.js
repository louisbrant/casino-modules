/**
 * Created by Administrator on 2014/6/7.
 * 删除超过7天的竞技场记录
 */
var exports = module.exports;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var mailDao = require("uw-mail").mailDao;

exports.run = function(cfg){
    _del();
};

exports.runOnce = function(){
    _del();
};

var _del = function(){
    var expireTime = (new Date()).addDays(-3);
    mailDao.del(uwClient," addTime < ? and isDelete = 1",[expireTime],function(err){
        if(err) return console.log(err);
    });

    var expireTime2 = (new Date()).addDays(-1);
    mailDao.del(uwClient," expireTime < ? ",[expireTime2],function(err){
        if(err) return console.log(err);
    });
};
