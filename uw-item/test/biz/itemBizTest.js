/**
 * Created by Administrator on 13-12-14.
 */
var core4Test = require("uw-test").core4Test;
var biz = require("../../src/biz/itemBiz");
var cb = core4Test.cb4Test;
var trans = core4Test.trans;
var uwClient = core4Test.uwClient;
//++++++++++++++++++++++++Test Func++++++++++++++++++++++

function sellItem(){
   biz.sellItem(uwClient,29,1,130,cb);
};
function sellEquip(){
    biz.sellEquip(uwClient,29,1,cb);
};
function use(){
    biz.use(uwClient,15,5,90,cb);
};
function calLogicItems(itemId){
    console.log(biz.calLogicItems(itemId)) ;
};
function saveItems(){
    var userId = 127;
    var items = {
        1 : 100,
        2 : 100,
        75500 : 5,//体力
        75501 : 100,//金币
        75502 : 100,//钻石
        75503 : 100,//领主经验
        75505 : 10,//荣誉
        2003 : 2,//装备
        2004 : 1//装备
    };
    biz.saveItems(uwClient, userId, items, cb);
}
//++++++++++++++++++++++++Run Test+++++++++++++++++++++++
//sellItem();
//sellEquip();
//use();
//saveItems();
calLogicItems(5301);