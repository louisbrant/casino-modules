/**
 * Created by Administrator on 2014/5/10.
 */
var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var trans = core4Test.trans;
var uwClient = core4Test.uwClient;
var mainClient = core4Test.mainClient;

var copyProgressDao = require("uw-copy").copyProgressDao;
var equipDao = require("uw-item").equipDao;
var equipBiz = require("uw-item").equipBiz;
var heroDao = require("uw-user").heroDao;
var heroBiz = require("uw-hero").heroBiz;
var userDao = require("uw-user").userDao;
var userBiz = require("uw-user").userBiz;
var taskDao = require("uw-task").taskDao;

var t_item = require("uw-data").t_item;
var t_itemEquip = require("uw-data").t_itemEquip;
var t_hero = require("uw-data").t_hero;
var t_warrior = require("uw-data").t_warrior;
var c_prop = require("uw-data").c_prop;
var c_game = require("uw-data").c_game;
var consts = require("uw-data").consts;
var t_copy = require("uw-data").t_copy;
var t_copyPrimary = require("uw-data").t_copyPrimary;
var c_heroCall = require("uw-data").c_heroCall;
var c_lvl = require("uw-data").c_lvl;
var CopyProgressEntity = require("uw-entity").CopyProgressEntity;
var userUtils = require("uw-utils").userUtils;

var accountDao = require("../src/dao/accountDao.js");

var UserEntity = require("uw-entity").UserEntity;

var async = require("async");

var PER_NAME = "test";//账号前缀
var PWD = "111111";//密码
var ITEMS = {};

var IGNORE_HEROS = [2750,3102,3202,3453,3500];
//默认英雄
var HERO_TEMP_IDS = [];
for(var key in c_heroCall){
    var heroCall = c_heroCall[key];
    if(IGNORE_HEROS.indexOf(heroCall.id)>-1) continue;
    HERO_TEMP_IDS.push(heroCall.id);
}


//英雄碎片
for (var i = 0; i < HERO_TEMP_IDS.length; i++) {
    var locHeroTempId = HERO_TEMP_IDS[i];
    var locFragmentId = t_warrior[t_hero[locHeroTempId].tid].fragmentId;
    ITEMS[locFragmentId] = 99;
}

var HEROES_POS = [0,1,2,3,4];//默认英雄
var EQUIPS = [];//   装备

for (var key in t_item) {
    var itemData = t_item[key];
    var id = itemData.id;
    var num = (itemData.maxRepeat||1)*4;
    switch (itemData.type) {
        case c_prop.itemTypeKey.consumables:
        case c_prop.itemTypeKey.material:
            ITEMS[id] = num;
            break;
        case c_prop.itemTypeKey.equip:
            if(t_itemEquip[id])
                EQUIPS.push(id);
            break;
        case c_prop.itemTypeKey.res:
            break;
        case c_prop.itemTypeKey.heroExpItem:
            break;
        case c_prop.itemTypeKey.heroFragment:
            //ITEMS[id] = num;
            break;
    }
}

var resetInitData = function (cb) {
    //创建账号
    createAccount(function(err,accountIds){
        //创建用户
        createUser(accountIds,function(err,userIds){
            async.parallel([
                function (cb1) {
                    createHero(userIds,cb1);//创建英雄
                },
                function (cb1) {
                    createCopyProgress(userIds,cb1);//创建副本进度
                }
            ], cb);
        });
    });
};


var createAccount = function(cb){
    var accountArr = [];
    for (var i = 10000; i <= 20000; i++) {
        accountArr.push({name: PER_NAME + getReZero(5, i.toString().length) + i, pwd: PWD});
    }

    var createAccountFunArr =[];
    for (var i = 0; i < accountArr.length; i++) {
        var account =  accountArr[i];
        createAccountFunArr.push(function(cb1){
            accountDao.insert(mainClient,this,cb1);
        }.bind(account));
    }
    async.series(createAccountFunArr, function(err,data){
        if(err) return cb(err);
        var accountIds = [];
        for(var i = 0;i<data.length;i++){
            var d = data[i];
            accountIds.push(d.insertId);
        }
        cb(null,accountIds);
    });
};

var createUser = function(accountIds,cb){
    //创建用户
    var createUserFunArr = [];
    for(var i=0;i<accountIds.length;i++){
        var data = userBiz.getUserInitData(accountIds[i],"测试号"+(i+1));
        var user = data[0];
        user.bag = ITEMS;
        user.guide = [200,300];
        user.lvl = 60;
        user.expc = c_lvl[user.lvl].minTeamExpcOfLvl;
        createUserFunArr.push(function(cb1){
            userDao.insert(uwClient,this,cb1);
        }.bind(user));
    }
    async.series(createUserFunArr, function(err,data){
        if(err) return cb(err);
        var userIds = [];
        for(var i = 0;i<data.length;i++){
            var d = data[i];
            userIds.push(d.insertId);
        }
        cb(null,userIds);
    });
};

