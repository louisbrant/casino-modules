/**
 * Created by John on 2016/5/31.
 */
var uwClient = require("uw-db").uwClient;
var sysRedEnvelopBiz = null;

var exports = module.exports;
var checkRequire = function() {
    sysRedEnvelopBiz = sysRedEnvelopBiz || require("uw-red-envelope").sysRedEnvelopeBiz;
}
exports.run = function(cfg){
    checkRequire();
    sysRedEnvelopBiz.updateSysRedEnvelope(uwClient, function(err, data){
        if(err) return console.log(err);
        console.log("finish");
    })
};

exports.runOnce = function(){

};