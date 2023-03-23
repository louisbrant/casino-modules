var cluster = require('cluster');
var Session = require("./session/Session");
var logger = require('uw-log').getLogger("uw-worker", __filename);
var path = require('path');
// var isClusterMode = require('uw-config').project.clusterMode;
var isClusterMode = 1;
// var routesForWorker = require('uw-data').routesForWorker;
var routesForWorker = require("uw-data").ifaceWorker;
var consts = require("uw-data").consts;
var project = require("uw-config").project;
var DEBUG = 0;

var handlerMap = {};//路由处理
var workers = {};
var requestSeq = 0; //自增长字段，每个worker的请求分配唯一的一个序号

// 每个worker会绑定一个WorkerData对象，存储worker相关的应用层的关联信息
function WorkerData() {
    this.ongoingRequests = {};
}

WorkerData.prototype.checkRequestTimeout = function(now) {
    // 暂不实现
}

WorkerData.prototype.addRequestInfo = function(msg, cb) {
    this.ongoingRequests[msg.requestId] = {
        msg: msg,
        cb: cb
    };
}

WorkerData.prototype.getAndRemoveRequestInfo = function(requestId) {
    var requestInfo = this.ongoingRequests[requestId];
    if (requestInfo)
        delete this.ongoingRequests[requestId];
    return requestInfo;
}

exports.handlerRequest = function(route, args, session, cb) {
    if (cluster.isMaster && routesForWorker[route]) {
        if (sendMsgToWorker({requestId: ++requestSeq, route:route, args:args, session:session}, cb))
            return
    }
    if (DEBUG) {
        var info = cluster.isMaster ? 'handled by master' : 'handled by worker';
        cb('OK', {route: route, info: info});
        return;
    }

    getRouteFunc(route,function(err,func){
        if(err) return cb(err);
        func(args, session, cb);
    });
};

exports.getAllWorkers = function(){
    return workers;
};

var getRouteFunc = function(route,cb){
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
    cb(null,func);
};

var getRemoteFunc = function(route,cb){
    var arrRoute = route.split(".");
    var routeDir = arrRoute[0],routeFile =arrRoute[1],routeFunName = arrRoute[2];
    if (!handlerMap[route]) {
        var handlerPath = routeDir + "/remote/" + routeFile + ".js";
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
    cb(null,func);
};


exports.init = function() {
    if (cluster.isMaster) {
        var  cpuCount = project.cpuWorkers+1;
        for (var i = 1; i < cpuCount; i++) { // total: cpuCount - 1
            var worker = cluster.fork();
            workers[worker.id] = worker;
            worker.userData = new WorkerData();
            worker.on('message', handleMsgFromWorker);
        }
        cluster.on('disconnect', clearWorker);
        cluster.on('exit', clearWorker);
    } else {
        process.on('message', handleMsgFromMaster);
    }
}

function clearWorker(worker) {
    worker = workers[worker.id];
    if (worker) {
        delete worker[worker.id];
        var ongongRequests = worker.userData.ongoingRequests;
        for (var k in ongongRequests) {
            var requestInfo = ongongRequests[k];
            requestInfo.cb('worker已关闭');
        }
    }
}

// 实现worker的选择策略
function selectWorker(id) {
    if(id) return workers[id];
    var minOngoing;
    var selected;
    for (var k in workers) {
        var worker = workers[k];
        var userData = worker.userData;
        var len = Object.keys( userData.ongoingRequests).length;
        if (len <= 1)
            return worker;
        if (minOngoing === undefined || len < minOngoing) {
            minOngoing = len;
            selected = worker;
        }
    }
    return selected;
}

// master发送消息给worker处理
function sendMsgToWorker(msg, cb) {
    msg.msgType = consts.workerMsgType.request;
    //保证每个用户在同一个worker
    var workId = msg.session.get(consts.session.workerId);
    var worker = selectWorker(workId);
    if (worker && worker.process.connected) {
        msg.session.set(consts.session.workerId,worker.id);
        var userData = worker.userData;
        userData.addRequestInfo(msg, cb);
        worker.send(msg);
        return true;
    }
    return false;
}

// 处理从worker返回的结果，在master中运行, this为worker
function handleMsgFromWorker(msg) {
    var requestId = msg.requestId;
    var workerId = msg.workerId;
    var userData = this.userData;
    var requestInfo = userData.getAndRemoveRequestInfo(requestId);
    logger.debug("handleMsgFromWorker workerId:%s, requestId:%s,msg:%s",workerId,requestId,JSON.stringify(msg) );
    if (requestInfo) {
        var cb = requestInfo.cb;
        cb(msg.err, msg.data);
    }
}

// 处理从master发来的消息，在worker中运行, this为process
function handleMsgFromMaster(msg) {
    if(msg.msgType == consts.workerMsgType.request){
        var requestId = msg.requestId;
        msg.session = Session.copy(msg.session);
        var workerId = msg.session[consts.session.workerId];
        logger.debug("handleMsgFromMaster workerId:%s, requestId:%s,msg:%s",workerId,requestId,JSON.stringify(msg) );
        exports.handlerRequest(msg.route, msg.args, msg.session, function(err, data) {
            var sendMsg = {
                requestId:requestId,
                err: err,
                data: data,
                workerId:workerId,
            };
            process.send(sendMsg);
        });
    }else if(msg.msgType == consts.workerMsgType.remote){
        _handleRemote(msg,function(){});
    }
}

var _handleRemote = function(msg,cb){
    var route = msg.route;
    var data = msg.data;
    getRemoteFunc(route,function(err,func){
        if(err) return cb(err);
        func(data, cb);
    });
};

// test
if (require.main == module) {
    if (isClusterMode)
        exports.init();
    if (cluster.isMaster) {
        // a.ac.f定义上文件顶部routesForWorker中
        exports.handlerRequest('a.fi.a', '', '', function(err, data) {
            console.log(err, data);
        });
        exports.handlerRequest('a.fi.a', '', '', function(err, data) {
            console.log(err, data);
        });
        exports.handlerRequest('a.fi.a', '', '', function(err, data) {
            console.log(err, data);
        });
        exports.handlerRequest('a.fi.a', '', '', function(err, data) {
            console.log(err, data);
        });
        exports.handlerRequest('a.ac.f1', '', '', function(err, data) {
            console.log(err, data);
        });
    }
}

