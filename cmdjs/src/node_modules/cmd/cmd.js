/**
 * Created by SmallAiTT on 2015/4/27.
 */
var path = require("path2");
var exec = require("child_process").exec;
var logger = require("logger").initLogger("cmd", 1);

/**
 * 执行cmd命令的封装。
 * @param commond
 * @param options
 * @param cb
 */
exports.run = function(commond, options, cb){
    var args = Array.apply(null, arguments);
    args.splice(0, 1);
    var cbFunc = args[args.length - 1];
    if(typeof cbFunc == "function"){
        args.pop();
    }else{
        cbFunc = function(err){
            if(err){
                console.error(err);
            }
        }
    }
    function getOptStr(opt){
        var str = " ";
        if(opt instanceof Array){
            for(var i = 0, li = opt.length; i < li; i++){
                str += getOptStr(opt[i]);
            }
        }else if(typeof opt == "object"){
            for (var key in opt) {
                var value = opt[key];
                str += '"' + key + '" '
                if(value instanceof Array){
                    for(var i = 0, li = value.length; i < li; i++){
                        var itemi = value[i];
                        if(typeof itemi == "number"){
                            str += itemi + " ";
                        }else{
                            str += '"' + itemi + '" ';
                        }
                    }
                }else if(typeof value == "number"){
                    str += value + ' ';
                }else{
                    str += '"' + value + '" ';
                }
            }
        }else if(typeof opt == "number"){
            str += opt + ' ';
        }else{
            str += '"' + opt + '" ';
        }
        return str;
    }
    var cmdStr = commond + getOptStr(args);
    logger.debug("executing cmd:")
    logger.debug(cmdStr);
    exec(cmdStr, cbFunc);
};
/**
 * 调用py脚本
 * @param py
 * @param options
 * @param cb
 * @returns {*}
 */
exports.py = function(py, options, cb){
    var args = Array.prototype.slice.call(arguments);
    var extname = path.extname(py);
    if(!extname) args[0] = py + ".py";
    args.splice(0, 0, "python");
    return exports.run.apply(exports, args);
};