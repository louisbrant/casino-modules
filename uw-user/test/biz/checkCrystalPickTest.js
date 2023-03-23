/**
 * Created by Administrator on 2015/6/29.
 * 充值竞技场某些数据
 */
require("date-utils")
var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;
var c_crystal  = require("uw-data").c_crystal;

var crystalDao = require("uw-crystal").crystalDao;
var mailDao = require("uw-mail").mailDao;
var MailEntity = require("uw-entity").MailEntity;
var propUtils = require("uw-utils").propUtils;
var async = require("async");

var  checkCrystalPick = function(){
    crystalDao.list(uwClient,{},function(err,dataList){
        if(err) return console.error("出错啦",err);
        async.map(dataList,function(locData,cb1){
            var crystalId = locData.crystalId;
            var items = {};
            for(var i = 1;i<crystalId;i++){
                //获得钻石和英雄
                var c_crystalData = c_crystal[crystalId];
                //得到物品
                var randomItems = _getRandomItems(c_crystalData.randomItems);
                items = propUtils.mergerProp(items,randomItems);
            }
            if(Object.keys(items).length>0){
                var locEntity = _createEntityByType(locData.userId,items);
                mailDao.insert(uwClient,locEntity,cb1);
            }else{
                cb1();
            }

        },function(err,data){
            if(err) return console.error("出错啦",err);
            console.log("check finish!");
        });
    })
};

/**
 * 创建entity实例
 * @param userId
 * @param type
 * @param replaceArgs
 * @param items
 * @returns {MailEntity}
 */
var _createEntityByType = function(userId, items){
    var mailEntity = new MailEntity();
    mailEntity.userId = userId;//"用户id"
    mailEntity.type = 0;//"类型"
    mailEntity.fromName = "系统邮件";//"发送者"
    mailEntity.title = "撸塔之战升星材料补偿";//"标题"
    mailEntity.content = "亲爱的勇士:[/br]    英雄升星功能已经更新，在撸塔之战中每一关的奖励都会随机获得一个升星材料，在此我们也将对大家已经打过的关卡进行材料奖励补偿，请及时领取哦，祝您游戏愉快！";//"内容"
    mailEntity.replaceArgs = null;//"内容"
    mailEntity.items = items;//"附件物品"
    mailEntity.delHours = 0;//"操作后几小时删除"
    mailEntity.delTime = null;//"删除时间"
    mailEntity.expireTime = (new Date()).addDays(30);//"过期时间"
    mailEntity.isPicked = 0;//"是否提取物品"
    mailEntity.isRead = 0;//"是否阅读"
    mailEntity.addTime = new Date();
    return mailEntity;
};
//获取随机的物品
var _getRandomItems = function (randomItems) {
    var ret = {};
    var random = Math.random()*10000;
    for (var i = 0; i < randomItems.length; i++) {
        var locCreate = randomItems[i];
        if (random <= locCreate[2]) {
            ret[locCreate[0]] = locCreate[1];
            break;
        }
    }
    return ret;
};
/*************************************************************/
checkCrystalPick();




