/**
 * Created by Administrator on 2014/5/16.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var c_task = uwData.c_task;
var c_prop = uwData.c_prop;
var c_reward = uwData.c_reward;
var c_lottery = uwData.c_lottery;
var t_itemLogic = uwData.t_itemLogic;
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var async = require("async");
var g_area = require("uw-global").g_area;
var g_data = require("uw-global").g_data;
var getMsg = require("uw-utils").msgFunc(__filename);
var TaskEntity = require('uw-entity').TaskEntity;
var taskSerial =  require('uw-serial').taskSerial;
var utils = require('uw-utils').utils;

var dsNameConsts = require("uw-data").dsNameConsts;

var userDao = null;
var userUtils = null;
var propUtils = null;
var taskDao = null;
var heroDao = null;
var itemBiz = null;
var checkRequire = function(){
    userDao = require("uw-user").userDao;
    userUtils = require("uw-user").userUtils;
    propUtils = require("uw-utils").propUtils;
    taskDao = require("uw-task").taskDao;
    heroDao = require("uw-hero").heroDao;
    itemBiz = require("uw-item").itemBiz;
};

var ds = require("uw-ds").ds;

var exports = module.exports;

//初始化数据
exports.getInfo = function(client,userId,cb){
    checkRequire();
    _getRecordData(client,userId,function(err,data){
        if (err) return cb(err);
        cb(null,data);
    });
};

/**
 * 任务奖励领取
 * @param client
 * @param userId
 * @param taskId      任务id
 * @param cb
 */
exports.taskAward = function(client,userId,taskId,cb){
    checkRequire();
    if(!c_task[taskId]) return cb("没有该成就数据");
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            _getRecordData(client,userId,cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], taskData = data[1];
        var returnItems = {};
        var nowTime = new Date();
        var needValue = c_task[taskId].targetValue;
        var dailyTasksStar = c_game.dailyTasksCfg[0];
        var dailyTasksEnd = c_game.dailyTasksCfg[1];
        var rewardId = c_task[taskId].rewardId;
        if(taskId >= dailyTasksStar && taskId <= dailyTasksEnd){        //每日 {"任务id":[完成数量,是否领取],"任务id":[完成数量,是否领取],.....}
            if(!taskData.refreshTime) return cb("未达成完成条件");
            if(!taskData.refreshTime.equalsDay(nowTime)) return cb("未达成完成条件");
            var dailyTasks = taskData.dailyTasks;
            if(dailyTasks[taskId][0] < needValue) return cb("未达成完成条件");
            if(dailyTasks[taskId][1] == 1) return cb("已领取");
            taskData.dailyTasks[taskId][1] = 1;
            taskData.vitality += c_reward[rewardId].activity;
            taskData.refreshTime = nowTime;
        }else{      //成就任务  {"子类型":数量,"子类型":数量,...}
            var tasksType = c_task[taskId].cTaskType;
            var tasksValue = taskData.tasksValue;
            if(tasksValue[tasksType] < needValue) return cb("未达成完成条件");
            var doneTasks = taskData.doneTasks||[];
            if(doneTasks.indexOf(taskId) != -1) return cb("已领取");
            doneTasks.push(taskId);
            taskData.doneTasks = doneTasks;
            var nextTaskId = taskId + 1;
            if(c_task[nextTaskId]) taskData.tasks[tasksType] = nextTaskId;
        }

        //领取奖励
        // 金币
        var gold = c_reward[rewardId].gold;
        if(gold > 0){
            userUtils.addGold(userData,gold);
            returnItems[c_prop.spItemIdKey.gold] = gold;
        }
        //钻石
        var diamond = c_reward[rewardId].diamond;
        if(diamond > 0){
            userUtils.addDiamond(userData,diamond);
            returnItems[c_prop.spItemIdKey.diamond] = diamond;
        }
        //物品
        var itemsArr = [];
        var bagItems = {};
        var equipBagItems = {};
        var items = c_reward[rewardId].rewardItems;
        if(JSON.stringify(items) != "{}") {
            itemsArr = userUtils.saveItems(userData,items);
            if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
            if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
            returnItems = propUtils.mergerProp(returnItems, items);
        }

        //更新    gold,diamond,buyDiamond,giveDiamond,bag,equipBag,prestige
        var upUserData = {
            gold : userData.gold,
            diamond : userData.diamond,
            buyDiamond : userData.buyDiamond,
            giveDiamond : userData.giveDiamond,
            bag : userData.bag,
            equipBag : userData.equipBag,
            prestige : userData.prestige
        };
        var upTaskData = {
            tasks : taskData.tasks,
            vitality : taskData.vitality,
            refreshTime : taskData.refreshTime,
            dailyTasks : taskData.dailyTasks,
            tasksValue : taskData.tasksValue,
            doneTasks : taskData.doneTasks
        };
        async.parallel([
            function(cb2){
                userDao.update(client,upUserData,{id:userId},cb2);
            },
            function(cb2){
                taskDao.update(client,upTaskData,{id:taskData.id},cb2);
            }
        ],function(err,upData) {
            if (err) return cb(err);
            delete upUserData.bag;
            delete upUserData.equipBag;
            cb(null,[upUserData,upTaskData,returnItems,c_reward[rewardId].activity,bagItems,equipBagItems,diamond]);
        });
    });
}

