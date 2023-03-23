var Msger = require("uw-data").Msger;
var logger = require('uw-log').getLogger("uw-logger", __filename);
var msgFuncCache = {};

var utils = exports.utils = require("./src/utils");
exports.propUtils = require("./src/propUtils");
exports.commonUtils = require("./src/commonUtils");
exports.base64Utils = require("./src/base64Utils");
exports.md5Utils = require("./src/md5Utils");
exports.hashesUtils = require("./src/hashesUtils");
exports.appUtils = require("./src/appUtils");
exports.httpUtils = require("./src/httpUtils");
exports.serverUtils = require("./src/serverUtils");
exports.routeLimitUtils = require("./src/routeLimitUtils");
exports.dispatchUtils = require("./src/dispatchUtils");
exports.routeUtils = require("./src/routeUtils");
exports.robotUtils = require("./src/robotUtils");
exports.cryptUtils = require("./src/cryptUtils");
exports.fightUtils = require("./src/fightUtils");

function msgFunc(msgCode){
    var fn = this.fileName;
    if(msgCode instanceof Msger && msgCode.track.indexOf(fn) < 0){
        msgCode.track.push(fn);
        return msgCode;
    }else{
        var args = arguments.length > 1 ? Array.prototype.slice.call(arguments, 1) : null;
        var msger = new Msger(msgCode, args);
        msger.track.push(fn);
        return msger;
    }
};
exports.msgFunc = function(fileName){
    var func = msgFuncCache[fileName];
    if(func) return func;
    func = msgFuncCache[fileName] = msgFunc.bind({fileName : fileName});
    return func;
};

function wrapResult(msger, value, dsName, isChangeValue){
    //value = value || null;
    if(value && dsName) value = utils.transDs(value, dsName, isChangeValue);
    if(!msger) return {v : value};

    if(!(msger instanceof Msger)){
        msger = new Msger(msger);
    }
    var msg = msger.msg, msgArgs = msger.args;
    var track = msger.track;
    track.push(this.fileName);

    //id=24 是重启服务器时会非常多log
    if(msg.id!=24){
        logger.error("msg:     ", JSON.stringify(msg));
        logger.error("msgArgs: ", JSON.stringify(msgArgs));
        for (var i = 0, li = track.length; i < li; i++) {
            var t = track[i];
            var index = t.indexOf("game-server");
            logger.error("        " + t.substring(index + 12));
        }
    }

    msg = typeof msg == "string" || typeof msg == "number" ? msg : (msg.id || "系统异常");//TODO
    return {
        m : msg,
        a : msgArgs,
        v : value
    };
}
var wrapMsgFuncCache = {};
exports.wrapResultFunc = function(fileName){
    var func = msgFuncCache[fileName];
    if(func) return func;
    func = wrapMsgFuncCache[fileName] = wrapResult.bind({fileName : fileName});
    return func;
};