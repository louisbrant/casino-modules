var bonusBiz = require('./../../src/biz/bonusBiz.js');
var client = require("uw-db").uwClient;
var uwData = require("uw-data");
var dsNameConsts = uwData.dsNameConsts;
var iface = uwData.iface;
var consts = uwData.consts;
var ds = require("uw-ds").ds;
var iface = require("uw-data").iface;
var wrapResult = require('uw-utils').wrapResultFunc(__filename);
var async = require("async");

/*
truncate table uw_bonus_share;
truncate table uw_bonus_relation;
truncate table uw_bonus_draw;
truncate table uw_bonus_event;

insert into uw_user (id, nickName, lvl, vip) values (100, 'name100', 8, 2);
insert into uw_user (id, nickName, lvl, vip) values (101, 'name101', 6, 2);
insert into uw_user (id, nickName, lvl, vip) values (200, 'name200', 5, 4);
insert into uw_user (id, nickName, lvl, vip) values (201, 'name201', 4, 2);
insert into uw_user (id, nickName, lvl, vip) values (202, 'name202', 3, 6);
insert into uw_user (id, nickName, lvl, vip) values (300, 'name300', 2, 8);
insert into uw_user (id, nickName, lvl, vip) values (302, 'name302', 9, 2);
 */

function output(err, data) {
    console.log(err, data);
}

function testCreateShare(userId, next) {
    serverIndexId = 1;
    bonusBiz.createShare(client, userId, serverIndexId, function(err, data) {
        if (err) return next(null, wrapResult(err));
        next(null, wrapResult(null, data, dsNameConsts.BonusShareUrl));
    });
}

function testInviteeLogin(userId, next) {
    var shareKey = bonusBiz.getShareKey(100, 1);
    bonusBiz.inviteeLogin(client, userId, shareKey, next);
}

function testGetInfo(userId, lastId, next) {
    bonusBiz.getInfo(client, userId, lastId, function(err, shareData, relationData) {
        if (err) return next(null, wrapResult(err));
        var info = new ds.BonusInfo();
        if (shareData) {
            info.shareInfo = new ds.BonusShareData(1, shareData['relationCount'], shareData['amountDraw'], shareData['balance']);
            if (relationData) {
               var relations = [];
               for (var i = 0; i < relationData.length; i++) {
                    var relation = relationData[i];
                    relations.push(new ds.BonusRelationData(relation['id'], relation['userId'], relation['nickName'], relation['lvl'], relation['vip'], relation['amount']));
               }
               info.relations = relations;
            }
        } else {
            info.shareInfo = new ds.BonusShareData(0, 0, 0, 0);
        }
        next(null, wrapResult(null, info, dsNameConsts.BonusInfo));
    });
}

function testBreakRelation(userId, inviteeUserId, next) {
    bonusBiz.breakRelation(client, userId, inviteeUserId, next);
}

function testInviteeLevelUp(userId, level, next) {
    bonusBiz.inviteeLevelUp(client, userId, level, next);
}

function testInviteeCharge(userId, chargeCount, next) {
    bonusBiz.inviteeCharge(client, userId, chargeCount, next);
}

function testDraw(userId, next) {
    bonusBiz.draw(client, userId, function(err, data){
        if (err) return next(null, wrapResult(err));
        next(null, wrapResult(null, data, dsNameConsts.BonusDrawResult));
    });
}

function testSendShareGift(userId, next) {
    bonusBiz.sendShareGift(client, userId, next);
}
// testCreateShare(101, output);
// testInviteeLogin(202, output);
// testGetInfo(100, 0, output);
// testBreakRelation(100, 200, output);
// testInviteeLevelUp(201, 10, output);
// testInviteeCharge(201, 100, output);
// testDraw(100, output);
// testSendShareGift(100, output);
