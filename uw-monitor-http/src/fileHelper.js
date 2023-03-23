/**
 * Created by Administrator on 2015/4/13.
 */
var fs = require("fs");
var path = require("path");
var g_jsonData = {};

/**
 * 返回json格式
 * @param filePath
 * @returns {*}
 */
exports.getJson = function(filePath){
    var fileName = path.basename(filePath);
    if(g_jsonData[fileName]) return g_jsonData[fileName];
    var data = fs.readFileSync(filePath,'utf-8');
    if(!data) return null;
    data = JSON.parse(data);
    g_jsonData[fileName] = data;
    return data;
};

exports.resetData = function(fileName){
    if(g_jsonData.hasOwnProperty(fileName)){
        g_jsonData[fileName] = null;
    }
};