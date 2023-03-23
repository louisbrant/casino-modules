/**
 * Created by Administrator on 2014/5/9.
 */
var core4Test = require("uw-test").core4Test;
var mailBiz = require("../../src/biz/mailBiz");
var mailDao = require("../../src/dao/mailDao");
var uwDb = require("uw-db");
//uwDb.uwTrans._isTest = false;
var cb = core4Test.cb4Test;
var uwClient = core4Test.uwClient;
var MailEntity = require('uw-entity').MailEntity;
//++++++++++++++++++++++++Test Func++++++++++++++++++++++

function addByType(cb) {
    mailBiz.addByType(uwClient, 1, 4, [1], {"6":5}, cb);
}
function getList(cb) {
    mailBiz.getList(uwClient, 1, cb);
}

function addMailByList(cb) {
    var entityList = [];
    for(var i = 0;i<2;i++){
        var mailEntity = new MailEntity();
        mailEntity.userId = 0;//"用户id"
        mailEntity.type = 0;//"类型"
        mailEntity.fromName = null;//"发送者"
        mailEntity.title = null;//"标题"
        mailEntity.content = "额'啊";//"内容"
        mailEntity.replaceArgs = null;//"内容"
        mailEntity.items = {"1":2};//"附件物品"
        mailEntity.delHours = 0;//"操作后几小时删除"
        mailEntity.delTime = null;//"删除时间"
        mailEntity.expireTime = null;//"过期时间"
        mailEntity.isPicked = 0;//"是否提取物品"
        mailEntity.isRead = 0;//"是否阅读"
        mailEntity.addTime = new Date();
        entityList.push(mailEntity);
    }
    mailDao.insertList(uwClient, entityList, cb);
}

function pickItems(cb){
    mailBiz.pickItems(uwClient, 36,199, cb);
}

function pickAllItems(cb){
    mailBiz.pickAllItems(uwClient, 2191, cb);
}
/*******************************************************************************************/

//addByType(cb);
//getList(cb)
addMailByList(cb);
//pickItems(cb);
//pickAllItems(cb);