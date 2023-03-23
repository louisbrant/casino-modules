/**
 * 专属装备
 */
var uwData = require("uw-data");
var t_item = uwData.t_item;
var t_itemEquip = uwData.t_itemEquip;
var c_fragment = uwData.c_fragment;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;

var EquipEntity = require("uw-entity").EquipEntity;

var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var propUtils = require("uw-utils").propUtils;
var equipDao = require("./../dao/equipDao");
var userDao = require("uw-user").userDao;
var userUtils = require("uw-utils").userUtils;
var formula = require("uw-formula");

var exports = module.exports;

exports.putOn