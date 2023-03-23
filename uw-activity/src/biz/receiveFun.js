/**
 * Created by Administrator on 2015/1/23.
 */
var uwData = require("uw-data");
var c_msgCode = uwData.c_msgCode;
var c_prop = uwData.c_prop;
var consts = uwData.consts;
var c_lottery = uwData.c_lottery;
var c_game = uwData.c_game;
var c_task = uwData.c_task;
var c_reward = uwData.c_reward;
var c_mysterShop = uwData.c_mysterShop;
var t_item = uwData.t_item;
var c_luckyTalos = uwData.c_luckyTalos;
var c_luckyMajong = uwData.c_luckyMajong;
var c_everydayCharge = uwData.c_everydayCharge;
var getMsg = require("uw-utils").msgFunc(__filename);
var userUtils = require("uw-user").userUtils;
var propUtils = require("uw-utils").propUtils;
var commonUtils = require("uw-utils").commonUtils;
var activityUtils = require("./activityUtils");
var formula = require("uw-formula");
var async = require("async");

var fiveDaysTargetDao = null;
var fiveDayTargetBiz = null;
var taskDao = null;
var chatBiz = null;
var taskBiz = null;
var treasureUtils = null;
var newFourDaysDao = null;
var newFourDaysBiz = null;
var heroDao = null;

var checkRequire = function(){
    chatBiz = chatBiz || require("uw-chat").chatBiz;
    taskBiz = taskBiz || require("uw-task").taskBiz;
    taskDao = taskDao || require("uw-task").taskDao;
    fiveDaysTargetDao = fiveDaysTargetDao || require("uw-fiveDaysTarget").fiveDaysTargetDao;
    fiveDayTargetBiz = fiveDayTargetBiz || require("uw-fiveDaysTarget").fiveDaysTargetBiz;
    treasureUtils = treasureUtils || require("uw-treasure").treasureUtils;
    newFourDaysDao = newFourDaysDao || require("uw-fiveDaysTarget").newFourDaysDao;
    newFourDaysBiz = newFourDaysBiz || require("uw-fiveDaysTarget").newFourDaysBiz;
    heroDao = heroDao || require("uw-hero").heroDao;
};

var fiveDaysTargetTask = {0:"3100004",1:"3100002",2:"3100003",3:"3100005",4:"0"};

var lotteryArrData = {};

var _receiveFun = {};
exports.receiveFun = _receiveFun;

//首充
_receiveFun[c_prop.activityTypeKey.firstRecharge] = function (client, userData, activityData, index, cb) {
    //获取对应的数据
    var itemData = activityData.activityItems[index];
    if (!itemData) return cb(getMsg(c_msgCode.activitiesEnd));//活动结束
    var items = itemData.items;

    var receiveData = userData.activity[activityData.activity.id] || [];
    //领取次数
    var receiveCount = receiveData[index] || 0;

    //已经领取过
    if(receiveCount>0) return cb(getMsg(c_msgCode.activitiesEnd));

    //判断累充钻石是否达到
    if (activityData.allRecharge <=0) return cb("累计充值达不到条件");

    //update
    //更新领取次数
    receiveData[index] = 1;
    userData.activity[activityData.activity.id] = receiveData;

    //得到物品
    cb(null, [items]);
};


//七天登陆
_receiveFun[c_prop.activityTypeKey.sevenLogin] = function (client, userData, activityData, index, cb) {
    //获取对应的数据
    var itemData = activityData.activityItems[index];
    if (!itemData) return cb(getMsg(c_msgCode.activitiesEnd));//活动结束
    var items = itemData.items;

    var needLvl = itemData.userLvl || 0;

    var receiveData = userData.activity[activityData.activity.id] || [];
    if(index!=receiveData.length) return cb(getMsg(c_msgCode.activitiesEnd));//活动结束
    //领取次数
    var receiveTime = receiveData[receiveData.length -1];

    if (receiveTime) {
        if (typeof receiveTime == "string") {
            receiveTime = new Date(receiveTime);
        }
        //同一天
        if (Date.equalsDay(receiveTime, new Date())) return cb("今天已经领取");
    }


    //update
    //更新领取时间
    receiveData.push(new Date());
    userData.activity[activityData.activity.id] = receiveData;

    //得到物品
    cb(null, [items]);
};


//每日限购
_receiveFun[c_prop.activityTypeKey.limitBuy] = function (client, userData, activityData, index, cb) {
    //获取对应的数据
    var itemData = activityData.activityItems[index];
    if (!itemData) return cb(getMsg(c_msgCode.activitiesEnd));//活动结束
    var items = itemData.items;
    var limitNum = itemData.limitNum || 0;
    var costDiamond = itemData.diamond || 0;
    //判断购买上限
    var receiveData = userData.activity[activityData.activity.id] || [];
    var indexData = receiveData[index]||[];//[次数，时间]
    var buyNum = indexData[0] || 0;
    var receiveTime = indexData[1];
    if(receiveTime){
        receiveTime = new Date(receiveTime);
        //今天超过上限
        if(receiveTime.equalsDay(new Date())){
            if (buyNum >= limitNum) return cb(getMsg(c_msgCode.buyLimitNow));
        }else{
            buyNum = 0;
        }
    }

    //判断钻石是否足够
    if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));

    //update
    //扣除钻石
    userUtils.reduceDiamond(userData,costDiamond,consts.diamondConsumeType.activity_1,activityData.activity.id+"-"+index);
    indexData[0] = buyNum + 1;


    indexData[1] = new Date();

    //更新购买次数
    receiveData[index] = indexData;
    userData.activity[activityData.activity.id] = receiveData;

    cb(null, [items]);
};

//时间段限购
_receiveFun[c_prop.activityTypeKey.limitBuyRange] = function (client, userData, activityData, index, cb) {
    //获取对应的数据
    var itemData = activityData.activityItems[index];
    if (!itemData) return cb(getMsg(c_msgCode.activitiesEnd));//活动结束
    var items = itemData.items;
    var limitNum = itemData.limitNum || 0;
    var costDiamond = itemData.diamond || 0;
    //判断购买上限
    var receiveData = userData.activity[activityData.activity.id] || [];
    var indexData = receiveData[index]||[];//[次数]
    var buyNum = indexData[0] || 0;

    if (buyNum >= limitNum) return cb(getMsg(c_msgCode.buyLimitNow));

    //判断钻石是否足够
    if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));

    //update
    //扣除钻石
    userUtils.reduceDiamond(userData,costDiamond,consts.diamondConsumeType.activity_1,activityData.activity.id+"-"+index);
    indexData[0] = buyNum + 1;

    //更新购买次数
    receiveData[index] = indexData;
    userData.activity[activityData.activity.id] = receiveData;

    cb(null, [items]);
};


