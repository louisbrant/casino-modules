/**
 * Created by John on 2016/5/4.
 */
var uwData = require("uw-data");
var t_item = uwData.t_item;
var c_prop = uwData.c_prop;
var chatBiz  =  require("uw-chat").chatBiz;
var TreasureEntity = require("uw-entity").TreasureEntity;

var g_incognito = require("uw-global").g_incognito;
var treasureBiz = null;
var treasureDao = null;
var exports = module.exports;
/*
* 添加秘宝的一套api
 */
var checkRequire = function(){
    treasureDao = treasureDao || require("uw-treasure").treasureDao;
    treasureBiz = treasureBiz || require("uw-treasure").treasureBiz;
};
exports.addTreasure = function(client, userData, treasureItems){
    checkRequire();
    var insertList = [];
    for(var itemId in treasureItems){
        if(itemId<6000 || itemId>7000)
            continue;
        var num = parseInt(treasureItems[itemId]);
        var treasureEntity = new TreasureEntity();
        treasureEntity.treasureId = itemId;
        treasureEntity.openTime = new Date();
        treasureEntity.userId = userData.id;
        for(var i = 0; i<num;i++) {
            insertList.push(treasureEntity);
        }
        var treasureItemName = t_item[itemId].name;
        var color = t_item[itemId].color;
        chatBiz.addSysData(74, [color,treasureItemName, userData.nickName]);
        treasureDao.insertList(client, insertList, function (err, data) {
            if (err) return console.log(err);
            var insertId = data.insertId;
            var affectedRows = data.affectedRows;
            for(var i = 0; i<affectedRows; i++) {
                var newO = _cloneOBj(treasureEntity);
                newO.id = i+insertId;
                newO.openTime = new Date();
                newO.item = null;
                g_incognito.setTreasureInfoById(newO.id, newO);
                g_incognito.setTreasureOpenTimeOut(newO);
            }
        });
        treasureBiz.insertTreasureRecord(client, c_prop.treasureRecordTypeKey.getTreasure, userData, treasureEntity.treasureId, {}, function (err, data2) {
            if (err) {
                console.log(err)
            }
        });
    }
};

var _cloneOBj = function(obj) {
    var newO = {};
    if(obj instanceof Array){
        newO = [];
    }
    for(var key in obj){
        var val = obj[key];
        newO[key] = typeof val === 'object' ? arguments.callee(val) : val;
    }
    return newO;
};