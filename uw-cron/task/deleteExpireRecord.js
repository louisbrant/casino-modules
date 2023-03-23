/**
 * Created by Administrator on 2014/6/7.
 * 删除超过7天的竞技场记录
 */
var exports = module.exports;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var arenaRecordDao = require("uw-arena-record").arenaRecordDao;

exports.run = function(cfg){
    var expireTime = (new Date()).addDays(-7);
    arenaRecordDao.del(uwClient," fightTime < ?",[expireTime],function(err){
        if(err) return console.log(err);
    });
};

exports.runOnce = function(){

};