/**
 * 领取活跃度宝箱
 * @param client
 * @param userId
 * @param index   宝箱下标
 * @param cb
 */
exports.getVitalityChest = function(client,userId,index,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            _getRecordData(client,userId,cb1);
        }
    ],function(err,data) {
        if (err) return cb(err);
        var userData = data[0], taskData = data[1];
        var nowTime = new Date();
        if(!taskData.refreshTime) return cb("探宝值不足");
        if(!taskData.refreshTime.equalsDay(nowTime)) return cb("探宝值不足");
        var vitality = taskData.vitality;     //活跃度
        var needVitality = c_game.vitalityCfg[index];     //需要的活跃度
        if(vitality < needVitality) return cb("探宝值不足");
        var vitalityChests = taskData.vitalityChests||[0,0,0];
        if(vitalityChests[index] == 1) return cb("已领取");

        var chestId = c_game.vitalityCfg[index + 3];
        var logicItems = itemBiz.calLogicItems(chestId);        //随机的物品
        var getDiamond = 0;
        if(logicItems[c_prop.spItemIdKey.diamond]){
            getDiamond = logicItems[c_prop.spItemIdKey.diamond];
        }
        //获得物品
        var bagItems = {};
        var equipBagItems = {};
        var itemsArr = userUtils.saveItems(userData,logicItems);
        if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
        if(Object.keys(itemsArr[1]).length>0) equipBagItems = propUtils.mergerProp(equipBagItems,itemsArr[1]);
        //数据改变
        taskData.refreshTime = nowTime;
        vitalityChests[index] = 1;
        taskData.vitalityChests = vitalityChests;
        //更新
        var updateData = {
            gold: userData.gold,
            diamond: userData.diamond,
            buyDiamond:userData.buyDiamond,
            giveDiamond:userData.giveDiamond,
            bag: userData.bag,
            equipBag: userData.equipBag
        };
        var updateTaskData = {
            refreshTime:taskData.refreshTime,
            vitalityChests:taskData.vitalityChests
        };
        async.parallel([
            function (cb1) {
                userDao.update(client,updateData,{id:userId},cb1);
            },
            function (cb1) {
                taskDao.update(client,updateTaskData,{userId:userId},cb1);
            }
        ], function (err, data1) {
            if (err) return cb(err);
            delete updateData.bag;
            delete updateData.equipBag;
            return cb(null, [updateData,updateTaskData,logicItems,bagItems,equipBagItems,getDiamond]);
        });
    });
}



