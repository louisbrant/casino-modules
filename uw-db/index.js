var dbCfg = require("./../../config/db");
var dbPool = require("./src/dbPool");
var DbClient = require("./src/DbClient");
var BaseDao = require("./src/BaseDao");
var Trans = require("./src/Trans");
var dbHelper = require("./src/dbHelper");
var redisHelper = require("./redis/helper");


exports.dbCfg = dbCfg;
exports.dbPool = dbPool;
exports.DbClient = DbClient;
exports.BaseDao = BaseDao;
exports.Trans = Trans;
exports.dbHelper = dbHelper;
exports.redisHelper = redisHelper;


exports.uwPool = dbPool.create(dbCfg.uwCnn);
exports.uwClient = new DbClient(exports.uwPool);
exports.uwTrans = new Trans(exports.uwPool);

exports.mainPool = dbPool.create(dbCfg.mainCnn);
exports.mainClient = new DbClient(exports.mainPool);

exports.kefuPool = dbPool.create(dbCfg.kefuCnn);
exports.kefuClient = new DbClient(exports.kefuPool);


exports.loginPool = dbPool.create(dbCfg.loginCnn);
exports.loginClient = new DbClient(exports.loginPool);