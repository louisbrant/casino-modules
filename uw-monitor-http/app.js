var projectConfig = require('uw-config').project;
var watchFile = require('./src/watchFile');
var appUtils =require("uw-utils").appUtils;
appUtils.before();
/**
 * Module dependencies.
 */
require("date-utils");
var express = require('express');
var bodyParser = require('body-parser');
var mvc = require('uwa-middleware').mvc;

var app = module.exports = express();


//设置跨域访问
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});


app.engine('.html', require('ejs').__express);
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
//app.use(bodyParser.urlencoded({ extended: false }));
//app.use(bodyParser.json());

mvc.init(app, { verbose: !module.parent });//mvc

app.listen(projectConfig.monitorHttpPort);
console.error('[uw-view-http] start http://%s:%s', projectConfig.monitorHttpHost, projectConfig.monitorHttpPort);

// Uncaught exception handler
process.on('uncaughtException', function (err) {
    //输入语法报错到日志5
    var logger = require('uw-log').getLogger("uw-sys-error", __filename);
    logger.error(' Caught exception: ' + err.stack);
    logger.error("\n");
});