var createHero = function(userIds,cb){
    //创建英雄
    var createHeroFunArr = [];
    for(var i=0;i<userIds.length;i++){
        for(var j = 0;j<HERO_TEMP_IDS.length;j++){
           var hero =  heroBiz.initDataByTempId(null,HERO_TEMP_IDS[j]);
            hero.pos = HEROES_POS[j];
            hero.userId = userIds[i];
            hero.lvl = 60;
            hero.expc = c_lvl[hero.lvl].minExpcOfLvl;
            createHeroFunArr.push(function(cb1){
                _createAndUpdateHero(this,cb1);
            }.bind(hero));
        }
    }
    async.parallel(createHeroFunArr, cb);
};

var _createAndUpdateHero = function(heroData,cb){
    heroDao.insert(uwClient,heroData,function(err,data){
        heroData.id = data.insertId;
        heroBiz.updateAndCalCombatEff(uwClient, heroData, {id:heroData.id},cb);
    });
};

var createCopyProgress = function(userIds,cb){
    var tasks = [];
    for(var k=0;k<userIds.length;k++){
        var userId = userIds[k];
        for(var key in t_copyPrimary){
            var copyPrimary = t_copyPrimary[key];
            var firstId = copyPrimary.firstId;

            var copyArr = [];
            for (var i = firstId; i < firstId+100; i++) {
                var copyData = t_copy[i];
                if(!copyData) break;
                if(copyData.pCopyId!=copyPrimary.id)  break;
                copyArr.push(copyData.id);
            }
            var entity = new CopyProgressEntity();
            entity.pCopyId = copyPrimary.id;
            entity.copyArr = copyArr;
            entity.finished = 1;
            entity.userId = userId;
            tasks.push(function(cb1){
                copyProgressDao.insert(uwClient,this,cb1);
            }.bind(entity));
        }
    }

    async.parallel(tasks, cb);

};

var getReZero = function (max, length) {
    var ret = "";
    for (var i = 0; i < max - length; i++) {
        ret += "0";
    }
    return ret;
};

/**
 * 重置所有人的背包
 */
var resetUserBag = function(){
    userDao.update(uwClient,{bag:ITEMS},function(){});
};

//设置引导为最高
var resetUserGuide = function(){
    userDao.update(uwClient,{guide:[10000,10000],subGuide:c_game.subGuide},function(){});
};

//初始化任务
var resetUserTasks = function(){
    var dailyTasks ={},tasks={};
    for (var i = 0; i < c_game.dailyTasks.length; i++) {
        var taskId = c_game.dailyTasks[i];
        dailyTasks[taskId] = 0;
    }
    for (var i = 0; i < c_game.startTasks.length; i++) {
        var taskId = c_game.startTasks[i];
        tasks[taskId] = 0;
    }
    taskDao.update(uwClient,{dailyTasks:dailyTasks,tasks:tasks,refreshTime:null,doneTasks:null},function(){});
};

//设置引导为最高
var resetUserLvlExpc = function(){
    var tasks = [];
    for(var i = 1;i<1000;i++){
        var lvlData = c_lvl[i];
        if(!lvlData) break;
        var expc = lvlData.minTeamExpcOfLvl;
        console.log(lvlData);
        tasks.push(function(){
            userDao.update(uwClient,{expc:this.expc},{lvl:this.lvl},function(){});
        }.bind({expc:expc,lvl:i}));
    }
    async.parallel(tasks,function(){})
};

//设置引导为最高
var resetHeroLvlExpc = function(){
    var tasks = [];
    for(var i = 1;i<1000;i++){
        var lvlData = c_lvl[i];
        if(!lvlData) break;
        var expc = lvlData.minExpcOfLvl;
        tasks.push(function(){
            heroDao.update(uwClient,{expc:this.expc},{lvl:this.lvl},function(){});
        }.bind({expc:expc,lvl:i}));
    }
    async.parallel(tasks,function(){})
};

/*************************************************************run*************************************************************************/
/*resetInitData(function(err,data){
    console.log(err);
});*/
/*var userIds = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
createHero(userIds,function(){});*/

//resetUserBag();
//resetUserGuide();
resetUserTasks();

//resetUserLvlExpc();
//resetHeroLvlExpc();