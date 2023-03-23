/**
 * Created by Administrator on 2014/4/24.
 */
var propUtils = module.exports;
var consts  = require("uw-data").consts;


/**
 * 累加属性值，value暂时不支持字符串
 * @param {Object} prop1
 * @param {Object} prop2
 */
propUtils.addProp = function (prop1, prop2) {
    for (var key in prop1) {
        var locValue1 = _checkNumber(prop1[key]);
        if (prop2[key]) {
            var locValue2 = _checkNumber(prop2[key]);
            prop1[key] = locValue1+locValue2;
        }
    }
    return prop1;
};

/**
 * 属性值相减，value暂时不支持字符串
 * @param {Object} prop1
 * @param {Object} prop2
 */
propUtils.lowProp = function (prop1, prop2) {
    for (var key in prop1) {
        var locValue1 = _checkNumber(prop1[key]);
        if (prop2[key]) {
            var locValue2 = _checkNumber(prop2[key]);
            prop1[key] = locValue1 - locValue2;
        }
    }
    return prop1;
};
/**
 * 乘以某个值
 * @param {Object} prop
 * @param {Number} value
 */
propUtils.multProp = function(prop,value){
    for (var key in prop) {
        if (prop[key]) {
            prop[key] *= value;
        }
    }
};
/**
 * 转为整数，去掉小数点
 * @param prop
 * @param value
 */
propUtils.parseInt = function(prop){
    for (var key in prop) {
        if (prop[key]) {
            prop[key] = Math.parseInt(prop[key]);
        }
    }
};

/**
 * 转为整数,四舍五入
 * @param prop
 * @param value
 */
propUtils.parseIntRound = function(prop){
    for (var key in prop) {
        if (prop[key]) {
            prop[key] = Math.round(prop[key]);
        }
    }
};

/**
 * 合并属性,value暂时不支持字符串
 * @param {Object} prop1
 * @param {Object} prop2,.....
 */
propUtils.mergerProp = function (prop1, prop2) {
    var newProp = {};
    var props = arguments;
    for(var i = 0;i<props.length;i++){
        var locProp = props[i];
        for (var locKey in locProp) {
            var locValue = _checkNumber(locProp[locKey]);
            if (newProp[locKey]) {
                var newPropValue = _checkNumber(newProp[locKey]);
                newProp[locKey] = newPropValue+locValue;
            } else {
                newProp[locKey] = locValue;
            }
        }
    }
    return newProp;
};

/**
 * 把值设反
 * @param {Object} prop
 */
propUtils.negativeProp = function(prop){
    for (var key in prop) {
        prop[key] = prop[key]*-1;
    }
    return prop;
};

/**
 * 删除属性
 * @param {Object|Array} prop
 * @param keys ["key1"....]
 */
propUtils.delProp = function(prop,keys){
    if(!prop) return null;
    var propArr;
    if(prop instanceof Array){
        propArr = prop;
    }else{
        propArr = [prop];
    }

    for(var i = 0;i<propArr.length; i++){
        var locProp = propArr[i];
        for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            delete locProp[key];
        }
    }
    return prop;
};

/**
 * 筛选某几个key值
 * @param prop
 * @param keys
 * @returns {{}}
 */
propUtils.selectProp = function(prop,keys){
    var ret ={};
    for(var key in prop){
        if(keys.indexOf(key)>-1){
            ret[key] = prop[key];
        }
    }
    return ret;
};

/**
 * 根据值获取key
 * @param {Object|Array} props
 * @param value
 */
propUtils.getPropKey = function(props,value){
    var propArr;
    if(props instanceof Array){
        propArr = props;
    }else{
        propArr = [props];
    }
    for(var i =0;i<propArr.length;i++){
        var locProp = propArr[i];
        for(var key in locProp){
            if(locProp[key] == value){
                return key;
            }
        }
    }
    return null;
};

/**
 * 获取新的对象
 * @param {Object} prop
 */
propUtils.getEmptyProp = function(prop){
    var ret = {};
    for (var key in prop) {
        ret[key] = 0;
    }
    return ret;
};

/**
 * 复制属性
 * @param {Object} prop
 * @examples
 * propUtils.copyProp(prop); //复制属性,返回新对象
 */
propUtils.copyProp = function(prop){
    var ret = {};
    for (var key in prop) {
        var locValue = prop[key];
        if(typeof locValue == "object"){
            ret[key] = JSON.parse(JSON.stringify(locValue));
        }else{
            ret[key] = locValue;
        }
    }
    return ret;
};

/**
 * 复制值
 * @param {Object} baseProp
 * @param {Object} valueProp
 * @examples
 */
propUtils.copyValue = function(baseProp,valueProp){
    for (var key in baseProp) {
        if(valueProp.hasOwnProperty(key)){
            var locValue = valueProp[key];
            if(locValue instanceof Date){
                baseProp[key] = new Date(locValue);
            }else if(typeof locValue == "object"){
                baseProp[key] = JSON.parse(JSON.stringify(locValue));
            }else{
                baseProp[key] = locValue;
            }
        }
    }
};

/**
 * 覆盖属性
 * @param baseProp
 * @param newProp
 */
propUtils.coverProp = function(baseProp,newProp){
    for(var key in newProp){
        baseProp[key] = newProp[key];
    }
    return baseProp;
};

/**
 * 获取key
 * @param baseProp
 * @param index
 */
propUtils.getKey = function(baseProp,index){
    var indexAdd = 0;
    for(var key in baseProp){
        if(indexAdd==index) return key;
    }
    return null;
};



var _checkNumber = function(value){
    value = value||0;
    if(typeof value =="string"){
        value = parseInt(value);
    }
    return value;
};
