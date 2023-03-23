/**
 * Created by Administrator on 2015/4/16.
 */

var loggerRequest = require('uw-log').getLogger("uw-monitor-request", __filename);
var loggerSend = require('uw-log').getLogger("uw-monitor-send", __filename);

exports.config ={
    method:"all"
};
exports.handler = function(req, res,next){
    var request = req.query.request;
    if(request) loggerRequest.info(request);
    var send = req.query.send;
    if(send) loggerSend.info(send);
    res.render("receive",{});
};