var dailyKeyMap = {};
dailyKeyMap[1] = 2100001;
dailyKeyMap[2] = 2100002;
dailyKeyMap[6] = 2100003;
dailyKeyMap[14] = 2100004;
dailyKeyMap[20] = 2100005;
dailyKeyMap[9] = 2100006;
dailyKeyMap[12] = 2100007;
dailyKeyMap[13] = 2100008;
dailyKeyMap[11] = 2100009;
dailyKeyMap[15] = 2100010;
dailyKeyMap[16] = 2100011;
dailyKeyMap[17] = 2100012;
dailyKeyMap[21] = 2100013;
dailyKeyMap[22] = 2100014;
dailyKeyMap[23] = 2100015;


//成就任务 （0 6 7 11）
// 7  8
//特殊成就任务    任一达到（1  2  3  5  8  10）
//特殊成就任务    通关副本（4  9 12 13）
//每日        （1 2 6 14 20 9 12 13 11 15 16）
//任务完成数据记录接口
exports.setTaskValue = function(client,userId,cTaskType,count,cb){
    checkRequire();
    taskSerial.add(userId,function(cb1){
        _setTaskValue(client,userId,cTaskType,count,function(err,data){
            cb(err,data);
            cb1(err,data);
        });
    });

}

var _setTaskValue = function(client,userId,cTaskType,count,cb){

    _getRecordData(client,userId,function(err,taskData){
        if (err) return cb(err);
        var dailyTasks = taskData.dailyTasks;       //日常任务。{"任务id":[完成数量,是否领取],"任务id":[完成数量,是否领取],.....}
        var refreshTime = taskData.refreshTime;     //日常数据最后修改时间
        var tasksValue = taskData.tasksValue;       //成就任务完成数据  {"子类型":数量,"子类型":数量,...}

        //成就任务 （6 7 11）
        if(cTaskType == c_prop.cTaskTypeKey.equipSmelt
            || cTaskType == c_prop.cTaskTypeKey.clearHero || cTaskType == c_prop.cTaskTypeKey.encounter || cTaskType == c_prop.cTaskType.wing || cTaskType == c_prop.cTaskType.rankFighting){
            var value = tasksValue[cTaskType]||0;
            taskData.tasksValue[cTaskType] = value + count;
        }
        //特殊成就任务    任一角色全身第一颗宝石+ N   （ 8 ）
        if(cTaskType == c_prop.cTaskTypeKey.heroGem){
            var value = tasksValue[cTaskType]||0;
            if(count > value) taskData.tasksValue[cTaskType] = count;
        }
        //特殊成就任务    任一达到（0  1  2  3  5  10）
        if(cTaskType == c_prop.cTaskTypeKey.personLvl || cTaskType == c_prop.cTaskTypeKey.skillLvl || cTaskType == c_prop.cTaskTypeKey.equipStrength
            || cTaskType == c_prop.cTaskTypeKey.equipUpStar || cTaskType == c_prop.cTaskTypeKey.gemUp
            || cTaskType == c_prop.cTaskTypeKey.combat){
            var value = tasksValue[cTaskType]||0;
            if(count > value) taskData.tasksValue[cTaskType] = count;
        }
        //特殊成就任务    通关副本（4 9 12 13）
        if(cTaskType == c_prop.cTaskTypeKey.closeTollGate || cTaskType == c_prop.cTaskTypeKey.equipCopy
            || cTaskType == c_prop.cTaskTypeKey.hell || cTaskType == c_prop.cTaskTypeKey.state || cTaskType == c_prop.cTaskTypeKey.guild){
            var value = tasksValue[cTaskType]||0;
            if(count > value) taskData.tasksValue[cTaskType] = count;
        }

        //每日        （1 2 6 14 20 9 12 13 11 15 16）
        if(cTaskType == c_prop.cTaskTypeKey.skillLvl || cTaskType == c_prop.cTaskTypeKey.equipStrength
            || cTaskType == c_prop.cTaskTypeKey.equipSmelt || cTaskType == c_prop.cTaskTypeKey.shopBuy
            || cTaskType == c_prop.cTaskTypeKey.chat || cTaskType == c_prop.cTaskTypeKey.equipCopy
            || cTaskType == c_prop.cTaskTypeKey.hell || cTaskType == c_prop.cTaskTypeKey.state
            || cTaskType == c_prop.cTaskTypeKey.encounter || cTaskType == c_prop.cTaskTypeKey.wingTrain
            || cTaskType == c_prop.cTaskTypeKey.rankFighting || cTaskType == c_prop.cTaskTypeKey.treasure
            || cTaskType == c_prop.cTaskTypeKey.guildCopy || cTaskType == c_prop.cTaskTypeKey.paTaLottery
            || cTaskType == c_prop.cTaskTypeKey.heartStunt){       //成就副本数据记录
            var daily = {};
            if(!refreshTime || !refreshTime.equalsDay(new Date())){
                taskData.vitality = 0;
                taskData.vitalityChests = [0,0,0];
                var dailyTasksStar = c_game.dailyTasksCfg[0];
                var dailyTasksEnd = c_game.dailyTasksCfg[1];
                for(var i = dailyTasksStar;i <= dailyTasksEnd; i++){
                    daily[i] = [0,0];
                }
            }else{
                daily = dailyTasks;
            }
            var dailyValue = 0;
            if(daily[dailyKeyMap[cTaskType]]){
                dailyValue = daily[dailyKeyMap[cTaskType]][0];
            }
            //特殊每日判断  减少更新次数
            if(cTaskType == c_prop.cTaskTypeKey.shopBuy || cTaskType == c_prop.cTaskTypeKey.wingTrain || cTaskType == c_prop.cTaskTypeKey.rankFighting
                || cTaskType == c_prop.cTaskTypeKey.chat || cTaskType == c_prop.cTaskTypeKey.treasure|| cTaskType == c_prop.cTaskTypeKey.guildCopy
                || cTaskType == c_prop.cTaskTypeKey.paTaLottery || cTaskType == c_prop.cTaskTypeKey.heartStunt){
                var targetValue = c_task[dailyKeyMap[cTaskType]].targetValue;
                if(dailyValue >= targetValue) return cb(null, {});
            }
            if(cTaskType == 6){
                daily[dailyKeyMap[cTaskType]][0] = dailyValue + count;
            }else{
                daily[dailyKeyMap[cTaskType]][0] = dailyValue + 1;
            }

            taskData.dailyTasks = daily;
            taskData.refreshTime = new Date();
        }

        //更新
        var updataData = {
            dailyTasks : taskData.dailyTasks,
            vitality : taskData.vitality,
            vitalityChests : taskData.vitalityChests,
            refreshTime : taskData.refreshTime,
            tasksValue : taskData.tasksValue
        };
        taskDao.update(client,updataData,{userId:userId},function(err,data){
            if (err) return cb(err);
            var msg = utils.transDs(updataData, dsNameConsts.TaskEntity, 0);
            g_area.pushMsgById(c_prop.receiverKey.task,{v:msg} ,userId,function(){});
            g_data.addTaskUpdateId(userId);
            cb(null, updataData);
        });
    });
};

