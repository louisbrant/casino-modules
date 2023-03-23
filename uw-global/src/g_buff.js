/**
 * Created by Administrator on 2016/1/16.
 */

var __buffDic = {};

var BuffData = function(id){
    this.id = id;//id
    this.endTime = null;//结束时间
};

exports.getAllBuff = function(){
    return __buffDic;
};

exports.getBuffData = function(id){
    var data = _getData(id);
    return data;
};

exports.setBuffData = function(id,buffData){
    __buffDic[id] = buffData;
};

/**
 * 获取
 * @param id
 * @returns {*}
 */
var _getData = function(id){
    var data = __buffDic[id];
    if(!data){
        data = new BuffData(id);
        data.endTime = new Date();
    }
    return data;
};
