var path = require('path');

exports.project = require(path.join(__dirname, "../../config/project.json"));
exports.log4js = require(path.join(__dirname, "../../config/log4js.json"));
exports.log4js_server = require(path.join(__dirname, "../../config/log4js_server.json"));
//exports.servers = require(path.join(__dirname, "../../config/servers.json"));
exports.crypt = require(path.join(__dirname, "../../config/crypt.json"));

exports.configDir = path.join(__dirname, "../../config/");
//exports.zipUrlConfigPath = path.join(__dirname, "../../config/zipUrlConfig.json");


