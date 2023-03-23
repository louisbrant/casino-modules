/**
 * Created by Administrator on 14-3-28.
 */
var pomelo = require("pomelo");
var serversCfg = require("uw-config").servers;
var exports = module.exports;


exports.getConnector = function(){
    var connectors = pomelo.app.getServersByType('c');
    //随机一个客户端链接
    var index = 0|(Math.random()*connectors.length);
    var connector = connectors[index];
    return connector;
};

exports.getArea = function(cid){
    serversCfg
    var areas = pomelo.app.getServersByType('c');
    //随机一个客户端链接
    var index = 0|(Math.random()*areas.length);
    var area = areas[index];
    return area;
};
