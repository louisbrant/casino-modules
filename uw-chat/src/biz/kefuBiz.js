var async = require("async");
var commonUtils = require("uw-utils").commonUtils;
var userDao = require("uw-user").userDao;
var sessionDao = require("./../dao/kefuSessionDao.js");
var detailDao = require("./../dao/kefuDetailDao.js");
var project = require("uw-config").project;
var c_prop = require("uw-data").c_prop;
var async = require("async");
var exports = module.exports;


exports.getList = function(client, userId, openId, lastId, cb){
    sessionDao.select(client, 'game_id = ? and area = ? and role_id = ?', ['100220', project.serverId, userId], function(err, sessionData) {
        if(err) return cb(err);
        if (!sessionData)
            return cb(null, []);
        detailDao.list(client, 'gamerole_id = ? and id > ? order by id asc limit 30', [sessionData.id, lastId], function(err, data) {
            if (err) return cb(err);
            cb(null, mapData(data));
        });
    })
};

function mapData(data) {
    return data.map(function(item) {
        var newData = {
            uniqueId: item.id,
            type: c_prop.chatTypeKey.sys,
            subType: 0,
        }
        if (item.admin_id) {
            var kefuName = item.vip_level >= 8 ? '金牌客服' : '客服';
            newData.userArgs = [kefuName, item.content];
        } else {
            newData.userArgs = [item.nickname, item.content];
        }
        return newData;
    });
}

exports.addData = function(client, lastId, content, openId, userId, nickname, vipLevel, cb) {
    //先检查当前用户是否存在, 如果存在则更新，不存在就创建新数据
    var now = new Date().toFormat("YYYY-MM-DD HH24:MI:SS");
    var detailData = {
        nickname: nickname,
        area: project.serverId,
        open_id: openId || "",
        role_id: userId,
        vip_level: vipLevel,
        content: content,
        game_id: '100220',
        created: now,
    }
    sessionDao.select(client, 'game_id = ? and area = ? and role_id = ?', ['100220', project.serverId, userId], function(err, sessionData) {
        if (err) return cb(err);
        if (!sessionData) {
            sessionData = {
                open_id: openId||"",
                role_id: userId,
                nickname: nickname,
                game_id: '100220',
                vip_level: vipLevel,
                area: project.serverId,
                created: now,
                updated: now,
            };
            sessionDao.insert(client, sessionData, function(err, data) {
                if(err) return cb(err);
                sessionData.id = data.insertId;
                detailData.gamerole_id = sessionData.id;
                detailDao.insert(client, detailData, function(err, data) {
                    if (err) return cb(err);
                    detailDao.list(client, 'gamerole_id = ? and id > ? order by id desc limit 30', [sessionData.id, lastId], function(err, data) {
                        if (err) return cb(err);
                        cb(null, mapData(data));
                    });
                });
            });
        } else {
            detailData.gamerole_id = sessionData.id;
            async.parallel([
                function(cb1) {
                    detailData.gamerole_id = sessionData.id;
                    detailDao.insert(client, detailData, cb1);
                },
                function(cb1) {
                    updateData = {
                        vip_level: vipLevel,
                        nickname: nickname,
                        status: 0,
                        updated: now
                    }
                    sessionDao.update(client, updateData, {id: sessionData.id}, cb1);
                }
            ], function(err, data) {
                if (err) return cb(err);
                detailDao.list(client, 'gamerole_id = ? and id > ? order by id desc limit 30', [sessionData.id, lastId], function(err, data) {
                    if (err) return cb(err);
                    cb(null, mapData(data));
                });
            });
        }
    })
}