//天累计充值
_receiveFun[c_prop.activityTypeKey.dayChargeCount] = function (client, userData, activityData, index, cb) {
    //获取对应的数据
    var itemData = activityData.activityItems[index];
    if (!itemData) return cb(getMsg(c_msgCode.activitiesEnd));//活动结束
    var items = itemData.items;

    var needCount = itemData.rmb || 0;

    var receiveData = userData.activity[activityData.activity.id] || [];
    //领取时间
    var receiveTime = receiveData[index];
    if(receiveTime){
        receiveTime = new Date(receiveTime);
        //已经领取过
        if(receiveTime.equalsDay(new Date())) return cb(getMsg(c_msgCode.activitiesEnd));
    }


    //判断累充钻石是否达到
    if (activityData.todayRecharge < needCount) return cb("累计充值达不到条件");

    //update
    //更新领取次数
    receiveData[index] = new Date();
    userData.activity[activityData.activity.id] = receiveData;

    //得到物品
    cb(null, [items]);
};

//所有累计充值
_receiveFun[c_prop.activityTypeKey.allChargeCount] = function (client, userData, activityData, index, cb) {
    //获取今天累计充值
    //获取对应的数据
    var itemData = activityData.activityItems[index];
    if (!itemData) return cb(getMsg(c_msgCode.activitiesEnd));//活动结束
    var items = itemData.items;

    var needCount = itemData.rmb || 0;

    var receiveData = userData.activity[activityData.activity.id] || [];
    //领取次数
    var receiveCount = receiveData[index] || 0;

    //已经领取过
    if(receiveCount>0) return cb(getMsg(c_msgCode.activitiesEnd));

    //判断累充钻石是否达到
    if (activityData.allRecharge < needCount) return cb("累计充值达不到条件");

    //update
    //更新领取次数
    receiveData[index] = 1;
    userData.activity[activityData.activity.id] = receiveData;

    //得到物品
    cb(null, [items]);
};

//每日消费
_receiveFun[c_prop.activityTypeKey.dayCostCount] = function (client, userData, activityData, index, cb) {

    //获取对应的数据
    var itemData = activityData.activityItems[index];
    if (!itemData) return cb(getMsg(c_msgCode.activitiesEnd));//活动结束
    var items = itemData.items;

    var needCount = itemData.diamond || 0;

    var receiveData = userData.activity[activityData.activity.id] || [];

    //领取时间
    var receiveTime = receiveData[index];
    if(receiveTime){
        receiveTime = new Date(receiveTime);
        //已经领取过
        if(receiveTime.equalsDay(new Date())) return cb(getMsg(c_msgCode.activitiesEnd));
    }

    //判断累充钻石是否达到
    if (activityData.todayCost < needCount) return cb("累计消费达不到条件");

    //update
    //更新领取次数
    receiveData[index] = new Date();
    userData.activity[activityData.activity.id] = receiveData;

    //得到物品
    cb(null, [items]);
};

//全部消费
_receiveFun[c_prop.activityTypeKey.allCostCount] = function (client, userData, activityData, index, cb) {
    //获取对应的数据
    var itemData = activityData.activityItems[index];
    if (!itemData) return cb(getMsg(c_msgCode.activitiesEnd));//活动结束
    var items = itemData.items;

    var needCount = itemData.diamond || 0;

    var receiveData = userData.activity[activityData.activity.id] || [];
    //领取次数
    var receiveCount = receiveData[index] || 0;

    //已经领取过
    if(receiveCount>0) return cb(getMsg(c_msgCode.activitiesEnd));

    //判断累充钻石是否达到
    if (activityData.allCost < needCount) return cb("累计消费达不到条件");

    //update
    //更新领取次数
    receiveData[index] = 1;
    userData.activity[activityData.activity.id] = receiveData;

    //得到物品
    cb(null, [items]);
};

//领主升级
_receiveFun[c_prop.activityTypeKey.upLvl] = function (client, userData, activityData, index, cb) {
    //获取对应的数据
    var itemData = activityData.activityItems[index];
    if (!itemData) return cb(getMsg(c_msgCode.activitiesEnd));//活动结束
    var items = itemData.items;

    var needLvl = itemData.userLvl || 0;

    var receiveData = userData.activity[activityData.activity.id] || [];
    //领取次数
    var receiveCount = receiveData[index] || 0;

    //已经领取过
    if(receiveCount>0) return cb(getMsg(c_msgCode.activitiesEnd));

    //判断等级是否达到
    if (userData.lvl < needLvl) return cb("领主等级达不到条件");

    //update
    //更新领取次数
    receiveData[index] = 1;
    userData.activity[activityData.activity.id] = receiveData;

    //得到物品
    cb(null, [items]);
};

//vip升级
_receiveFun[c_prop.activityTypeKey.upVip] = function (client, userData, activityData, index, cb) {
    //获取对应的数据
    var itemData = activityData.activityItems[index];
    if (!itemData) return cb(getMsg(c_msgCode.activitiesEnd));//活动结束
    var items = itemData.items;

    var needLvl = itemData.vipLvl || 0;

    var receiveData = userData.activity[activityData.activity.id] || [];
    //领取次数
    var receiveCount = receiveData[index] || 0;

    //已经领取过
    if(receiveCount>0) return cb(getMsg(c_msgCode.activitiesEnd));

    //判断等级是否达到
    if (userData.vip < needLvl) return cb("VIP等级达不到条件");

    //update
    //更新领取次数
    receiveData[index] = 1;
    userData.activity[activityData.activity.id] = receiveData;

    //得到物品
    cb(null, [items]);
};

//签到
_receiveFun[c_prop.activityTypeKey.sign] = function (client, userData, activityData, index, cb) {
    //获取对应的数据
   var exValues =  activityData.activity.exValues;

    var signData = userData.sign || [];
    var signTime = signData[1];
    if(signTime) signTime = signData[1] = new Date(signTime);
    //判断今日是否已经签到
    if(activityUtils.isTodaySigned(signData)){
        return cb("今日已经签到");
    }

    //获取今日签到物品
    var now = new Date();
    var signNum = activityUtils.getSignNum(signData);
    var id = (now.getMonth() + 1) * 100 + signNum + 1;


    var items = exValues[id];

    //更新签到次数和时间
    signData[0] = signNum+1;
    signData[1] = new Date();
    userData.sign = signData;

    //得到物品
    cb(null, [items]);
};

