/**
 * Created by Administrator on 2014/5/16.
 */

var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var gameConfigDao = require("./../dao/gameConfigDao");
var g_gameConfig = require("uw-global").g_gameConfig;
var exports = module.exports;


/**
 * 获取数据
 * @param client
 * @param cb
 */
exports.init = function (client, cb) {
    //获取开启时间
    gameConfigDao.select(client,{},function(err,gameConfig){
        if(err) return cb(err);
        if(!gameConfig) return cb("uw_game_config表没有配置相关数据");
        //guildWarSign         VARCHAR(100) COMMENT '[星期开始，星期结束，开始时间，结束时间]',
        //guildWarOpen         VARCHAR(100) COMMENT '[星期几，开始时间，结束时间]',
        if(gameConfig.guildWarSign[0]==null||gameConfig.guildWarSign[1]==null||gameConfig.guildWarSign[2]==null||gameConfig.guildWarSign[3]==null){
            return cb("行会战报名时间设置错误");
        }
        if(gameConfig.guildWarOpen[0]==null||gameConfig.guildWarOpen[1]==null||gameConfig.guildWarOpen[2]==null){
            return cb("行会战开启时间设置错误");
        }
        g_gameConfig.setData(gameConfig);
        cb(null);
    });
};
