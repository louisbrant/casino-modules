/**
 * Created by Administrator on 14-10-14.
 */

var exports = module.exports;
var client = require("uw-db").uwClient;
var HeroEntity = require("uw-entity").HeroEntity;
var UserEntity = require("uw-entity").UserEntity;
var PkOutEntity = require("uw-entity").PkOutEntity;

var mainClient = require("uw-db").mainClient;
var loginClient = require("uw-db").loginClient;
var logger = require('uw-log').getLogger("uw-logger", __filename);
var async =  require("async");

var c_nameData = require("uw-data").c_nameData;
var c_game = require("uw-data").c_game;
var c_lvl = require("uw-data").c_lvl;
var commonUtils = require("uw-utils").commonUtils;

var t_monster = require("uw-data").t_monster;
var t_wing = require("uw-data").t_wing;
var t_itemEquip = require("uw-data").t_itemEquip;
var t_robot = require("uw-data").t_robot;
var c_prop = require("uw-data").c_prop;
var t_hero = require("uw-data").t_hero;
var project = require("uw-config").project;
var heroPropHelper = null;
var arenaDao = null;
var arenaBiz =null;
var userDao = null;
var userBiz = null;
var heroBiz = null;
var heroDao = null;
var pkOutDao = null;
var serverInfoDao = null;
var arenaUtils =null;

var g_tempNameArr = [];

var checkRequire = function(){
     heroPropHelper = require("uw-hero").heroPropHelper;
     arenaDao = require("uw-arena").arenaDao;
     arenaBiz = require("uw-arena").arenaBiz;
     arenaUtils = require("uw-arena").arenaUtils;
     userDao = require("uw-user").userDao;
     userBiz = require("uw-user").userBiz;
     heroBiz = require("uw-hero").heroBiz;
     heroDao = require("uw-hero").heroDao;
    pkOutDao = require("uw-pkOut").pkOutDao;
    serverInfoDao = require("uw-server-info").serverInfoDao;
};

var RobotObj = function(){
    this.pkOutData = null;//野外pk数据
    this.heroList = null;//英雄组 [heroEntity,heroEntity]
    this.userData = null;//用户数据
};

exports.checkRobot = function(cb){
    checkRequire();
    _checkRobot(function(err,data){
        if(err) return cb(err);
        //arenaUtils.initRobot(client,function(){});
        cb();
    });
};

var _checkRobot = function(cb){
    //判断是否竞技场存在用户
    userDao.select(client,{accountId:0},function(err,data){
        if(err) return cb(err);
        if(data) {
            logger.debug("已经存在机器人，跳过初始化机器人!");
            return cb(null);
        }
        serverInfoDao.select(loginClient,{serverId:project.serverId},function(err,serverData){
            if(err) return cb(err);
            var tasks = [];
            for (var key in t_robot) {
                var locRobotData = t_robot[key];
                var num = locRobotData.num||1;
                for(var i = 0;i<num;i++){
                    tasks.push(function(cb1){
                        _createUserHeroArena(this,serverData,cb1);
                    }.bind(locRobotData));
                }
            }
            async.series(tasks,function(err,data){
                if(err) {
                    console.error(err);
                    return cb(err);
                }
                g_tempNameArr.length = 0;
                g_tempNameArr = null;
                logger.error("初始化机器人完成!");
                cb();
            });

        });

    });
};


var _getRandomName = function(sex){
    var l = Object.keys(c_nameData).length;
    var firstName = c_nameData[commonUtils.getRandomNum(1,l)].firstName;
    var secondName = "";
    if(sex==0){
        secondName = c_nameData[commonUtils.getRandomNum(1,l)].maleName;
    }else{
        secondName = c_nameData[commonUtils.getRandomNum(1,l)].femaleName;
    }
    var name = firstName+secondName;
    if(g_tempNameArr.indexOf(name)>-1){
        return _getRandomName(sex);
    }
    g_tempNameArr.push(name);
    return name;
};


var _createUserHeroArena = function(robotData,serverData,cb){
    var robotObject = _createNewObj(robotData.id,serverData);
    var user = robotObject.userData;

    userDao.insert(client,user,function(err,data){
        if(err) return cb(err);
        var userId = data.insertId;
        var tasks = [];
        for(var i = 0;i<robotObject.heroList.length;i++){
            var locHeroData = robotObject.heroList[i];
            tasks.push(function(cb1){
                _createHero(this[0],this[1],cb1)
            }.bind([userId,locHeroData]));
        }
        tasks.push(function(cb1){
            _createPkOut(this[0],this[1],cb1)
        }.bind([userId,robotObject.pkOutData]));
        async.parallel(tasks,function(err,data){
            if(err) return cb(err);
            cb();
        });
    });
};

var _createHero = function(userId,heroData,cb){
    heroData.userId = userId;
    heroDao.insert(client, heroData, function (err, data) {
        if (err) return cb(err);
        heroData.id = data.insertId;
        cb(null, heroData);
    });
};

var _createPkOut = function(userId,pkOutData,cb){
    pkOutData.userId = userId;
    pkOutDao.insert(client, pkOutData, function (err, data) {
        if (err) return cb(err);
        pkOutData.id = data.insertId;
        cb(null, pkOutData);
    });
};