//五日目标
_receiveFun[c_prop.activityTypeKey.fiveDaysTarget] = function(client, usrData, activityData, index, cb){
    checkRequire();

    //获取对应的数据
    var items = {}
    var fiveDaysTargetItemArr = [];
    var day = fiveDayTargetBiz.getCurDay(activityData.activity);
    if (day >= 4) {
        return cb(getMsg(c_msgCode.activitiesEnd));
    }

    if (index > day) {
        return cb(getMsg(c_msgCode.eventNoStart));
    }
    if (index <0 || index > 4)
        return cb("参数错误");
    var receiveData = usrData.activity[activityData.activity.id] || [];
    //领取次数
    var receiveCount = receiveData[index] || 0;

    //已经领取过
    if(receiveCount>0) return cb(getMsg(c_msgCode.activitiesEnd));
    var taskId = fiveDaysTargetTask[index];
    var taskDataConfig =  c_task[taskId];
    if (!taskDataConfig)
        return cb("找不到对应任务");
    //判断是否完成相应任务
    async.parallel([
        function(cb1) {
            //得到任务数据
            taskDao.select(client, {userId: usrData.id}, cb1);
        },
        function(cb1) {
            //得到翅膀确定数值
            fiveDaysTargetDao.getCurTaskValue(client, usrData.id, c_prop.cTaskType.wing, cb1);
        },
        function(cb1) {
            //得到工会确定数值
            fiveDaysTargetDao.getCurTaskValue(client, usrData.id, c_prop.cTaskTypeKey.guild, cb1);
        }
    ],function(err, data) {
        var taskData = data[0];
        var wingData = data[1];
        var guildData = data[2];
        var ex = usrData.exData;
        var arenaCount = ex[c_prop.userExDataKey.arenaCount] || 0;

            var taskId = fiveDaysTargetTask[index];
            var taskConfigData = c_task[taskId];
            if (!taskConfigData)
                return cb("找不到相关任务数据！");
            var needValue = taskConfigData.targetValue;
            //判断任务是否达成
            var tasksType = taskConfigData.cTaskType;
            var tasksValue = "";
            var value = 0;
            if (taskData || taskData.tasksValue)
                tasksValue[tasksType];
            switch(index){
                case 0:
                {
                    value = usrData.combat;
                    break;
                }
                case 1:
                {
                    value = wingData[0].rankValue;
                    break;
                }
                case 2:
                {
                    value = arenaCount;
                    break;
                }
                case 3:
                {
                    if (!guildData[0].count) {
                        value  = 0;
                    }else {
                        value = guildData[0].guildId;
                    }

                    break;
                }

            }
            if (value < needValue)
                return cb(getMsg(c_msgCode.goalNotGet));
            //update
            //更新领取次数
            receiveData[index] = 1;
            usrData.activity[activityData.activity.id] = receiveData;
            var rewardId = taskConfigData.rewardId;
            var c_rewardData = c_reward[rewardId];
            usrData.prestige += c_rewardData.prestige;
            usrData.gold += c_rewardData.gold;
            usrData.diamond += c_rewardData.diamond;
            items = c_rewardData.rewardItems;

            //得到物品
            cb(null, [items]);
    });
};

//新四日目标
_receiveFun[c_prop.activityTypeKey.newFourDays] = function(client, usrData, activityData, index, cb){
    checkRequire();

    //获取对应的数据
    var items = {};
    var day = newFourDaysBiz.getCurDay(activityData.activity);
    if (day >= 4) {
        return cb(getMsg(c_msgCode.activitiesEnd));
    }
    if (index > day) {
        return cb(getMsg(c_msgCode.eventNoStart));
    }
    if (index <0 || index > 3)
        return cb("参数错误");
    var receiveData = usrData.activity[activityData.activity.id] || [];
    //领取次数
    var receiveCount = receiveData[index] || 0;

    //已经领取过
    if(receiveCount>0) return cb(getMsg(c_msgCode.activitiesEnd));
    //var taskId = fiveDaysTargetTask[index];
    //var taskDataConfig =  c_task[taskId];
    //if (!taskDataConfig)
        //return cb("找不到对应任务");
    //判断是否完成相应任务
    heroDao.listCols(client, "id,wingSumLvl,gemSumLvl,realmSumLvl", "userId = ?", [usrData.id] ,function(err, heroList) {
        var wingSumLvl = 0;
        var gemSumLvl = 0;
        var realmSumLvl = 0;
        for(var i = 0;i<heroList.length;i++){
            var heroData = heroList[i];
            if(heroData.wingSumLvl) wingSumLvl += parseInt(heroData.wingSumLvl);
            if(heroData.gemSumLvl) gemSumLvl += parseInt(heroData.gemSumLvl);
            if(heroData.realmSumLvl) realmSumLvl += parseInt(heroData.realmSumLvl);
        }
        wingSumLvl = parseInt(wingSumLvl/100);
        realmSumLvl = parseInt(realmSumLvl/100);
        //判断任务是否达成
        var value = 0;
        var reString  = "";
        var needValue = 99999999;
        switch(index){
            case 0:
            {
                value = wingSumLvl;
                reString = c_game.newFourRank[12];
                needValue = c_game.newFourNeedValue[0];
                break;
            }
            case 1:
            {
                value = gemSumLvl;
                reString = c_game.newFourRank[13];
                needValue = c_game.newFourNeedValue[1];
                break;
            }
            case 2:
            {
                value = realmSumLvl;
                reString = c_game.newFourRank[14];
                needValue = c_game.newFourNeedValue[2];
                break;
            }
            case 3:
            {
                value = usrData.combat;
                reString = c_game.newFourRank[15];
                needValue = c_game.newFourNeedValue[3];
                break;
            }
            default :
                return cb("参数错误");
                break;
        }
        if (value < needValue)
            return cb(getMsg(c_msgCode.goalNotGet));
        //update
        //更新领取次数
        receiveData[index] = 1;
        usrData.activity[activityData.activity.id] = receiveData;
        var strs = reString.split(",");
        for (var j =0; j < strs.length; j += 2) {
            if(t_item[strs[j]]) items[strs[j]] = parseInt(strs[j+1]);
        }

        //得到物品
        cb(null, [items]);
    });
};

//探宝
_receiveFun[c_prop.activityTypeKey.lottery] = function (client, userData, activityData, index, cb) {
    checkRequire();
/*
    3.	探宝抽库规则：

    a)	探宝1次：读取配置【c_lottery(抽宝箱表)】库1普通抽奖
    b)	探宝10次（指按钮，不是累积）：读取配置【c_lottery(抽宝箱表)】库2十次抽奖
    c)	探宝累积5次必中：读取配置【c_lottery(抽宝箱表)】库3抽奖必得
    d)	探宝10连抽：必中读取配置【c_lottery(抽宝箱表)】库4抽奖必得
    e)	探宝1次：读取配置【c_lottery(抽宝箱表)】库1权重获取物品
    f)	探宝10次：2库加7个+3库加2个+4库加1个
*/

    //获取对应的数据
    var items = {};
    var lotteryItemsArr = [];
    if (index != 1 && index != 10) return cb("参数错误");
    //必掉金币
    var willFall = {};
    willFall[c_prop.spItemIdKey.gold] = parseInt(c_game.lotteryWillFall[0])*parseInt(index);
    items = propUtils.mergerProp(items,willFall);
    lotteryItemsArr = lotteryItemsArr.concat(willFall);

    var receiveData = userData.activity[activityData.activity.id] || [];
    //领取次数
    var receiveCount = receiveData[index] || 0;
    var costDiamond = 999999999;
    var prop = c_game.lotteryCostCfg[8] || 1;
    if(index==10){
        //消耗钻石

        costDiamond = c_game.lotteryCostCfg[1]*prop;
        //探宝10次：2库加7个+3库加2个+4库加1个
        var random2Data = _getLotteryItems(2,7,userData.lvl);
        var random3Data = _getLotteryItems(3,2,userData.lvl);
        var random4Data = _getLotteryItems(4,1,userData.lvl);

        items = propUtils.mergerProp(items,random2Data[0]);
        items = propUtils.mergerProp(items,random3Data[0]);
        items = propUtils.mergerProp(items,random4Data[0]);
        lotteryItemsArr = lotteryItemsArr.concat(random2Data[1]);
        lotteryItemsArr = lotteryItemsArr.concat(random3Data[1]);
        lotteryItemsArr = lotteryItemsArr.concat(random4Data[1]);

    }else if(index==1){
        costDiamond = c_game.lotteryCostCfg[0]*prop;

        //消耗钻石
        var randomData;
        if(receiveCount==0){
            randomData = _getLotteryItems(5,1,userData.lvl);
        }else if((receiveCount+1)%5==0){
            randomData = _getLotteryItems(3,1,userData.lvl);
        }else{
            randomData = _getLotteryItems(1,1,userData.lvl);
        }
        items = propUtils.mergerProp(items,randomData[0]);
        lotteryItemsArr = lotteryItemsArr.concat(randomData[1]);
    }
    //判断钻石是否足够
    if (userData.diamond < costDiamond) return cb(getMsg(c_msgCode.noDiamond));
    userUtils.reduceDiamond(userData,costDiamond);
    //items
    //推送系统消息(oldma)
    //第一个%s：玩家名
    //第二个%s：物品名
    for(var key in items){
        var locItemData = t_item[key];
        chatBiz.addSysData(14,[userData.nickName,locItemData.name,locItemData.color]);
        chatBiz.addSysData(23,[userData.nickName,locItemData.name,locItemData.color]);
    }

    //更新领取次数
    receiveCount++;
    receiveData[index] = receiveCount;
    userData.activity[activityData.activity.id] = receiveData;

    //得到物品
    cb(null, [items,lotteryItemsArr]);
};

