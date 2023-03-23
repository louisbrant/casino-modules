/**
 * Created by Administrator on 13-12-14.
 */
var core4Test = require("uw-test").core4Test;
var biz = require("../../src/biz/equipBiz");
var dao = require("../../src/dao/equipDao");
var cb = core4Test.cb4Test;
var trans = core4Test.trans;
var uwClient = core4Test.uwClient;

//++++++++++++++++++++++++Test Func++++++++++++++++++++++
function insertByTempIds(cb){
    biz.insertByTempIds(uwClient, 1,[2005,2006], cb);
};
function getExclusiveValue(){
    var prop = biz.getExclusiveValue(47005, "skill", 0);
    console.log(prop);
};
function calEquipProps(){
    var prop = biz.calEquipProps(2001,0);
    console.log(prop);
};
function calExclusiveExp(){
    var equipData1 = {tempId:47005,inlayGem:[null,53002],part:1,lvl:2};
    var equipData2 = {tempId:47005,inlayGem:[null,53002],part:6,lvl:3};
    var exp = biz.calExclusiveExp({"1805":2},[equipData1,equipData2],3);
    console.log(exp);
};
function calQualityByExp(){
    var equipData1 = {tempId:47005,inlayGem:[null,53002],part:1,lvl:2};
    biz.calQualityByExp(0,equipData1);
    console.log(equipData1);
};
function putDown(cb){
    biz.putDown(uwClient, 259, 4147, 3009, cb);
};
//++++++++++++++++++++++++Run Test+++++++++++++++++++++++
//insertByTempIds(cb);
//calEquipProps();
//getExclusiveValue();
//calExclusiveExp()
//calQualityByExp()
putDown(cb);
