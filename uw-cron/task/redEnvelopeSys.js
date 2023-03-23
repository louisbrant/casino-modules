/**
 * Created by Sara on 2016/1/6.
 */
var g_redEnvelope = require("uw-global").g_redEnvelope;
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;

var exports = module.exports;
exports.run = function(cfg){
    g_redEnvelope.redEnvelopeSys();
};

exports.runOnce = function(){

};