//神秘商店
_receiveFun[c_prop.activityTypeKey.mysterShop] = function (client, userData, activityData, index, cb) {
    checkRequire();
    index = parseInt(index);
    //获取对应的数据
    var exValues =  activityData.activity.exValues;
    if (!exValues[0]) return cb("参数错误");
    var mysterShopId = exValues[0];
    if (!c_mysterShop[mysterShopId]) return cb("参数错误");
    var mysterShop = c_mysterShop[mysterShopId];
    if(mysterShop.type != 1)  return cb("参数错误");
    if(!userData.activity[activityData.activity.id]){
        userData.activity[activityData.activity.id] = [0,[],new Date()];        //[积分,[领取次数,领取次数,领取次数],积分最后获得时间]
    }else{
        if(userData.activity[activityData.activity.id][2]){
            var actTime = userData.activity[activityData.activity.id][2];
            if(activityData.activity.startTime){        //判断积分是否是本次活动积分
                //不在时间范围内
                if(activityData.activity.startTime.isAfter(actTime)||activityData.activity.endTime.isBefore(actTime)){
                    userData.activity[activityData.activity.id] = [0,[],new Date()];
                }
            }
        }
    }
    var receiveData = userData.activity[activityData.activity.id];

    var integral = 0;       //积分
    var needIntegral = 999999;      //需要积分
    var getNumber = 0;      //领取次数
    var items = {};
    var lotteryItemsArr = [];
    switch (index){
        case 0:
            items[mysterShop.integralItem1[0][0]]=mysterShop.integralItem1[0][1];
            needIntegral = mysterShop.integralItem1[0][2];
            break;
        case 1:
            items[mysterShop.integralItem2[0][0]]=mysterShop.integralItem2[0][1];
            needIntegral = mysterShop.integralItem2[0][2];
            break;
        case 2:
            items[mysterShop.integralItem3[0][0]]=mysterShop.integralItem3[0][1];
            needIntegral = mysterShop.integralItem3[0][2];
            break;
    }
    lotteryItemsArr.push(items);
    if(receiveData[0]) integral=receiveData[0];
    if(receiveData[1][index]) getNumber=receiveData[1][index];
    if(integral<needIntegral) return cb(getMsg(c_msgCode.noIntegral));

    //积分扣除
    userData.activity[activityData.activity.id][0] = integral-needIntegral;
    //更新领取次数
    userData.activity[activityData.activity.id][1][index] = getNumber+1;

    for(var key in items){
        var locItemData = t_item[key];
        chatBiz.addSysData(33,[userData.nickName,locItemData.color,locItemData.name]);
    }

    //得到物品
    cb(null, [items,lotteryItemsArr]);
};

//指定物品神秘商店
_receiveFun[c_prop.activityTypeKey.appMysterShop] = function (client, userData, activityData, index, cb) {
    checkRequire();
    var indexArr = index.split(",");
    if(indexArr.length != 2) return cb("参数错误");
    var index = parseInt(indexArr[0]);
    var itemIndex = indexArr[1];

    //获取对应的数据
    var exValues =  activityData.activity.exValues;
    if (!exValues[0]) return cb("参数错误");
    var mysterShopId = exValues[0];
    if (!c_mysterShop[mysterShopId]) return cb("参数错误");
    var mysterShop = c_mysterShop[mysterShopId];
    if(mysterShop.type != 2)  return cb("参数错误");
    if(!userData.activity[activityData.activity.id]){
        userData.activity[activityData.activity.id] = [0,[],new Date()];        //[积分,[领取次数,领取次数,领取次数],积分最后获得时间]
    }else{
        if(userData.activity[activityData.activity.id][2]){
            var actTime = userData.activity[activityData.activity.id][2];
            if(activityData.activity.startTime){        //判断积分是否是本次活动积分
                //不在时间范围内
                if(activityData.activity.startTime.isAfter(actTime)||activityData.activity.endTime.isBefore(actTime)){
                    userData.activity[activityData.activity.id] = [0,[],new Date()];
                }
            }
        }
    }
    var receiveData = userData.activity[activityData.activity.id];

    var integral = 0;       //积分
    var needIntegral = 999999;      //需要积分
    var items = {};
    var lotteryItemsArr = [];
    switch (index){
        case 0:
            if(!mysterShop.integralItem1[itemIndex]) return cb("参数错误");
            var itemId = mysterShop.integralItem1[itemIndex][0];
            if(!t_item[itemId]) return cb("参数错误");
            items[itemId]=mysterShop.integralItem1[itemIndex][1]||1;
            needIntegral = mysterShop.integralItem1[itemIndex][2]||999999;
            break;
        case 1:
            if(!mysterShop.integralItem2[itemIndex]) return cb("参数错误");
            var itemId = mysterShop.integralItem2[itemIndex][0];
            if(!t_item[itemId]) return cb("参数错误");
            items[itemId]=mysterShop.integralItem2[itemIndex][1]||1;
            needIntegral = mysterShop.integralItem2[itemIndex][2]||999999;
            break;
        case 2:
            if(!mysterShop.integralItem3[itemIndex]) return cb("参数错误");
            var itemId = mysterShop.integralItem3[itemIndex][0];
            if(!t_item[itemId]) return cb("参数错误");
            items[itemId]=mysterShop.integralItem3[itemIndex][1]||1;
            needIntegral = mysterShop.integralItem3[itemIndex][2]||999999;
            break;
        default :
            return cb("参数错误");
            break;
    }
    lotteryItemsArr.push(items);
    if(receiveData[0]) integral=receiveData[0];
    if(integral<needIntegral) return cb(getMsg(c_msgCode.noIntegral));

    //积分扣除
    userData.activity[activityData.activity.id][0] = integral-needIntegral;
    //更新领取次数
    if(!userData.activity[activityData.activity.id][1][0]) userData.activity[activityData.activity.id][1][0] = {};
    if(!userData.activity[activityData.activity.id][1][0][itemId]) userData.activity[activityData.activity.id][1][0][itemId] = 0;
    userData.activity[activityData.activity.id][1][0][itemId] += items[itemId];

    for(var key in items){
        var locItemData = t_item[key];
        chatBiz.addSysData(33,[userData.nickName,locItemData.color,locItemData.name]);
    }

    //得到物品
    cb(null, [items,lotteryItemsArr]);
};

