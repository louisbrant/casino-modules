/**
 * 用户缓存
 * Created by Administrator on 14-6-21.
 */

var cfgUserCache = require('../../cfg/cacheCfg.json').userCache;
var BaseCache = require('../BaseCache');
var Entity = require('uw-entity').UserEntity;
var util = require("util");

var userCache = new BaseCache();
userCache.init(cfgUserCache.uniqueKey,cfgUserCache.isCache, new Entity());

module.exports = userCache;