var _createNewObj = function(robotId,serverData){
    var t_robotData = t_robot[robotId];
    var robotObj = new RobotObj();
    robotObj.robotId = robotId;
    var pkOut = new PkOutEntity();
    pkOut.pkValue = t_robotData.pkValue;
    pkOut.highPkValue = t_robotData.pkValue;
    pkOut.killValue = t_robotData.killValue;
    pkOut.enemyIds = [];/*对手组*/
    pkOut.freshTime = new Date();/*上一次刷新对手时间*/
    pkOut.pkValueTime = new Date();
    robotObj.pkOutData = pkOut;

    var heroList = [];

    var allCombat = 0;
    for(var i =0;i< t_robotData.monsterIdArr.length;i++){
        var locMonsterId = t_robotData.monsterIdArr[i];
        var locTempId = t_robotData.tempIdArr[i];
        var locSex = t_robotData.sexArr[i];
        var locDisplayIds = t_robotData.displayIds[i];
        //获取属性
        var locHero = new HeroEntity();
        /** 用户id **/
        locHero.userId = 0;/*用户id*/
        /** 模板id **/
        locHero.tempId = locTempId||1;/*模板id*/
        /** 品阶 **/
        locHero.quality = 0;/*品阶*/
        /** 强化 **/
        locHero.intensifyArr = [];/*强化[等级,等级,...] 下标对应装备位置*/
        /** 星级 **/
        locHero.starArr = [];/*星级[星级,星级,...] 下标对应装备位置*/
        /** 宝石 **/
        locHero.gemArr = [];/*宝石[id,id,id,...]下标对应装备位置*/
        /** 翅膀 **/
        locHero.wingArr = [];/*翅膀[id,等级,星级,当前星经验]*/
        /** 经验 **/
        locHero.expc = 0;/*经验*/
        /** 等级 **/
        locHero.lvl = t_robotData.lvl;/*等级*/
        /** 装备数据 **/
        locHero.equipData = {};/*{&quot;部位&quot;:物品id,....}*/
        /** 技能等级组 **/
        locHero.skillLvlArr = [];/*[技能1等级,技能2等级...]*/
        /** 最终属性组 **/
        locHero.propArr = null;/*最终属性组[值,值]*/
        /** 境界等级 **/
        locHero.realmLvl = 0;/*境界等级*/
        /** 境界符文组 **/
        locHero.realmArr =  [];/*境界符文组  [0,1,2,3,4,5]*/
        /** 性别 **/
        locHero.sex = locSex||1;/*性别 1:男 2:女*/
        /** 属性值 **/
        locHero.propArr =  _calProps(locMonsterId,locHero.tempId);
        /** 战斗力 **/
        locHero.combat = heroPropHelper.calCombat({lvl: t_robotData.lvl,equipBag:{}},locHero);/*战斗力*/
        heroList.push(locHero);


        //[[衣服显示id,武器显示id,翅膀显示id],..]
        var locCurDisplayIds = [];
        var t_clothData = t_itemEquip[locDisplayIds[1]];
        if(locHero.sex==c_prop.sexKey.male){
            locCurDisplayIds[0] = t_clothData.displayID.split(",")[0];
        }else{
            locCurDisplayIds[0] = t_clothData.displayID.split(",")[1];
        }

        var t_wuqiData = t_itemEquip[locDisplayIds[0]];
        locCurDisplayIds[1] = t_wuqiData.displayID;
        var t_wingData = t_wing[locDisplayIds[2]];
        locCurDisplayIds[2] = t_wingData.displayID;


        allCombat+=locHero.combat;
    }

    var user = new UserEntity();
    user.lvl = t_robotData.lvl;
    user.combat = allCombat;
    user.nickName = "s" + serverData.indexId +"."+ _getRandomName(t_robotData.sexArr[0]);
    user.accountId = 0;
    user.iconId = getIconId(t_robotData.tempIdArr[0],t_robotData.sexArr[0]);
    user.robotId = t_robotData.id;

    robotObj.heroList = heroList;
    robotObj.userData = user;
    return robotObj;
};

var _calProps = function(monsterId,heroTempId){
    var props = [];
    for(var i = 0;i<46+1;i++){
        props[i] = 0;
    }
    var t_monsterData = t_monster[monsterId];
    //生命	攻击	物防	魔防	命中	闪避	暴击	抗暴	增加伤害	减少伤害	麻痹	抗麻
    //maxHp:0,attack:0,defense:0,magicDefence:0,hit:0,dodge:0,critical:0,disCritical:0,damageIncrease:0,damageDecrease:0,benumbPro:0,disBenyumbPro:0
    props[1] = t_monsterData.maxHp;
    props[3] = t_monsterData.attack;
    props[5] = t_monsterData.defense;
    props[7] = t_monsterData.magicDefence;
    props[9] = t_monsterData.hit;
    props[11] = t_monsterData.dodge;
    props[13] = t_monsterData.critical;
    props[15] = t_monsterData.disCritical;
    props[23] = t_monsterData.damageIncrease;
    props[24] = t_monsterData.damageDecrease;
    props[25] = t_monsterData.benumbPro;
    props[26] = t_monsterData.disBenyumbPro;

    var t_heroData = t_hero[heroTempId];
    props[19] = t_heroData.moveSpeed;
    props[21] = t_heroData.attackInterval;
    return props;
};

var getIconId = function(heroTempId,sex){
    var iconId = 1;
    if(heroTempId==c_prop.heroJobKey.zs){
        if(sex==c_prop.sexKey.male){
            iconId = c_prop.roleIconKey.zs_nan;
        }else{
            iconId = c_prop.roleIconKey.zs_nv;
        }
    }

    if(heroTempId==c_prop.heroJobKey.fs){
        if(sex==c_prop.sexKey.male){
            iconId = c_prop.roleIconKey.fs_nan;
        }else{
            iconId = c_prop.roleIconKey.fs_nv;
        }
    }

    if(heroTempId==c_prop.heroJobKey.ds){
        if(sex==c_prop.sexKey.male){
            iconId = c_prop.roleIconKey.ds_nan;
        }else{
            iconId = c_prop.roleIconKey.ds_nv;
        }
    }

    return iconId;
};