//幸运卡罗牌
_receiveFun[c_prop.activityTypeKey.luckyTalos] = function (client, userData, activityData, index, cb) {
    checkRequire();
    index = parseInt(index);
    //获取对应的数据
    var items = {};
    var lotteryItemsArr = [];
    var delBag = {};
    var exValues =  activityData.activity.exValues;
    if (!exValues[0]) return cb("参数错误");
    var costValue = exValues[0];//价格  (未必是元宝)
    var exData =  activityData.activity.exData;
    var spItemId = exData[c_prop.activityExDataTypeKey.spItemId]
    if(!spItemId) return cb("参数错误");
    if(spItemId == c_prop.spItemIdKey.gold){
        if (userData.gold < costValue) return cb(getMsg(c_msgCode.noGolds));
        userUtils.addGold(userData, costValue*-1);
    }else if(spItemId == c_prop.spItemIdKey.diamond){
        //判断钻石是否足够
        if (userData.diamond < costValue) return cb(getMsg(c_msgCode.noDiamond));
        userUtils.reduceDiamond(userData,costValue);
    }else {
        var bag = userData.bag || {};
        if(bag[spItemId] < costValue) return cb("材料不足");
        bag[spItemId] -= costValue;
        delBag[spItemId] = -costValue;
    }

    //获得翻牌结果
    var lotteryItemsArr = [];
    var luckyTalosItemArr = _getLuckyTalosItems(index, spItemId, userData, activityData, c_luckyTalos, 4) || [];
    var dropId = luckyTalosItemArr[index];
    if(!c_luckyTalos[dropId]){
        return cb(dropId+"  不存在");
    }
    var itemID = c_luckyTalos[dropId].itemID;
    items[itemID] = c_luckyTalos[dropId].amount;
    if(t_item[itemID].type == c_prop.itemTypeKey.gift){
        var colorStr = "orange";
        if(t_item[itemID].color == c_prop.equipColorKey.blue) colorStr = "0x1e6fff";      //蓝色
        if(t_item[itemID].color == c_prop.equipColorKey.purple) colorStr = "0x6800ca";      //紫色
        if(t_item[itemID].color == c_prop.equipColorKey.red) colorStr = "red";
        chatBiz.addSysData(87,[userData.nickName,colorStr,t_item[itemID].name]);
        chatBiz.addSysData(88,[userData.nickName,colorStr,t_item[itemID].name]);
    }
    if(t_item[itemID].type == c_prop.itemTypeKey.medal){
        var colorStr = "orange";
        if(t_item[itemID].color == c_prop.equipColorKey.green) colorStr = "0x00b654";      //绿色
        if(t_item[itemID].color == c_prop.equipColorKey.blue) colorStr = "0x1e6fff";      //蓝色
        if(t_item[itemID].color == c_prop.equipColorKey.purple) colorStr = "0x6800ca";      //紫色
        if(t_item[itemID].color == c_prop.equipColorKey.red) colorStr = "red";
        chatBiz.addSysData(93,[userData.nickName,colorStr,t_item[itemID].name]);
        chatBiz.addSysData(94,[userData.nickName,colorStr,t_item[itemID].name]);
    }
    if(itemID > 6000 && itemID < 7000){
        treasureUtils.addTreasure(client, userData, items);
    }
    _addExItem(items);
    cb(null, [items,lotteryItemsArr, luckyTalosItemArr, delBag]);
};

//限购商店
_receiveFun[c_prop.activityTypeKey.limitPanicBuying] = function (client, userData, activityData, index, cb) {
    checkRequire();
    var exData =  activityData.activity.exData;
    var vipLimit = exData[c_prop.activityExDataTypeKey.vipLimitLvl];
    var fnName = exData[c_prop.activityExDataTypeKey.funcName];
    if(fnName && typeof formula[fnName] == "function") {
        var vipEnable = formula[fnName](userData.vip, parseInt(vipLimit));
        if(!vipEnable){
            return cb("vip"+vipLimit+"以上才可购买");
        }
    }else if(vipLimit){
        if(userData.vip < vipLimit){
            return cb("vip"+vipLimit+"以上才可购买");
        }
    }
    index = parseInt(index);
    var receiveCount = userData.activity[activityData.activity.id]|| 0;
    if(isNaN(receiveCount)){
        receiveCount = 0;
    }
    //已经领取过
    var limitCount = activityData.activityItems[0].limitNum;
    if(receiveCount>= limitCount) return cb("购买次数已用完");
    var items = {};
    var lotteryItemsArr = [];
    var luckyTalosItemArr = [];
    var delBag = {};
    var exValues =  activityData.activity.exValues;
    if (!exValues[0]) return cb("参数错误");
    var costValue = exValues[0];//价格  (未必是元宝)

    var spItemId = exData[c_prop.activityExDataTypeKey.spItemId];
    if(!spItemId) return cb("参数错误");
    if(spItemId == c_prop.spItemIdKey.gold){
        if (userData.gold < costValue) return cb(getMsg(c_msgCode.noGolds));
        userUtils.addGold(userData, costValue*-1);
    }else if(spItemId == c_prop.spItemIdKey.diamond){
        //判断钻石是否足够
        if (userData.diamond < costValue) return cb(getMsg(c_msgCode.noDiamond));
        userUtils.reduceDiamond(userData,costValue);
    }else {
        var bag = userData.bag || {};
        var own = bag[spItemId] || 0;
        if(own < costValue) return cb("材料不足");
        bag[spItemId] -= costValue;
        delBag[spItemId] = -costValue;
    }
    userData.activity[activityData.activity.id] = receiveCount+1;
    //
    for(var key in activityData.activity.items){
        var itemsIndex = activityData.activity.items[key];
        for(var itemId in itemsIndex){
            var num = items[itemId]|| 0;
            items[itemId] = num + parseInt(itemsIndex[itemId]);
        }
    }
    //items = activityData.activity.items[index];
    return cb(null, [items,lotteryItemsArr, luckyTalosItemArr, delBag]);
};

