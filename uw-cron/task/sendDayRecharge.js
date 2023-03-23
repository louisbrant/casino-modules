/**
 * Created by John on 2016/4/19.
 */
var exports = module.exports;
var uwClient = require("uw-db").uwClient;
var logger = require("uw-log").getLogger("uw-logger",__filename);

var activityBiz = require("uw-activity").activityBiz;
exports.run = function(cfg){
    activityBiz.dayRecharge(uwClient, function(err){
        if(err) return console.log(err);
        console.log("over");
        }
    );
};

exports.runOnce = function(){

};

if(require.main == module){
    exports.run();
}