/*****************************************************************************************************/

//判断是否有数据，无数据插入一条
var _getRecordData = function(client,userId,cb){
    taskDao.select(client,{userId:userId},function(err,taskData) {
        if(err) return cb(err);
        if(!taskData) {        //如果不存在该用户数据则插入一条
            var tasks = {};
            var tasksValue = {};
            var dailyTasks = {};
            var dailyTasksStar = c_game.dailyTasksCfg[0];
            var dailyTasksEnd = c_game.dailyTasksCfg[1];
            for(var i = dailyTasksStar;i <= dailyTasksEnd; i++){
                dailyTasks[i] = [0,0];
            }
            for(var i = 0;i <= 13; i++){
                if(i <= 10){
                    tasks[i] = c_game.honorStartCfg1[i];
                }else{
                    tasks[i] = c_game.honorStartCfg2[i-11];
                }
                tasksValue[i] = 0;
            }
            var taskEntity = new TaskEntity();
            taskEntity.userId = userId;
            taskEntity.dailyTasks = dailyTasks;
            taskEntity.vitality = 0;
            taskEntity.vitalityChests = [0,0,0];
            taskEntity.tasks = tasks;
            taskEntity.tasksValue = tasksValue;
            taskEntity.doneTasks = [];
            taskDao.insert(client, taskEntity, function(err,data){
                if(err) return cb(err);
                taskEntity.id = data.insertId;
                cb(null,taskEntity);
            });
        }else{
            cb(null,taskData);
        }
    });
};

