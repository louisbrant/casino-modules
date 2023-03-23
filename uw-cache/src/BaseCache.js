/**
 * 缓存基础类
 * Created by Administrator on 14-6-21.
 */

var BaseCache = function () {
    this.cacheDic = {};//缓存对象
    this.uniqueKey = "";//唯一key值
    this.keyValue = {};//键值对应，因为key太长占内存，key转换为数字
    this.valueKey = {};//键值对应，数字转换为key
    this.isCache = false;
    this.oldLvlMap = {};
    this.init = function (uniqueKey, isCache , valueKeyObj) {
        this.uniqueKey = uniqueKey;
        this.isCache = isCache;
        this._keyValue(valueKeyObj);
    };
    //初始化key值
    this._keyValue = function (valueKeyObj) {
        if (!valueKeyObj) return;
        var i = 0;
        for (var key in valueKeyObj) {
            i++;
            this.keyValue[key] = i;
            this.valueKey[i] = key;
        }
    };
    //压码
    this._encodeValue = function (obj) {
        if(!obj) return obj;
        if (typeof obj == "object") {
            var ret = {};
            for (var key in obj) {
                var locValue = obj[key];
                if (typeof locValue == "object"){
                    if(locValue instanceof Date)
                        locValue = new Date(locValue);
                    else
                        locValue = JSON.parse(JSON.stringify(locValue));
                }
                if (this.keyValue.hasOwnProperty(key)) {
                    ret[this.keyValue[key]] = locValue;
                } else {
                    ret[key] = locValue;
                }
            }
            return ret;
        } else {
            return obj;
        }
    };
    //解码
    this._decodeValue = function (obj) {
        if(!obj) return obj;
        if (typeof obj == "object") {
            var ret = {};
            for (var key in obj) {
                var locValue = obj[key];
                if (typeof locValue == "object"){
                    if(locValue instanceof Date)
                        locValue = new Date(locValue);
                    else
                        locValue = JSON.parse(JSON.stringify(locValue));
                }
                if (this.valueKey.hasOwnProperty(key)) {
                    ret[this.valueKey[key]] = locValue;
                } else {
                    ret[key] = locValue;
                }
            }
            return ret;
        } else {
            return obj;
        }
    };
    /**
     * 移除数据
     * @param key
     */
    this.remove = function (key) {
        var myKey = this.uniqueKey + key;
        if (this.cacheDic[myKey]) delete this.cacheDic[myKey];
    };

    /**
     * 清空数据
     */
    this.clear = function () {
        this.cacheDic = {};
    };

    /**
     * 获取缓存数据
     * @param key
     */
    this.get = function (key) {
        if(!this.isCache) return null;
        var myKey = this.uniqueKey + key;
        var cacheData = this.cacheDic[myKey];
        if(!cacheData) return cacheData;
        return this._decodeValue(cacheData);
    };
    /**
     * 更新缓存数据
     * @param key
     * @param data
     */
    this.set = function (key, data) {
        if(!this.isCache) return;
        var myKey = this.uniqueKey + key;
        var enData = this._encodeValue(data);
        var cacheData = this.cacheDic[myKey];
        //更新数据，假如是对象，可以只更新部分数据
        if(enData&&typeof enData =="object" && cacheData && typeof cacheData =="object"){
            if(cacheData.lvl){//如果有lvl属性，则放进来
                this.oldLvlMap[myKey] = cacheData.lvl;
            }
            for(var enKey in enData){
                cacheData[enKey] = enData[enKey];
            }
        }else{
            this.cacheDic[myKey] = enData;
        }
    };

    this.getOldLvl = function(key){
        var myKey = this.uniqueKey + key;
        return this.oldLvlMap[myKey];
    }
};

module.exports = BaseCache;

