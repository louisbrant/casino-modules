/**
 * Created by Administrator on 2016/1/25.
 */

var Client = require("./Client");
var pool = require("./pool.js");

var exports = module.exports;

var clientDic = {};

var ClientObj = function(){
    this.name = null;
    this.host = null;
    this.port = null;
    this.client = null;
};

/**
 * 获取链接
 * @param cfg
 * {
 *   "name": "uwCnn",
 *   "host": "192.168.1.126",
 *   "port": "3306",
 *   "user": "root",
 *   "password": "123456",
 * }
 * @returns {*}
 */
exports.getClient = function(cfg){

    var cacheObj = clientDic[cfg.name];
    if(cacheObj){
        if(cacheObj.host==cfg.host&&cacheObj.port==cfg.port)
            return cacheObj.client;
    }

    cacheObj = new ClientObj();
    cacheObj.name = cfg.name;
    cacheObj.host = cfg.host;
    cacheObj.port = cfg.port;


    var newPool = pool.create(cfg);
    var client = new Client(newPool);
    cacheObj.client = client;

    clientDic[cfg.name] = cacheObj;

    return client;
};