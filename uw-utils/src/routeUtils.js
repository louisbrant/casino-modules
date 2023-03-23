var exports = module.exports;
var consts  = require("uw-data").consts;

var sysLogger = null;
var checkRequire = function(){
	 sysLogger = sysLogger || require('pomelo-logger').getLogger("uw-sys-error", __filename);
};
exports.area = function(session, msg, app, cb) {
	checkRequire();
    var areaId = session.get(consts.session.areaId);
	if(!areaId) {
		var error = 'can not find server info for type: ' + msg.serverType;
		sysLogger.error(error);
		sysLogger.error("\n");
		cb(error);
		return;
	}

	cb(null, areaId);
};

exports.connector = function(session, msg, app, cb) {
	checkRequire();
	if(!session) {
		var error = 'fail to route to connector server for session is empty';
		sysLogger.error(error);
		sysLogger.error("\n");
		cb(error);
		return;
	}

	if(!session.frontendId) {
		var error = 'fail to find frontend id in session';
		sysLogger.error(error);
		sysLogger.error("\n");
		cb(error);
		return;
	}

	cb(null, session.frontendId);
};