//天天充值
_receiveFun[c_prop.activityTypeKey.everydayCharge] = function (client, userData, activityData, index, cb) {
    checkRequire();
    index = parseInt(index);
    var receiveData = userData.activity[activityData.activity.id] || [];
    var day = activityData.days || 0;//充值天数 从1开始
    if(index +1 > day){
        return cb("目标未达成");
    }
    var receiveCount = receiveData[index] || 0;
    if(receiveCount){
        return cb(getMsg(c_msgCode.goalNotGet));
    }
    var items = {};
    var rewardData = c_everydayCharge[index+1] || {};
    if(!rewardData.awardId){
        return cb("参数有误");
    }
    for(var i=0; i<rewardData.awardId.length; i++){
        var item = rewardData.awardId[i];
        items[item[0]] = item[1];
    }
    receiveData[index] = 1;
    userData.activity[activityData.activity.id] = receiveData;
    return cb(null, [items]);
};

//充值返利
_receiveFun[c_prop.activityTypeKey.rebate] = function(client, userData, activityData, index, cb){
    checkRequire();
    index = parseInt(index);
    var itemData = activityData.activityItems[index];
    if(!itemData) return cb("indesx:"+index,参数有误);
    var items = itemData.items;
    var receiveData = userData.activity[activityData.activity.id] || [];
    var r = receiveData[1] || [];
    if (r[index] && r[index] == 1) {
        return cb(getMsg(c_msgCode.activitiesEnd));
    }
    var needCost = itemData.diamond;
    var allCost = activityData.allCost;
    if(allCost < needCost){
        return cb("累计消费达不到条件");
    }
    r[index] = 1;
    receiveData[1] = r;
    userData.activity[activityData.activity.id] = receiveData;
    return cb(null, [items]);
};


//每日累充
/*_receiveFun[c_prop.activityTypeKey.dayRecharge] = function(client, userData, activityData, index, cb){
    checkRequire();
    index = parseInt(index);
    var itemData = activityData.activityItems[index];
    var days = activityData.days;
    if(!itemData) return cb("indesx:"+index,参数有误);
    var items = itemData.items;
    var revieData = userData.activity[activityData.activity.id] || [];
    var r = revieData[days] || [];
    if (r[index] && r[index] == 1) {
        return cb(getMsg(c_msgCode.activitiesEnd));
    }
    var needRecharge = itemData.rmb;
    var todayRecharge = activityData.todayRecharge;
    if(todayRecharge < needRecharge){
        return cb("今日充值达不到条件");
    }
    r[index] = 1;
    revieData[days] = r;
    userData.activity[activityData.activity.id] = revieData;
    return cb(null, [items]);
}*/
//集字送礼
_receiveFun[c_prop.activityTypeKey.setTheWord] = function(client, userData, activityData, index, cb){
    checkRequire();
    index = parseInt(index);
    var itemData = activityData.activityItems[index];
    if(!itemData) return cb("indesx:"+index+"参数有误");
    var bag = userData.bag || {};
    var items = itemData.items;
    var needBag = activityData.activity.exValues[index];//集字条件
    if(!needBag) return cb("后台配置有误");
    var revieData = userData.activity[activityData.activity.id] || [];
    var r = revieData[index] || 0;//已兑换次数
    var delBag = {};
    for(var key in needBag){
        var costValue = needBag[key]
        var own = bag[key] || 0;
        if(own < costValue)
        return cb("材料不足");
        bag[key] -= costValue;
        delBag[key] = -costValue;
    }
    r += 1;
    revieData[index] = r;
    userData.activity[activityData.activity.id] = revieData;
    return cb(null, [items,[],[],delBag]);
};

//V计划
_receiveFun[c_prop.activityTypeKey.vPlan] = function(client, userData, activityData, index, cb){
    checkRequire();
    var now = new Date();
    index = parseInt(index);
    var vipIndex = 0;
    var creatDay = 30;
    if(index <=1){
        vipIndex = 0;
    }else {
        vipIndex = 1;
    }
    var needVip = c_game.vPlanCfg[vipIndex];
    creatDay = c_game.vPlanCfg[vipIndex+2];
    if(now.isBefore(new Date(userData.creatTime).clone().addDays(creatDay))) {
        return cb("需要至少创角"+creatDay+"天才可领取");
    }
    if(userData.vip <needVip){
        return cb("vip "+needVip+"级，才可领取");
    }
    var itemData = activityData.activityItems[index];
    if(!itemData) return cb("index:"+index+"参数有误");
    var items = itemData.items;
    var needArr = activityData.activity.exValues[index];//V计划需要条件
    if(!needArr) return cb("后台配置有误");
    var revieData = userData.activity[activityData.activity.id] || [];
    var r = revieData[index] || 0;//已兑换次数
    if(r){
        return cb(getMsg(c_msgCode.activitiesEnd));
    }
    if(activityData.rmb < needArr[1]){
        return cb("单笔充值金额不足");
    }

    r = 1;
    revieData[index] = r;
    userData.activity[activityData.activity.id] = revieData;
    return cb(null, [items]);
};

//幸运麻将牌
_receiveFun[c_prop.activityTypeKey.luckyMajong] = function (client, userData, activityData, index, cb) {
    checkRequire();
    index = parseInt(index);
    //获取对应的数据
    var items = {};
    var lotteryItemsArr = [];
    var delBag = {};
    var exValues =  activityData.activity.exValues;
    var exValues3 = activityData.activity.exValues3;
    if (!exValues[0]) return cb("参数错误");
    if(exValues3.length != 2){return cb("配置错误")}
    var addLuck = exValues3[0];
    var maxLuck = exValues3[1];
    var costValue = exValues[0];//价格  (未必是元宝)
    var exData =  activityData.activity.exData;
    var spItemId = exData[c_prop.activityExDataTypeKey.spItemId]
    if(!spItemId) return cb("参数错误");
    if(spItemId == c_prop.spItemIdKey.gold){
        if (userData.gold < costValue) return cb(getMsg(c_msgCode.noGolds));
        userUtils.addGold(userData, costValue*-1);
    }else if(spItemId == c_prop.spItemIdKey.diamond){
        //判断钻石是否足够
        if (userData.diamond < costValue) return cb(getMsg(c_msgCode.noDiamond));
        userUtils.reduceDiamond(userData,costValue);
    }else {
        var bag = userData.bag || {};
        if(bag[spItemId] < costValue) return cb("材料不足");
        bag[spItemId] -= costValue;
        delBag[spItemId] = -costValue;
    }

    //获得翻牌结果
    var lotteryItemsArr = [];
    var rare = {};
    var luckyTalosItemArr = _getLuckyTalosItems(index, spItemId, userData, activityData, c_luckyMajong, 6, rare) || [];
    var dropId = luckyTalosItemArr[index];
    if(!c_luckyMajong[dropId]){
        return cb(dropId+"  不存在");
    }
    var exItem = {};
    items[c_luckyMajong[dropId].itemID] = c_luckyMajong[dropId].amount;
    var revieCount = userData.activity[activityData.activity.id] || 0;
    revieCount += addLuck;
    if(revieCount >= maxLuck){//获得稀有物品
        var exDropId = _getWeightItem(rare);
        if(exDropId && c_luckyMajong[exDropId]){
            items[c_luckyMajong[exDropId].itemID] = c_luckyMajong[exDropId].amount;
            exItem[c_luckyMajong[exDropId].itemID] = c_luckyMajong[exDropId].amount;
            revieCount -= maxLuck;
        }
    }
    userData.activity[activityData.activity.id] = revieCount;
    treasureUtils.addTreasure(client, userData, items);
    _addExItem(items);
    cb(null, [items,lotteryItemsArr, luckyTalosItemArr, delBag, exItem]);
};


