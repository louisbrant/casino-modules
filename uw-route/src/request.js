/**
 * Created by Administrator on 2015/5/23.
 */
var url = require('url');
var path = require('path');
var wrapResult = require('uw-utils').wrapResultFunc(__filename);
var logger = require('uw-log').getLogger("uw-route", __filename);
var consts = require("uw-data").consts;
var project = require("uw-config").project;
var serialFilter = require('./filter/serialFilter');
var monitorBiz = require('uw-monitor').monitorBiz;
var requestWorkers = require('./requestWorkers.js');

var handlerMap = {};//路由处理

module.exports = function(option){
    return function(req, res, next){
        serialFilter.before(req, res,function(){
            monitorRequest(req);
            _handleRequest(req, res, function (err, data) {
            //handleRequest(req, res, function (err, data) {
                serialFilter.after(req, res, next);
                if(err) {
                    _sendData(req, res, wrapResult(err));
                    return;
                }
                var logger = require('uw-log').getLogger("uw-route", __filename);
                var reData = JSON.stringify(data);
                var handleTime = Date.now()-req.uwRoute.startTime;
                logger.debug("send requestId:%s, route:%s,time:%sms,data:%s",req.uwRoute.id,req.uwRoute.route,handleTime,reData);

                monitorSend(req,handleTime);
                _sendData(req, res, reData);
                //next(null);
            });
        });
    };
};

var _handleRequest = function(req, res,cb){
    if(project.cpuWorkers>0){
        requestWorkers.handlerRequest(req.uwRoute.route, req.uwRoute.args, req.uwRoute.session,cb);
    }else{
        handleRequest(req, res, cb);
    }
};

var monitorRequest = function(req){
    var uwRoute = req.uwRoute;
    var session = uwRoute.session;
    var accountId = null;
    if(session){
        accountId = uwRoute.session.get(consts.session.accountId);
    }
    var sendData = {
        id:uwRoute.id,
        route:uwRoute.route,
        args:uwRoute.args,
        accountId:accountId,
        startTime:uwRoute.startTime
    };
    monitorBiz.sendRequest(sendData);
};

var monitorSend = function(req,handleTime){
    var uwRoute = req.uwRoute;
    var session = uwRoute.session;
    var accountId = null;
    if(session){
        accountId = uwRoute.session.get(consts.session.accountId);
    }
    var sendData = {
        id:uwRoute.id,
        route:uwRoute.route,
        args:uwRoute.args,
        accountId:accountId,
        startTime:uwRoute.startTime,
        handleTime:handleTime
    };
    monitorBiz.sendSend(sendData);
};

var _sendData = function(req, res, data){
    if(req.isSocket){
        req.connection.send(data);
    }else{
        res.send(data);
    }
};

var handleRequest = function (req, res, cb) {
    var route = req.uwRoute.route;
    var args = req.uwRoute.args;
    //路由
    var arrRoute = route.split(".");
    var routeDir = arrRoute[0],routeFile =arrRoute[1],routeFunName = arrRoute[2];
    if (!handlerMap[route]) {
        var handlerPath = routeDir + "/handler/" + routeFile + ".js";
        var routePath = path.join(__dirname, "../../../route/" + handlerPath);
        try{
            handlerMap[route] = require(routePath);
        }catch (err){
            logger.error("routePath error:",routePath);
           return cb(err);
        }
    }
    if(!handlerMap[route]) return cb("路由格式不对，route:"+route);
    var func = handlerMap[route][routeFunName];
    if(!func) return cb("路由格式不对，route:"+route);
    func(args, req.uwRoute.session, cb);
};
