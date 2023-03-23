/**
 * Created by SmallAiTT on 2015/4/27.
 */
var path = require("path");

/**
 * 获得直接跟踪指定命令后面成参数。
 * 例如：yourCmd create a b c -out ./
 * 则获取的结果为 ["a", "b", "c"]。
 * @param arr
 * @returns {Array}
 */
exports.getValueArr = function(arr){
    var valueArr = [];
    for(var i = 0; i < arr.length; ){
        if(arr[i].indexOf("--") == 0){
            break;
        }else if(arr[i].indexOf("-") == 0){
            break;
        }else{
            var str = arr.shift();
            valueArr.push(str);
        }
    }
    return valueArr;
};

/**
 * 获得命令参数。
 * 例如：-out ./
 * 那么获得的结果为 "./"。
 * @param optionStrArr
 * @param option
 * @returns {*}
 */
exports.getOption = function(optionStrArr, option, cmd, pluginName){
    option = option || {};
    if(optionStrArr.length == 0) return option;
    var pc = cmd.config.plugin[pluginName];
    var oc = pc.option;
    var optionName = optionStrArr.shift();
    optionName = optionName.toLowerCase();
    if(optionName.indexOf("--") == 0){
        optionName = optionName.substring(2);
        if(!oc[optionName]) throw cmd.getMsg("err.optionNotFound", pluginName, "--" + optionName);
    }else{
        optionName = optionName.substring(1);
        var flag = false;
        for (var key in oc) {
            var cfg = oc[key];
            if(cfg.short && cfg.short.toLowerCase() == optionName){
                flag = true;
                optionName = key;
                break;
            }
        }
        if(!flag) throw cmd.getMsg("err.optionNotFound", pluginName, "-" + optionName);
    }
    option[optionName] = exports.getValueArr(optionStrArr);
    return exports.getOption(optionStrArr, option, cmd, pluginName);
};