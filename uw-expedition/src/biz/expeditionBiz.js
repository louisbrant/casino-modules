/**
 * Created by Administrator on 2016/7/6.
 */

var uwData = require("uw-data");
var ExpeditionEntity = require('uw-entity').ExpeditionEntity;
var propUtils = require("uw-utils").propUtils;
var expeditionDao = require("./../dao/expeditionDao");
var expeditionHeroDao = require("./../dao/expeditionHeroDao");
var fightUtils = require("uw-utils").fightUtils;
var userUtils = require("uw-user").userUtils;
var ds = require("uw-ds").ds;
var consts = uwData.consts;
var exports = module.exports;
var c_prop = uwData.c_prop;
var async = require("async");
var ExpHeroEntity = require("uw-entity").ExpHeroEntity;

var heroBiz = null;
var heroDao = null;
var userDao = null;
var userBiz = null;

var checkRequire = function () {
    userDao = require("uw-user").userDao;
    userBiz = require("uw-user").userBiz;
    heroBiz = require("uw-hero").heroBiz;
    heroDao = require("uw-hero").heroDao;
};

exports.getInfo = function (client, userId, cb) {
    checkRequire();
    //获取
    _getExpeditionData(client, userId, function(err,data){
        if(err) return cb(err);
        var expData = data[0], expHeroData = data[1];
        return cb(null,[expData,expHeroData]);
    })
};

var _getExpeditionData = function(client, userId, cb){
    checkRequire();
    async.parallel([
        function (cb1) {
            expeditionDao.select(client,{userId:userId},cb1);
        },
        function (cb1) {
            _getExpHeroData(client,userId,cb1);
        },
    ],function(err,data) {
        if (err) return cb(err);
        var expData = data[0], expHeroData = data[1], userData = data[2];
        if(!expData) {
            var expeditionEntity = new ExpeditionEntity();
            expeditionEntity.userId = userId;
            expeditionEntity.stageId = 0;
            expeditionEntity.fightCount = 0;
            expeditionEntity.soulCount = 0;
            expeditionDao.insert(client, expeditionEntity, function (err, data) {
                if (err) return cb(err);
                expeditionEntity.id = data.insertId;
                cb(null, [expeditionEntity, expHeroData]);
            });
        }else{
            cb(null, [expData, expHeroData]);
        }
    });
}

var _getExpHeroData = function(client, userId, cb){
    checkRequire();
    async.parallel([
        function (cb1) {
            expeditionHeroDao.list(client, {userId: userId}, cb1);
        },
        function (cb1) {
            heroDao.list(client,{userId:userId},cb1);
        }],function(err,data) {
        var expHeroData = data[0], heroList = data[1];
        var day = 0;
        if (expHeroData) {
            var callbacks = []
            day = _getDiffDay(expHeroData.recordTime,new Date());
        }
        if(day > 0 || !expHeroData){
            var sql = "delete from uw_expedition_hero where userId = ?";
            client.query(sql,[userId],function(err,data){
                if(err) return cb(err);
                var heros = [];
                for(var i = 0; i < heroList.length; ++i){
                    var locHero = heroList[i];
                    var locExHero = new ExpHeroEntity();
                    for(var key in locExHero){
                        locExHero[key] = locHero[key];
                    }
                    locExHero.recordTime = new Date();
                    heros.push(locExHero);
                }
                expeditionHeroDao.insertList(client,heros,function(err,data){
                    if(err) return cb(err);
                    cb(null,data);
                });
            })
        }else{
            cb(null,expHeroData);
        }
    });
}



//战斗开始
exports.startBattle = function(client, userId, stageId ,cb){
    checkRequire();
    async.parallel([
        function (cb1) {
            expeditionDao.select(client,{userId:userId},cb1);
        },
        function (cb1) {
            userDao.select(client,{id:userId},cb1);
        },
    ],function(err,data){
        if(err) cb(err);
        var expData = data[0], userData = data[1];
        if(expData.stageId > stageId) return cb("该关卡已经挑战过了");
        var maxCount = 10;
        if(expData.fightCount > expData.buyFightCount + maxCount) return cb("是否购买挑战次数");
        var maxStageId = 10;
        if(stageId < 0 || stageId > maxStageId) return cb("关卡数不对");
        heroBiz.getPkList(client,userData,function(err,data){
            var heroPkDataList = data;
            var heroList = heroPkDataList[0];
            var otherDataList = heroPkDataList[1];
            var fightData = heroPkDataList[2];

            var soulCount = 0;
            for(var key in heroList){
                var hData = heroList[key];
                if(hData.wearSoulId != null){
                    soulCount++;
                }
            }
            if(soulCount == 0) return cb("没有佩戴元婴");
            expData.fightCount += 1;

            var upExpData = {
                fightCount : expData.fightCount
            }
            var updateUser = {
                nickName : "random"
            }
            expeditionDao.update(client, upExpData, {id: expData.id}, function(err,data){
                if(err) return cb(err);
                cb(null,  [upExpData, updateUser, heroList, otherDataList, fightData,0]);
            });
        });
    });
}

