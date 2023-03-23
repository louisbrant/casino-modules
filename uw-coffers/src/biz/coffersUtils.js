/**
 * Created by Administrator on 2015/12/8.
 */

var exports = module.exports;
var c_lvl = require("uw-data").c_lvl;
var c_prop = require("uw-data").c_prop;
var c_game =  require("uw-data").c_game;
var formula =  require("uw-formula");
var c_bossHurtRate = require("uw-data").c_bossHurtRate;

var userUtils =  require("uw-user").userUtils;


//添加经验
exports.addExpc = function(coffersData, expc){

    var oldLvl = coffersData.lvl;
    coffersData.buildValue+=expc;

    var curLvl =  _getCurLvl(coffersData.buildValue);

    coffersData.lvl = curLvl;

    //限制最高等级
    var maxLvl = c_game.initCfg[6];
    if(coffersData.lvl>=maxLvl){
        coffersData.lvl = maxLvl;
    }
    //升级的话补差值
    if(coffersData.lvl>oldLvl){
        var diffResource = c_lvl[coffersData.lvl].coffersBase - c_lvl[oldLvl].coffersBase;
        coffersData.resource +=diffResource;
    }
};


//添加激励经验
exports.addBuffExpc = function(coffersData, expc){
    var oldLvl = coffersData.buffLvl;
    coffersData.buffExpc+=expc;
    var curLvl =  _getCurBuffLvl(coffersData.buffExpc);
    coffersData.buffLvl = curLvl;
};

//获取今天剩余行动力
exports.getReAction = function(userData){
    var actionData = exports.getActionData();
    var actionTotal = actionData[0];
    var toDayAction = userUtils.getTodayCount(userData,c_prop.userRefreshCountKey.coffersAction);
    var reAction = actionTotal-toDayAction;
    if(reAction<0) reAction = 0;
    return reAction;
};

//增加行动
exports.addAction = function(userData,num){
    userUtils.addTodayCount(userData,c_prop.userRefreshCountKey.coffersAction,num);
};

exports.calHeroProp = function(heroList,lvl,buffLvl,buffBase){

    //33
    var curDefenceValue = c_lvl[lvl].cofferPower;
    for(var i = 0;i<heroList.length;i++){
        var locHero = heroList[i];
        var locHp = locHero.propArr[33]||0;
        locHero.propArr[33] = locHp*(1+curDefenceValue/10000);
    }

    //34
    var curDefenceAttackValue = buffBase;
    var attackValueCfg = c_game.coffers2[4];
    attackValueCfg = attackValueCfg.split(",");
    curDefenceAttackValue += parseInt(attackValueCfg[buffLvl]||0) ;
    for(var i = 0;i<heroList.length;i++){
        var locHero = heroList[i];
        var locAttack = locHero.propArr[34]||0;
        locHero.propArr[34] = locAttack*(1+curDefenceAttackValue/10000);
    }
};

//获取个人红利
exports.getPersonResource = function(cofferResource,userLvl){
    //a:当前玩家等级 b:当前金币贮藏量 c:领取金币参数1 d;领取金币参数2
    var prame = c_game.coffers[5];
    var prameArr = prame.split(",");
    var ret = formula.calCoffersPersonRecource(userLvl,cofferResource, parseFloat(prameArr[0]),parseFloat(prameArr[1]));
    return ret;
};

//获取当前行动力数据
exports.getActionData = function(nowDate){
    var startTime = (new Date()).clearTime();
    nowDate = nowDate || new Date();
    var intervalMinutes = parseInt(c_game.coffers[20]) ;
    var baseAction = parseInt(c_game.coffers[21]);
    var intervalAction = parseInt(c_game.coffers[22]);
    var diffMinutes = startTime.getMinutesBetween(nowDate);
    var actionNum = Math.floor(diffMinutes/intervalMinutes);
    var reSeconds = intervalMinutes*60 - startTime.getSecondsBetween(nowDate)+actionNum*intervalMinutes*60;
    var actionTotal = baseAction+ actionNum * intervalAction;
    return [actionTotal,reSeconds];
};

