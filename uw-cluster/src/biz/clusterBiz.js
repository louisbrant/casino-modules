/**
 * Created by Administrator on 2014/5/16.
 */

var cluster = require('cluster');
var consts = require('uw-data').consts;
var logger = require('uw-log').getLogger("uw-logger", __filename);
var requestWorkers = require('uw-route').requestWorkers;
var exports = module.exports;


/**
 * 获取workid
 */
exports.getWorkerId = function () {
    var workerId = 0;
    if(cluster.worker){
        workerId = cluster.worker.id;
    }
    return workerId;
};

/**
 * 发送消息给子进程
 * @param route
 * @param data
 * @returns {number}
 */
exports.setMsgToWorks = function (route,data) {
    if (!cluster.isMaster) {
        logger.error("process is not master");
        return ;
    }
    var workerId = 0;
    var workers = requestWorkers.getAllWorkers();
    for(var key in workers){
        var locWorker = workers[key];
        var msg = {
            msgType:consts.workerMsgType.remote,
            route:route,
            data:data
        };
        locWorker.send(msg);
    }
    return workerId;
};
