/**
 * Created by Administrator on 2016/5/3.
 */
var redis = require('redis');
var generic_pool = require('generic-pool');

/*
 * Create mysql connection pool.
 */
var create = function(cnnCfg) {
    return generic_pool.Pool({
        name: cnnCfg.name,
        create: function (callback) {
            var client = redis.createClient(cnnCfg.port,cnnCfg.host);

            client.on('error', function (err) {
                console.error('error at connect redis: %s', err.stack);
            });

            callback(null, client);
        },
        destroy: function (client) {
            client.quit();
        }, //当超时则释放连接
        max: 10,   //最大连接数
        idleTimeoutMillis: 10000,  //超时时间
        log: cnnCfg.debug || false //是否显示日志
    });
};

exports.create = create;
