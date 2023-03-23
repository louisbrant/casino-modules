var exports = module.exports;
var consts  = require("uw-data").consts;
var httpUtils  = require("./httpUtils");
var cryptUtils = require("./cryptUtils");
var cryptCfg = require("uw-config").crypt;

exports.requestServer = function(route, arg, serverHost,serverPort,cb){
	if(!serverHost||!serverPort) return cb("端口或者主机没配置");
	route = cryptUtils.enCharCode(cryptCfg.cryptKey,route);
	arg = cryptUtils.enCharCode(cryptCfg.cryptKey,JSON.stringify(arg));
	///?r=h.s.f&a={"_0":2,"t":1449038356846}&s=undefined&c=0&
	var params = '/?r='+route+'&a='+arg+'&c=1&ak='+cryptCfg.adminKey;
	var options = {
		host: serverHost,
		port: serverPort,
		path: params,
		method: 'GET'
	};
	httpUtils.requestHttp(options,"",function(err,data){
		if(err) return cb(err);
		data = JSON.parse(data);
		cb(data.m,data.v);
	});
};