//判断是否完成任务
var _isTask = function(userData,heroList,taskId){
    var isTask = false;
    var cTaskType = c_task[taskId].cTaskType;
    var need = c_task[taskId].targetValue;
    switch (cTaskType){
        case c_prop.cTaskTypeKey.personLvl:     //人物等级
            var lvl = userData.lvl;
            if(lvl >= need) isTask = true;
            break;
        case c_prop.cTaskTypeKey.skillLvl:      //技能等级
            var skillLvl = 0;
            for(var i = 0; i < heroList.length; i++){
                var heroData = heroList[i];
                var skillLvlArr = heroData.skillLvlArr;
                for(var ii = 0; ii < skillLvlArr.length; ii++){
                    if(skillLvlArr[ii] > skillLvl) skillLvl = skillLvlArr[ii];
                }
            }
            if(skillLvl >= need) isTask = true;
            break;
        case c_prop.cTaskTypeKey.equipStrength:      //装备强化
            var intensify = 0;
            for(var i = 0; i < heroList.length; i++){
                var heroData = heroList[i];
                var intensifyArr = heroData.intensifyArr;
                for(var ii = 0; ii < intensifyArr.length; ii++){
                    if(intensifyArr[ii] > intensify) intensify = intensifyArr[ii];
                }
            }
            if(intensify >= need) isTask = true;
            break;
        case c_prop.cTaskTypeKey.equipUpStar:      //装备升星
            var star = 0;
            for(var i = 0; i < heroList.length; i++){
                var heroData = heroList[i];
                var starArr = heroData.starArr;
                for(var ii = 0; ii < starArr.length; ii++){
                    if(starArr[ii] > star) star = starArr[ii];
                }
            }
            if(star >= need) isTask = true;
            break;
        case c_prop.cTaskTypeKey.closeTollGate:      //通关关卡
            break;
        case c_prop.cTaskTypeKey.gemUp:      //宝石升级
            var gem = 0;
            for(var i = 0; i < heroList.length; i++){
                var heroData = heroList[i];
                var gemArr = heroData.gemArr;
                for(var ii = 0; ii < gemArr.length; ii++){
                    if(gemArr[ii] > gem) gem = gemArr[ii];
                }
            }
            if(gem >= need) isTask = true;
            break;
        case c_prop.cTaskTypeKey.equipSmelt:      //熔炼装备
            break;
        case c_prop.cTaskTypeKey.clearHero:      //解锁职业
            break;
        case c_prop.cTaskTypeKey.heroGem:      //角色宝石
            for(var i = 0; i < heroList.length; i++){
                var heroData = heroList[i];
                var gemArr = heroData.gemArr;
                var isTrue = 0;
                for(var ii = 0; ii < gemArr.length; ii++){
                    if(!gemArr[ii] || gemArr[ii] < 1) isTrue = 1;
                }
                if(isTrue == 0) isTask = true;
            }
            break;
        case c_prop.cTaskTypeKey.equipCopy:      //装备副本
            break;
        case c_prop.cTaskTypeKey.combat:      //战力
            break;
        case c_prop.cTaskTypeKey.encounter:      //遭遇战
            break;
        case c_prop.cTaskTypeKey.hell:      //炼狱副本
            break;
        case c_prop.cTaskTypeKey.state:      //境界副本
            break;
    }
    return isTask;
}