/**
 * Created by SmallAiTT on 2015/4/29.
 */

var path = exports.path2 = require("./src/node_modules/path2");
var fs = exports.fs2 = require("./src/node_modules/fs2");
exports.clazz = require("./src/node_modules/clazz");
exports.logger = require("./src/node_modules/logger");
var strUtils = exports.strUtils = require("./src/node_modules/str-utils");

var argvParser = exports.argvParser = require("./src/core/argvParser");
exports.CmdPlugin = require("./src/core/CmdPlugin");
var Cmd = exports.Cmd = require("./src/core/Cmd");



process.on('uncaughtException', function(err){
    console.log("异常：");
    console.error(err);
});


/**
 * 执行cmd。
 */
exports.bin = function(cmdConfig){
    cmdConfig = cmdConfig || {};
    //加载用户自定义配置
    var arr = process.argv.slice(1);
    var cmdName = arr.shift();//命令的名称
    var cmd = new Cmd();
    cmd.name = cmdName;
    cmd.getGlobalConfig(path.join(process.cwd(), "." + cmdName), true);
    cmd.setConfigDir(cmdConfig.configDir);
    cmd.setPluginDir(cmdConfig.pluginDir);
    var pluginName = arr.shift();//插件的名称
    var valueArr = [];
    var option = {};
    if(!pluginName){
        pluginName = "help";
    }else{
        try{
            pluginName = cmd.getPluginName(pluginName);
            valueArr = argvParser.getValueArr(arr);
            option = argvParser.getOption(arr, null, cmd, pluginName);
        }catch(e){
            return console.log(e);
        }
    }
    pluginName = pluginName.toLowerCase();
    cmd.execPlugin(cmdName, pluginName, valueArr, option, function(err){
        if(err) {
            console.log(err);
        }
        else if(pluginName != "help") {
            console.log(cmd.getMsg("info.cmdSuccessfully", pluginName));
        }
    });
};
/**
 * 为help提供日志输出。
 * @param pluginName
 * @param optionName
 * @param desc
 */
exports.log4Helper = function(pluginName, optionName, desc){
    var result = "";
    optionName = optionName || "";
    var arr = desc.split("\n");
    for (var i = 0, l_i = arr.length; i < l_i; i++) {
        result += strUtils.format("\033[1;36;1m%s", strUtils.joinBlank(pluginName, 16));
        pluginName = "";
        result += strUtils.format("\033[1;32;1m%s", strUtils.joinBlank(optionName, 24));
        optionName = "";
        result += strUtils.format("\033[0m%s", arr[i]);
        if(i < l_i - 1) result += "\n";
    }
    result = result.replace(/\\033/g, "\033");
    console.log(result);
};

var child_process = require('child_process');
/**
 * 执行命令行命令，例如 cmdJs.runCmd(TexturePacker, 'xxx', {'--scale':1}, cb)
 * @param cmdName   命令行命令名称
 */
exports.runCmd = function(cmdName){
    var arr = Array.prototype.slice.call(arguments, 1);
    var cb = arr[arr.length - 1];
    if(typeof cb == 'function'){
        arr.pop();
    }else{
        cb = null;
    }

    var cmdStr = '';
    cmdStr += cmdName + ' ';
    for (var i = 0, l_i = arr.length; i < l_i; i++) {
        var subParam = arr[i];
        var type = typeof subParam;
        if(type == 'string' || type == 'number' || type == 'boolean'){
            cmdStr += ' ' + subParam;
        }else if(type == 'object'){
            for (var key in subParam) {
                cmdStr += ' ' + key + ' ' + subParam[key];
            }
        }
    }
    child_process.exec(cmdStr, function(error, stdout, stderr){
        if(cb) cb(error, stdout, stderr);
    });
};