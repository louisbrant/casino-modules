/**
 * Created by Administrator on 14-10-30.
 */
var https = require('https');
var http = require('http');
var querystring = require('querystring');
/**
 * 请求https
 * @param options
 var options = {
        host: 'buy.itunes.apple.com',
        port: 443,
        path: "/verifyReceipt/",
        method: 'POST'
    };
 * @param writeData
 * @param cb
 */
exports.requestHttps = function(options,writeData,cb){
    var req = https.request(options, function(res) {
        res.setEncoding('utf8');
        var str = "";
        res.on('data', function (chunk) {
            str+=chunk;
        });
        res.on('end', function () {
            cb(null,str);
        });
    });
    req.on('error', function (e) {
        cb(e,message);
    });
    req.write(writeData);
    req.end();
};

/**
 * 请求http
 * @param options
    var options = {
        host: 'buy.itunes.apple.com',
        port: 443,
        path: "/verifyReceipt/",
        method: 'POST'
    };
 * @param writeData
 * @param cb
 */
exports.requestHttp = function(options,writeData,cb){
    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        var str = "";
        res.on('data', function (chunk) {
            str+=chunk;
        });
        res.on('end', function () {
            cb(null,str);
        });
    });
    req.on('error', function(e) {
        cb(e.message);
    });
    req.write(writeData);
    req.end();
};

/*
//例子
var options = {
    host: '127.0.0.1',
    port: 15101,
    path: "/pay/?test=222",
    method: 'post',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
};

exports.requestHttp(options,querystring.stringify({"test1":1111111}),function(err,data){
    console.log(err,data);
});
*/
