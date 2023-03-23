/**
 * Created by Sara on 2016/6/14.
 */
var exports = module.exports;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var bossDao = require("uw-boss").bossDao;
exports.run = function(cfg){
    bossDao.bakData(uwClient, function(err){
        if(err) return console.log(err);
        logger.debug("备份boss数据成功!");
    })
};

exports.runOnce = function(){

};