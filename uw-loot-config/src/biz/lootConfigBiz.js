/**
 * Created by Administrator on 2014/5/16.
 */

var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var lootConfigDao = require("./../dao/lootConfigDao");
var g_lootConfig = require("uw-global").g_lootConfig;
var mainClient = require("uw-db").mainClient;
var clusterBiz = require("uw-cluster").clusterBiz;
var exports = module.exports;


/**
 * 初始化
 * @param cb
 */
exports.init = function (cb) {
    //获取开启时间
    lootConfigDao.list(mainClient,{},function(err,lootConfigList){
        if(err) return cb(err);
        var typeArr = [];
        for(var i = 0;i<lootConfigList.length;i++){
            var locConfig = lootConfigList[i];
            if(locConfig.startTime&&locConfig.endTime){
                if(locConfig.startTime.isBefore(new Date())&&locConfig.endTime.isAfter(new Date())){
                    var locLootTypeArr = locConfig.lootTypeArr||[];//
                    typeArr = typeArr.concat(locLootTypeArr);
                }
            }
        }
        g_lootConfig.setLootTypeArr(typeArr);
        clusterBiz.setMsgToWorks("a.lootConfigRemote.updateLootConfig",typeArr);
        cb(null);
    });
};
