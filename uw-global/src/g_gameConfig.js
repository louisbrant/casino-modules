/**
 * Created by Administrator on 2016/4/19.
 */

var __configData = {};

exports.setData = function(data){
    __configData = data;
};

exports.getData = function(){
    return   __configData;
};