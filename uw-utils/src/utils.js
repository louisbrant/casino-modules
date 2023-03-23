var utils = module.exports;
var Msger = require("uw-data").Msger;
var dsConsts = require("uw-data").dsConsts;
var dsRule = require("uw-ds").dsRule;

/**
 * Check and invoke callback function
 */
utils.invokeCallback = function(cb) {
    if(!!cb && typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};
/**
 * Desc: 转换服务端数据给全台
 * @param obj
 * @param dsName
 * @returns {*}
 */
utils.transDs = function(obj, dsName, isChangeValue){
    //!rule 时视为不转换
    if(!obj || !dsName) return obj;
    if(obj instanceof Array){//如果是数组，那么就对数组中的元素进行转换
        if(obj.length == 0) return obj;
        var arr = [];
        for (var i = 0, li = obj.length; i < li; i++) {
            arr.push(utils.transDs(obj[i], dsName, isChangeValue));
        }
        return arr;
    }else if(typeof obj == "object"){//如果是普通对象，直接进行转换
        var map = dsConsts[dsName];
        if(!map) throw "target[" + dsName + "] is not in dsConsts!";//判断键值常量是否存在
        var tempRule = dsRule[dsName];//规则模板
        var flag = tempRule ? 1 : 0;//1说明有转换规则
        var temp = {};
        for (var key in obj) {
            if(isChangeValue){
                temp[key] = utils.transDs(obj[key], dsName);
                continue;
            }
            var tempKey = map[key];
            if(tempKey == null){
                //console.warn(obj)
                if (key != "parse" && key != "_typeCast")
                    console.warn("key[" + key + "] is not in dsConsts!");
                continue;
            }
            switch(flag){
                case 0://无转换模板
                    if(obj[key] != null)
                        temp[tempKey] = obj[key];
                    break;
                case 1://有转换模板
                    var valueResult;
                    if(tempRule.__valueChangeMap && tempRule.__valueChangeMap[key]){//如果是key值不变，而是要转换value值的话
                        valueResult = handleForChgVal(obj[key], tempRule[key]);
                    }else{
                        valueResult = utils.transDs(obj[key], tempRule[key]);
                    }
                    if(valueResult != null) temp[tempKey] = valueResult;
                    break;
            }
        }
        return temp;
    }else{
        return obj;
    }
};

function handleForChgVal(obj, ruleName){
    if(!obj) return null;
    if(obj instanceof Array){
        var temp = [];
        for (var i = 0, li = obj.length; i < li; i++) {
            var value = obj[i];
            temp.push(handleForChgVal(value, ruleName));
        }
        return temp;
    }else{
        var temp = {};
        for (var key in obj) {
            var value = obj[key];
            value = utils.transDs(value, ruleName);
            if(value != null) temp[key] = value;
        }
        return temp;
    }
}