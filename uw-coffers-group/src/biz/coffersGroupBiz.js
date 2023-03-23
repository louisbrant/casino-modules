/**
 * Created by Administrator on 2014/5/16.
 */

var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var coffersGroupDao = require("./../dao/coffersGroupDao");
var project = require("uw-config").project;
var exports = module.exports;


/**
 * 获取所在的服务器组
 * @param client
 * @param serverId
 * @param cb
 */
exports.inServerList = function (client, serverId, cb) {
    coffersGroupDao.list(client,{},function(err,coffersList){
        if(err) return cb(null);
        var serverArr = [];
        for(var i = 0;i<coffersList.length;i++){
            var locCoffers = coffersList[i];
            if(locCoffers.serverArr.indexOf(parseInt(serverId) )>-1){
                serverArr = locCoffers.serverArr;
                break;
            }
        }
        cb(null,serverArr);
    })
};