//判断是否击破
exports.checkBreak = function(doorKey, breakTimeData){
    var isBreak = false;
    var breakTime = breakTimeData[doorKey];
    if(breakTime){
        breakTime = new Date(breakTime);
        var cd = c_game.coffers3[3];
        var diffSeconds =  breakTime.getSecondsBetween(new Date());
        if(diffSeconds<cd) isBreak = true;
    }
    return isBreak;
};

//获取击破恢复时间
exports.getBreakReplaySeconds = function(doorKey, breakTimeData){
    var reSeconds = 0;
    var breakTime = breakTimeData[doorKey];
    if(breakTime){
        breakTime = new Date(breakTime);
        var cd = c_game.coffers3[3];
        var diffSeconds =  breakTime.getSecondsBetween(new Date());
        reSeconds = cd - diffSeconds;
        if(reSeconds<0) reSeconds = 0;
    }
    return reSeconds;
};

//增加掠夺次数
exports.addLootNum = function(attackServerId, attackUserId,  lootUserData){
    var value = exports.getLootUserDataByIndex(attackServerId, attackUserId,  lootUserData,0)||0;
    value++;
    exports.setLootUserDataByIndex(attackServerId, attackUserId,  lootUserData,0,value);
};

//获取掠夺次数
exports.getLootNum = function(attackServerId, attackUserId,lootUserData){
    var value = exports.getLootUserDataByIndex(attackServerId, attackUserId, lootUserData,0);
    return value||0;
};

//获取掠夺用户数据
exports.getLootUserDataByIndex = function(attackServerId,attackUserId,lootUserData,index){
    //{服务器id:{用户id:[次数],....},...}
    var serverData = lootUserData[attackServerId]||{};
    var userData = serverData[attackUserId]||[];
    return userData[index];
};

//设置掠夺用户数据
exports.setLootUserDataByIndex = function(attackServerId,attackUserId,lootUserData,index,value){
    //{服务器id:{用户id:[次数],....},...}
    var serverData = lootUserData[attackServerId]||{};
    var userData = serverData[attackUserId]||[];
    userData[index] = value;

    serverData[attackUserId] = userData;
    lootUserData[attackServerId] = serverData;
};

//判断是否超出上限
exports.checkIsOutLoot = function(lvl,curResource){
    var outPercent = c_game.coffers3[0];
    var baseResource =  c_lvl[lvl].coffersBase;
    var curPercent = (curResource/baseResource)*10000;
    if(curPercent<=(10000-outPercent)) return true;
    return false;
};

//获取掠夺的资源
exports.getLootResource = function(hurt,curResource,breakNum){
    //a:伤害量计算获得金币;b:国库当前金币;c:被击破守卫人数
    var hurtResource = _getGoldByHurt(hurt);
    var lootResource = formula.calCoffersLoot(hurtResource,curResource,breakNum);
    lootResource = parseInt(lootResource);
    return lootResource;
};

var _getGoldByHurt = function(hurt){
    var hurtGold = 0;
    for(var key in c_bossHurtRate){
        var locData = c_bossHurtRate[key];
        var locStartHurt = locData.startHurt3;
        var locEndHurt = locData.endHurt3;
        var locRate = locData.gold3;
        if(hurt>=locStartHurt&&hurt<=locEndHurt){
            hurtGold += (hurt-locStartHurt)*locRate;
            break;
        }else{
            hurtGold += (locEndHurt-locStartHurt)*locRate;
        }
    }
    return hurtGold;
};


var _getCurLvl = function(buildValue){
    var tempLvl = 0;
    for(var i = 0; i<50; i++){
        var locLvlData = c_lvl[i];
        if(!locLvlData) break;
        var locNextData = c_lvl[i+1];
        if(!locNextData) break;
        if(buildValue<locLvlData.cofferExpc){
            break;
        }
        tempLvl++;
    }
    return tempLvl;
};



var _getCurBuffLvl = function(buffValue){
    var tempLvl = 0;
    var buffLvlCfg = c_game.coffers2[3];
    buffLvlCfg = buffLvlCfg.split(",");

    for(var i = 0; i<buffLvlCfg.length; i++){
        var locValue = parseInt(buffLvlCfg[i]) ;
        if(buffValue<locValue){
            break;
        }
        tempLvl++;
    }
    return tempLvl-1;
};
