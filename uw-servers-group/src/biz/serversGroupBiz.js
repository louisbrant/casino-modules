/**
 * Created by John on 2016/4/7.
 */
/**
 * ��ȡ���ڵķ�������
 * @param client
 * @param serverId
 * @param cb
 */
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var serversGroupDao = require("./../dao/serversGroupDao");
var project = require("uw-config").project;
var exports = module.exports;

exports.inServerList = function (client, serverId, type, cb) {
    serversGroupDao.list(client,{type:type,isDelete:0},function(err,coffersList){
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