//战斗结束
exports.endBattle = function(client, userId, isWin ,herosHp, cb){
    checkRequire();
    async.parallel([
        function (cb1) {
            expeditionDao.select(client,{userId:userId},cb1);
        },
        function (cb1) {
            userDao.select(client,{id:userId},cb1);
        },
        function (cb1) {
            heroDao.list(client,{userId:userId},cb1);
        }
    ],function(err,data){
        var expData = data[0], userData = data[1], heroList = data[2];
        var f = new ds.FightResult();
        isWin = fightUtils.checkIsWinByCombat(isWin,userData.lvl,userData.combat,userData.combat);

        expData.fightCount += 1;
        expData.stageId += 1;
        for(var i = 0; i < heroList.length; ++i){
            var heroData = heroList[i];
            var curHp = herosHp[heroData.tempId];
            var locSoulId = heroData.wearSoulId;
            var soulData = heroData.soulArr[locSoulId];
            var maxHp = heroData.propArr[c_prop.heroPropKey.maxHp];
            var per = Math.ceil(curHp / maxHp * 100);
            if(per <= 0) {
                heroData.wearSoulId = null;
                delete heroData.soulArr[locSoulId];
            }else{
                soulData[1] = per;
                heroData.soulArr[locSoulId] = soulData;
            }
        }

        f.winStatus = isWin?consts.winStatus.win:consts.winStatus.lose;//1：胜利，2：失败
        f.attackMember = [userData.nickName,userData.combat,userData.iconId];//攻击方信息 [名字,战力,头像id]
        f.beAttackMember = [userData.combat,userData.iconId];//被攻击方信息 [名字,战力,头像id]
        var upEData = {
            id:expData.id,
            fightCount:expData.fightCount,
            stageId:expData.stageId
        };
        var upHData = {
            wearSoulId :heroData.wearSoulId,
            soulArr: heroData.soulArr
        };
        async.parallel([
            function (cb1) {
                expeditionDao.update(client, upEData, {id: upEData.id}, cb1);
            },
            function (cb1) {
                heroDao.update(client, upHData, {id: heroData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [upEData,upHData,f,userData.lvl]);
        });
    });
}
var uwClient = require("uw-db").uwClient;
exports.endBattle(uwClient,67850,true,[1000],function(err,data){
    if(err) console.log("err %s",JSON.stringify(err));
    console.log("err %s",JSON.stringify(data));
})

//装备元婴
exports.wearSoul = function(client,userId,tempId,soulId,cb){
    checkRequire();
    async.parallel([
        function (cb1) {
            expeditionDao.select(client,{userId:userId},cb1);
        },
        function (cb1) {
            heroDao.select(client,{userId:userId,tempId:tempId},cb1);
        }
    ],function(err,data){
        var eData = data[0], hData = data[1];
        var soulData = hData.soulArr;
        var soulItem = soulData[soulId];

        var oriWearId = hData.wearSoulId;

        if(oriWearId){
            var oriItem = soulData[oriWearId];
            oriItem[2] = 0;//卸下
            if(oriItem[1] < 1){//判断原始的是否有穿戴过
                eData.soulCount += 1;
            }
            hData.soulArr[oriWearId] = oriItem;
        }

        if(!soulItem) return cb("不存在该元婴");
        soulItem[1] = 1;//今天是否穿戴过
        soulItem[2] = 1;//佩戴在身上

        hData.wearSoulId = soulId;
        hData.soulArr[soulId] = soulItem;

        var upEData = {
            id: eData.id,
            soulCount:eData.soulCount,
        };
        var upHData = {
            id: hData.id,
            wearSoulId: hData.wearSoulId,
            soulArr: hData.soulArr
        };
        async.parallel([
            function (cb1) {
                expeditionDao.update(client, upEData, {id: eData.id}, cb1);
            },
            function (cb1) {
                heroDao.update(client, upHData, {id: hData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [upEData,upHData]);
        });
    });
}


//购买挑战次数
exports.buyFightCount = function(client, userId, cb){
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.select(client,{id:userId},cb1);
        },
        function (cb1) {
            expeditionDao.select(client,{userId:userId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0], expData = data[1];
        var consume = 0;
        if(consume > userData.diamond) return cb("钻石不足");
        userUtils.reduceDiamond(userData,consume);
        expData.buyFightCount -= 1;
        var upExpData = {
            buyFightCount:expData.buyFightCount
        };
        var upUserData = {
            diamond: userData.diamond
        };
        async.parallel([
            function (cb1) {
                userDao.update(client, upUserData, {id: userId}, cb1);
            },
            function (cb1) {
                expeditionDao.update(client, upExpData, {id: expData.id}, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [upExpData,upUserData]);
        });
    });
}

var _getHeroList = function(herosHp,heroData){
    for(var key in heroData){
        var hData = heroData[key];
        var maxHp = hData.propArr[c_prop.heroPropKey.maxHpTemp];
        var curHp = herosHp[hData.tempId];
        var curSoulId = hData.wearSoulId;

        if(curSoulId){
            var pre = Math.ceil(curHp/maxHp * 100);
            if(pre < 0) {
                heroData[key].wearSoulId = null;
            }
            else{
                heroData[key].soulArr[curSoulId][1] = pre;
            }
        }
    }
    return heroData;
}

var _getDiffDay = function(startTime, endTime) {
    if(!startTime){
        startTime = new Date();
    }
    return startTime.clone().clearTime().getDaysBetween(endTime.clone().clearTime());
};


var _calcProp = function(propArr,factor){
    __addPropToProps(propArr,c_prop.heroPropKey.maxHp,factor);
    __addPropToProps(propArr,c_prop.heroPropKey.attack,factor);
    __addPropToProps(propArr,c_prop.heroPropKey.defence,factor);
    __addPropToProps(propArr,c_prop.heroPropKey.magicDefence,factor);
    __addPropToProps(propArr,c_prop.heroPropKey.hit,factor);
    __addPropToProps(propArr,c_prop.heroPropKey.dodge,factor);
    __addPropToProps(propArr,c_prop.heroPropKey.critical,factor);
    __addPropToProps(propArr,c_prop.heroPropKey.disCritical,factor);
}

var __addPropToProps = function(propArr,index,factor){
    if(!index) return;
    propArr[index] *= factor;
}