/**
 * Created by Administrator on 2015/5/3.
 */
var createDirUtils = module.exports;

var moUtils = require("mo-utils");
/**
 * 创建log日志目录
 */
createDirUtils.createLogDir = function(appendersArr){
    for(var i = 0;i<appendersArr.length;i++){
        var locAppenders = appendersArr[i];
        for(var key in locAppenders){
            var locObj = locAppenders[key];
            if(locObj.type == "dateFile"){
                var locIndex = locObj.filename.lastIndexOf("/");
                var locDir = locObj.filename.substr(0,locIndex+1);
                moUtils.mkdirSync(locDir);
            }
        }
    }
    /*for(var key in log4jsCfg.appenders){
        var locObj = log4jsCfg.appenders[key];
        if(locObj.type == "dateFile"){
            var locIndex = locObj.filename.lastIndexOf("/");
            var locDir = locObj.filename.substr(0,locIndex+1);
            moUtils.mkdirSync(locDir);
        }
    }
    for(var key in log4js_serverCfg.appenders){
        var locObj = log4js_serverCfg.appenders[key];
        if(locObj.type == "dateFile"){
            var locIndex = locObj.filename.lastIndexOf("/");
            var locDir = locObj.filename.substr(0,locIndex+1);
            moUtils.mkdirSync(locDir);
        }
    }*/
};