//用户调研
_receiveFun[c_prop.activityTypeKey.userSurvey] = function (client, userData, activityData, index, cb) {
    checkRequire();
    index = parseInt(index);
    //获取对应的数据
    var itemData = activityData.activityItems[index];
    var exValues =  activityData.activity.exValues;
    //var items = itemData.items;
    var recieve = userData.activity[activityData.activity.id] || 0;
    if(recieve == 0) {
        return cb("请先填写用户调研");
    }
    if(recieve == 1){
        return cb(getMsg(c_msgCode.activitiesEnd));
    }
    if(recieve == 2){
        userData.activity[activityData.activity.id] = 1;
    }else {
        return cb("用户活动状态异常");
    }

    var items = {};
    for(var key in activityData.activity.items){
        var itemsIndex = activityData.activity.items[key];
        for(var itemId in itemsIndex){
            var num = items[itemId]|| 0;
            items[itemId] = num + parseInt(itemsIndex[itemId]);
        }
    }

    cb(null, [items]);
};

//新幸运麻将牌
_receiveFun[c_prop.activityTypeKey.newLuckyMajong] = function (client, userData, activityData, index, cb) {
    checkRequire();
    index = parseInt(index);
    //获取对应的数据
    var items = {};
    var lotteryItemsArr = [];
    var delBag = {};
    var exValues =  activityData.activity.exValues;
    var exValues3 = activityData.activity.exValues3;
    if (!exValues[0]) return cb("参数错误");
    if(exValues3.length != 2){return cb("配置错误")}
    var addLuck = exValues3[0];
    var maxLuck = exValues3[1];
    var costValue = exValues[0];//价格  (未必是元宝)
    var exData =  activityData.activity.exData;
    var revieData = userData.activity[activityData.activity.id] || [0,[0,new Date()]];//幸运值，[参与次数,参与日期]
    var freeDay = exData[c_prop.activityExDataTypeKey.freeDay];
    var totalDay = exData[c_prop.activityExDataTypeKey.totalDay];
    var spItemId = exData[c_prop.activityExDataTypeKey.spItemId];
    if(!spItemId) return cb("参数错误");
    var count = _getTodayCount(revieData[1]);
    if(count >= totalDay){
        return cb("今日参与次数已用完");
    }
    if(count >= freeDay) {
        if (spItemId == c_prop.spItemIdKey.gold) {
            if (userData.gold < costValue) return cb(getMsg(c_msgCode.noGolds));
            userUtils.addGold(userData, costValue * -1);
        } else if (spItemId == c_prop.spItemIdKey.diamond) {
            //判断钻石是否足够
            if (userData.diamond < costValue) return cb(getMsg(c_msgCode.noDiamond));
            userUtils.reduceDiamond(userData, costValue);
        } else {
            var bag = userData.bag || {};
            if (bag[spItemId] < costValue) return cb("材料不足");
            bag[spItemId] -= costValue;
            delBag[spItemId] = -costValue;
        }
    }

    //获得翻牌结果
    var lotteryItemsArr = [];
    var rare = {};
    var luckyTalosItemArr = _getLuckyTalosItems(index, spItemId, userData, activityData, c_luckyMajong, 0, rare) || [];
    var dropId = luckyTalosItemArr[index];
    if(!c_luckyMajong[dropId]){
        return cb(dropId+"  不存在");
    }
    var exItem = {};
    items[c_luckyMajong[dropId].itemID] = c_luckyMajong[dropId].amount;
    if(c_luckyMajong[dropId].color >= 5){
        chatBiz.addSysData(95, [userData.nickName,t_item[c_luckyMajong[dropId].itemID].name]);
    }
    revieData[0] += addLuck;
    revieData[1][0] += 1;
    if(revieData[0] >= maxLuck){//获得稀有物品
        var exDropId = _getWeightItem(rare);
        if(exDropId && c_luckyMajong[exDropId]){
            items[c_luckyMajong[exDropId].itemID] = c_luckyMajong[exDropId].amount;
            exItem[c_luckyMajong[exDropId].itemID] = c_luckyMajong[exDropId].amount;
            revieData[0] -= maxLuck;
        }
    }
    userData.activity[activityData.activity.id] = revieData;
    treasureUtils.addTreasure(client, userData, items);
    _addExItem(items);
    cb(null, [items,lotteryItemsArr, luckyTalosItemArr, delBag, exItem]);
};


//新限购商店
_receiveFun[c_prop.activityTypeKey.newLimitPanicBuying] = function (client, userData, activityData, index, cb) {
    checkRequire();
    var exData =  activityData.activity.exData;
    var vipLimit = exData[c_prop.activityExDataTypeKey.vipLimitLvl];
    var fnName = exData[c_prop.activityExDataTypeKey.funcName];
    if(fnName && typeof formula[fnName] == "function") {
        var vipEnable = formula[fnName](userData.vip, parseInt(vipLimit));
        if(!vipEnable){
            return cb("vip"+vipLimit+"以上才可购买");
        }
    }else if(vipLimit){
        if(userData.vip < vipLimit){
            return cb("vip"+vipLimit+"以上才可购买");
        }
    }
    index = parseInt(index);
    var revieData = userData.activity[activityData.activity.id] || [0,new Date()];//[参与次数,参与日期]
    var totalDay = exData[c_prop.activityExDataTypeKey.totalDay];
    var count = _getTodayCount(revieData);
    if(count >= totalDay){
        return cb("今日购买次数已用完");
    }
    var items = {};
    var lotteryItemsArr = [];
    var luckyTalosItemArr = [];
    var delBag = {};
    var exValues =  activityData.activity.exValues;
    if (!exValues[0]) return cb("参数错误");
    var costValue = exValues[0];//价格  (未必是元宝)

    var spItemId = exData[c_prop.activityExDataTypeKey.spItemId];
    if(!spItemId) return cb("参数错误");
    if(spItemId == c_prop.spItemIdKey.gold){
        if (userData.gold < costValue) return cb(getMsg(c_msgCode.noGolds));
        userUtils.addGold(userData, costValue*-1);
    }else if(spItemId == c_prop.spItemIdKey.diamond){
        //判断钻石是否足够
        if (userData.diamond < costValue) return cb(getMsg(c_msgCode.noDiamond));
        userUtils.reduceDiamond(userData,costValue);
    }else {
        var bag = userData.bag || {};
        var own = bag[spItemId] || 0;
        if(own < costValue) return cb("材料不足");
        bag[spItemId] -= costValue;
        delBag[spItemId] = -costValue;
    }
    revieData[0] +=1;
    userData.activity[activityData.activity.id] = revieData;
    //
    for(var key in activityData.activity.items){
        var itemsIndex = activityData.activity.items[key];
        for(var itemId in itemsIndex){
            var num = items[itemId]|| 0;
            items[itemId] = num + parseInt(itemsIndex[itemId]);
        }
    }
    //items = activityData.activity.items[index];
    return cb(null, [items,lotteryItemsArr, luckyTalosItemArr, delBag]);
};


