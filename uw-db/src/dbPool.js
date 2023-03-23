var queues = require('mysql-queues');
const DEBUG = true;
var format = require("mysql").format;

var mysql = require('mysql');
/**
 * Desc: 数据库Query的格式化。注意，自定义的只有三个参数。
 * @param sql
 * @param values
 * @param timeZone
 * @returns {*}
 */
function queryFormat (sql, values, timeZone) {
    if(sql.search(/\:(\w+)/) >= 0){
        return sql.replace(/\:(\w+)/g, function (txt, key) {
            if (values.hasOwnProperty(key)) return this.escape(values[key]);
            return txt;
        }.bind(this));
    }
    return format(sql, values, false, timeZone);
}
/*
 * Create mysql connection pool.
 */
var create = function(cnnCfg) {
    var pool  = mysql.createPool({
        connectionLimit : 200,
        acquireTimeout:30000,
        host: cnnCfg.host,
        port: cnnCfg.port,
        user: cnnCfg.user,
        password: cnnCfg.password,
        database: cnnCfg.database,
        queryFormat : queryFormat,
        debug : cnnCfg.debug || false
    });
    return pool;
};

exports.create = create;
