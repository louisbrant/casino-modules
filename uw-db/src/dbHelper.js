/**
 * Created by Administrator on 2016/1/25.
 */
var dbPool = require("./dbPool");
var DbClient = require("./DbClient");

var exports = module.exports;

var clientDic = {};

/**
 * 获取链接
 * @param cfg
 * {
 *   "name": "uwCnn",
 *   "dbModule": "mysql",
 *   "host": "192.168.1.126",
 *   "port": "3306",
 *   "user": "root",
 *   "password": "123456",
 *   "database": "chuanqi_oldma",
 *   "debug": ["ComQueryPacket"]
 * }
 * @returns {*}
 */
exports.getClient = function(cfg){
    if(clientDic[cfg.name]){
        return clientDic[cfg.name];
    }
    var pool = dbPool.create(cfg);
    var client = new DbClient(pool);
    clientDic[cfg.name] = client;
    return client;
};