/************************************************************************************************/
var _getWeightItem = function(weightArr){
    var exDropId = 0;
    var weightTotal = 0;
    for(var id in weightArr){
        weightTotal += weightArr[id];
    }
    var randNum = _getRandomNumber(0, weightTotal);
    var curWeight = 0;
    for(var id in weightArr){
        curWeight += weightArr[id]
        if(randNum <= curWeight){
            exDropId = id;
            break;
        }
    }
    return exDropId;
}

var _getLuckyTalosItems = function(index, spItemId, userData, activityData, c_data, amount, rare){
    var userActivityData = userData.activity[activityData.activity.id]|| {};
    //计算全概率，类别3组，其他组
    var itemArr = [];
    var weightTotal = 0;
    var item3Arr = [];
    var itemNo3Arr = [];
    var itemAllArr = [];
    var subType = activityData.activity.exData[c_prop.activityExDataTypeKey.subType] || 0;
    var now = new Date();
    for(var id in c_data){
        var luckyTalos = c_data[id];
        if(luckyTalos.spItemId != spItemId || luckyTalos.subType != subType)
            continue;
        var lvGroup = luckyTalos.subTypeDivide || [0,999];
        if(userData.lvl < lvGroup[0] || userData.lvl > lvGroup[1])
            continue;
        //检测是否已经超出掉落数量限制
        if(luckyTalos.itemLimit != 0) {
            var recevieData = userActivityData[id] || [0, 0];
            var recevieDate;
            if(recevieData[0]){
                recevieDate = new Date(recevieData[0]);
            }else {
                recevieDate = now;
            }
            var recevieCount = recevieData[1];
            console.log(id);
            if (recevieDate.isBefore(now) && recevieDate.clone().addHours(24).isAfter(now) && recevieCount >= luckyTalos.itemLimit)
                continue;
        }
        itemAllArr.push(id);
        if(!amount){
            amount = luckyTalos.cardCount;
        }
        weightTotal += luckyTalos.weight;
        if(luckyTalos.class == 1){
            if(luckyTalos.color >= 3){
                item3Arr.push(id);
            }else {
                itemNo3Arr.push(id);
            }
        }
        if(luckyTalos.ifRare){
            rare[luckyTalos.id] = luckyTalos.weight;
        }
    }

    //掉落
    var randNum = _getRandomNumber(0, weightTotal);
    var dropId = 0;
    var curWeight = 0;
    for(var i = 0; i < itemAllArr.length; i++){
        var id = itemAllArr[i];
        var luckyTalos = c_data[id];
        if(luckyTalos.spItemId != spItemId|| luckyTalos.subType != subType)
            continue;
        curWeight += luckyTalos.weight;
        if(randNum <= curWeight){
            dropId = id;
            break;
        }
    }
    if(c_data[dropId] && c_data[dropId].itemLimit != 0){
        var recevieData = userActivityData[dropId] || [0, 0];
        var recevieDate;
        if(recevieData[0]){
            recevieDate = new Date(recevieData[0]);
        }else {
            recevieDate = now;
        }
        if(recevieDate.clone().addHours(24).isBefore(now)){
            recevieData[1] = 0;
            recevieData[0] =now;
        }
        recevieData[1] += 1;
        userActivityData[dropId] = recevieData;
        userData.activity[activityData.activity.id] = userActivityData;
    }

    //掉落展示物品
    var dropIndex = item3Arr.indexOf(dropId);
    if(dropIndex != -1){
        item3Arr.splice(dropIndex, 1);
    }
    var tempArr = _genknuth(amount-2, item3Arr);
    dropIndex = itemNo3Arr.indexOf(dropId);
    if(dropIndex != -1){
        itemNo3Arr.splice(dropIndex, 1);
    }
    var lastId = _genknuth(1, itemNo3Arr);
    tempArr.push(lastId[0]);
    for(var i= 0,j=0; i<amount ;i++){
        if(i != index){
            itemArr[i] = tempArr[j];
            j++
        }else {
            itemArr[i] = dropId;
        }
    }
    return itemArr;
};


var _genknuth = function(m, srcArr){
    var desArr = [];
    var n = srcArr.length;
    if(n<m){
        return [];
    }else if(n == m){
        return srcArr;
    }
    for(var i=0;i<n;i++){
        if(_getRandomNumber(0, n-i-1) < m){
            m--;
            desArr.push(srcArr[i]);
        }
    }
    return srcArr;
};


var _getLotteryItems = function(type,num,userLvl){
    var items = {};
    var itemsArr = [];
    var randomArr = _getLotteryData(type,userLvl);
    var ids = [];
    if(randomArr.length<=0) return [items,itemsArr];
    for(var i =0;i<num;i++){
        var locId = commonUtils.getWeightRandomValue(randomArr);
        if(locId) ids.push(locId);
        var locLottery = c_lottery[locId];
        //itemId  minNum maxNum
        var locItemId = locLottery.itemId;
        var locItemNum = locLottery.minNum + 0| (Math.random()*(locLottery.maxNum-locLottery.minNum+1));
        var locItems = {};
        locItems[locItemId] = locItemNum;
        itemsArr.push(locItems);
        items = propUtils.mergerProp(items,locItems);
    }
    return [items,itemsArr];
};

var _getLotteryData = function(type,userLvl){
    if(Object.keys(lotteryArrData).length<=0){
        for(var key in c_lottery){
            var locData = c_lottery[key];
            var locDataArr = lotteryArrData[locData.type]||[];
            locDataArr.push(locData);
            lotteryArrData[locData.type] = locDataArr;
        }
    }
    var reList = [];
    var cutList = lotteryArrData[type]||[];
    for(var i = 0;i<cutList.length;i++){
        var locData = cutList[i];
        //限制等级
        if (userLvl < locData.needLvl) continue;
        if (locData.surpassLvl > 0 && userLvl >= locData.surpassLvl) continue;
        reList.push([locData.id,locData.rate]);
    }
    return reList;
};

//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};

/**
 * 获取每日参与活动次数
 * param activityDataDay [count,refreshTime]
 */
var _getTodayCount = function (activityDataDay) {
    var count = activityDataDay[0];
    var refreshTime = activityDataDay[1];
    if(refreshTime){
        refreshTime = new Date(refreshTime);
        if(!refreshTime.equalsDay(new Date())){
            refreshTime = new Date();
            count = 0;
        }
    }
    activityDataDay[0] = count;
    activityDataDay[1] = refreshTime;
    return count;
};

/**
 * 添加额外必的物品
 * @param items
 * @param exItem
 * @private
 */
var _addExItem = function (items) {
    var gold = items[c_prop.spItemIdKey.gold] || 0;
    items[c_prop.spItemIdKey.gold] = gold + c_game.talosWillFall[0];
}
