/**
 * Created by Administrator on 2015/3/10.
 */
var coffersBiz = require("uw-coffers").coffersBiz;
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);
var userDao = require("uw-user").userDao;
var exports = module.exports;

exports.run = function(cfg){
    coffersBiz.reset(uwClient, function(err){
        if(err) return logger.error(err);
        userDao.update(uwClient,{todayCoffersPoints:0},function(err){
            if(err) return logger.error(err);
            console.log("重置成功！");
        })
    });
};

exports.runOnce = function(){

};
