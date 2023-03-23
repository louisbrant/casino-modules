/**
 * 用户缓存
 * Created by Administrator on 14-6-21.
 */

var cfgTaskCache = require('../../cfg/cacheCfg.json').taskCache;
var BaseCache = require('../BaseCache');
var Entity = require('uw-entity').TaskEntity;
var util = require("util");

var taskCache = new BaseCache();
taskCache.init(cfgTaskCache.uniqueKey,cfgTaskCache.isCache, new Entity());

module.exports = taskCache;
