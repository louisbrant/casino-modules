var CronJob = require('cron').CronJob;
var c_open = require("uw-data").c_open;
var c_game =  require("uw-data").c_game;
var project = require("uw-config").project;

var fs = require("fs");
var path = require('path');
var bossUtils = null;
var checkRequire = function(){
    bossUtils = bossUtils || require("uw-boss").bossUtils;
};

//主定时器
exports.runJobs = function(){
    checkRequire();
    ////分钟 小时 天 月 星期 年
    var minute1 = _getRandomNumber(20,59);
    var job = new CronJob(minute1+" 5 * * *", function() {
        require("./task/deleteExpireRecord.js").run();
        require("./task/deleteExpireMail.js").run();
    });
    job.start();

    ////分钟 小时 天 月 星期 年
    var coffersAwardMinute = _getRandomNumber(20,59);
    var job = new CronJob(coffersAwardMinute+" 0 * * *", function() {
        require("./task/coffersAward.js").run();
    });
    job.start();

    var chairmanImpeachMinute = _getRandomNumber(0,59);
    var job = new CronJob(chairmanImpeachMinute+" 1 * * *", function() {
        require("./task/chairmanImpeach.js").run();
    });
    job.start();

    ////分钟 小时 天 月 星期 年
    var job = new CronJob("0 2 * * *", function() {
        require("./task/coffersReset.js").run();
    });
    job.start();

    ////分钟 小时 天 月 星期 年
    var job = new CronJob("0 0 * * *", function() {
        require("./task/pkOutBak.js").run();
    });
    job.start();

    var runSendPkOutAwardMinute = _getRandomNumber(20,40);
    ////分钟 小时 天 月 星期 年
    var job = new CronJob(runSendPkOutAwardMinute+" 0 * * *", function() {
        require("./task/sendPkOutAward.js").run();
    });
    job.start();

    //定时备份竞技场表
    var job = new CronJob("0 0 * * *", function() {
        require("./task/arenaBak.js").run();
    });
    job.start();

    //定时备份boss表
    var bossBakMinute = _getRandomNumber(0,59);
    var job = new CronJob(bossBakMinute + " 0 * * *", function() {
        require("./task/bossBak.js").run();
    });
    job.start();

    //定时备份五日目标说需要的表
    var job = new CronJob("0 0 * * *", function() {
        require("./task/fiveDaysTargetBak.js").run();
    });
    job.start();

    //定时备份新四日目标说需要的表
    var job = new CronJob("0 0 * * *", function() {
        require("./task/newFourTargetBak.js").run();
    });
    job.start();

    ////分钟 小时 天 月 星期 年
    var runArenaAwardMinute = _getRandomNumber(30,59);
    var job = new CronJob(runArenaAwardMinute+" 0 * * *", function() {
        require("./task/arenaAward.js").run();
    });
    job.start();

    //分钟 小时 天 月 星期 年
    var runMinute = _getRandomNumber(5,50);
    var job = new CronJob(runMinute + " */1 * * *", function() {
        require("./task/rank.js").run();
    });
    job.start();

    //todo 临时注释掉

    //分钟 小时 天 月 星期 年
    var runMinute = _getRandomNumber(20,50);
    //runMinute = 30; //for test
    var job = new CronJob(runMinute + " 0 * * *", function() {
        require("./task/fiveDaysTarget.js").run();
    });
    job.start();

    //分钟 小时 天 月 星期 年
    var runMinute = _getRandomNumber(20,50);
    runMinute = 3;
    var job = new CronJob(runMinute + " 0 * * *", function() {
        require("./task/newFourTarget.js").run();
    });
    job.start();


    setInterval(function(){
        require("./task/sysMsgRefresh.js").run();
        require("./task/guildWarSaveRecord.js").run();
        require("./task/guildWarRecordSync.js").run();
    },5000);

    //分钟 小时 天 月 星期 年
    var job = new CronJob("*/30 * * * *", function() {
        require("./task/chatSysRefresh.js").run();
        console.log(new Date());
    });
    job.start();

    //分钟 小时 天 月 星期 年
    var runHour  = c_game.challengeCupCfg[7];
    var job = new CronJob("0 " +runHour+ " * * *", function() {
        require("./task/challengCup.js").run();
    });
    job.start();
   /* var job = new CronJob("0 * * * *", function() {
        require("./task/sendDayRecharge.js").run();
    });
    job.start();*/

    //公会数据同步
    setInterval(function(){
        require("./task/guildSys.js").run();
        require("./task/coffersSys.js").run();
        require("./task/challengeCupSys.js").run();
        require("./task/guildWarSync.js").run();
        require("./task/redEnvelopeSys.js").run();
    },1000);

    //公会数据同步
    setInterval(function(){
        require("./task/guildWarStaticSync.js").run();
    },3000);

    //擂台赛活动预告
    setInterval(function(){
        require("./task/guildWarSync.js").run();
        require("./task/challengeCupChat.js").run();
    },20000);

    //服务器配置同步
    setInterval(function(){
        require("./task/gameCfgSys.js").run();
        require("./task/clearServerDBCfg.js").run();
    },120*1000);//120

    //更新红包任务
    setInterval(function(){
        require("./task/updateRedEnvelopeSys.js").run();
    }, 5*1000)

    _runWorldBoss();
    exports.runOnce();
};

/**
 * 运行一次
*/
exports.runOnce = function(){
    require("./task/rank.js").runOnce();
    require("./task/deleteExpireMail.js").runOnce();
};

/*******************************************************private*************************************************************/


var _runWorldBoss = function(){
    var worldBossIds = bossUtils.getWorldBossIds();
    for(var i = 0;i<worldBossIds.length;i++){
        var locBossId = worldBossIds[i];
        var startTime = bossUtils.getWorldOpenStartTime(locBossId);
        __runWorldBoss(locBossId,startTime);
    }
};

var __runWorldBoss = function(bossId, startTime){
    //预告1
    var pre1 = startTime.clone().addMinutes(-10);
    var job1 = new CronJob(pre1.getMinutes()+" " +pre1.getHours()+ " * * *", function() {
        require("./task/worldBossPre.js").run(bossId,10);
    });
    job1.start();

    //预告2
    var pre2 = startTime.clone().addMinutes(-5);
    var job2 = new CronJob(pre2.getMinutes()+" " +pre2.getHours()+ " * * *", function() {
        require("./task/worldBossPre.js").run(bossId,5);
    });
    job2.start();

    //开启
    var job3 = new CronJob(startTime.getMinutes()+" " +startTime.getHours()+ " * * *", function() {
        require("./task/worldBossCheck.js").run(bossId);
    });
    job3.start();
};

//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};
