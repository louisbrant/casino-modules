/**
 * Created by Administrator on 2016/1/16.
 */
var challengeCupBiz = require("uw-challenge-cup").challengeCupBiz;
var exports = module.exports;

exports.run = function(cfg){
    challengeCupBiz.trailer(function(err){
        if (err){
            console.log(err);
        }
    });
};

exports.runOnce = function(){

};