/**
 * Created by Administrator on 2014/5/16.
 */
var httpUtils = require("uw-utils").httpUtils;
var project = require("uw-config").project;

exports.sendRequest = function(content){
   if(!project.monitorHttpHost||!project.monitorHttpPort){
       return;
   }
    if(typeof content == "object"){
        content = JSON.stringify(content);
    }
    var options = {
        host: project.monitorHttpHost,
        port: project.monitorHttpPort,
        path: "/monitor/receive.html?request="+content,
        method: 'POST'
    };
    try{
        httpUtils.requestHttp(options," ",function(err,data){

        });
    }catch(e) {
        console.error(e);
    }

};

exports.sendSend = function(content){
    if(!project.monitorHttpHost||!project.monitorHttpPort){
        return;
    }
    if(typeof content == "object"){
        content = JSON.stringify(content);
    }
    var options = {
        host: project.monitorHttpHost,
        port: project.monitorHttpPort,
        path: "/monitor/receive.html?send="+content,
        method: 'POST'
    };
    try{
        httpUtils.requestHttp(options," ",function(err,data){

        });
    }catch(e) {
        console.error(e);
    }
};

/**
 * 获取数据
 * @param client
 * @param userId
 * @param cb
 */
exports.getInfo = function (client, userId, cb) {

};
