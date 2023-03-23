/**
 * Created by Administrator on 2015/9/21.
 */

var c_prop = require("uw-data").c_prop;
var c_game = require("uw-data").c_game;

var exports = module.exports;

//计算次数
exports.calRefreshNum = function(pkOutData){
    //还没刷新过
    //不等于当天
    if(!pkOutData.todayRefreshTime||!pkOutData.todayRefreshTime.equalsDay(new Date())){
        pkOutData.todayRefreshNum = 0;
        pkOutData.todayRefreshTime = new Date();
    }
};

//获取pk名字颜色
exports.calNameColor = function(pkValue){
/*    参数6：黄名需要pk值
    参数7：红名需要pk值*/
    if(pkValue>=c_game.pkOutCfg[6]) return c_prop.pkNameColorKey.red;
    if(pkValue>=c_game.pkOutCfg[5]) return c_prop.pkNameColorKey.yellow;
    return c_prop.pkNameColorKey.white;
};

//获取金币掉落系数
exports.calLootGoldMult = function(nameColor,isSelf){
/*    参数1：pk掉落敌方金币黄名参数y
    参数2：pk掉落敌方金币红名参数y
    参数5：pk掉落金币白名参数x（敌方与己方相同）
    参数8：pk掉落已方金币黄名参数x
    参数9：pk掉落已方金币红名参数x
    */
    if(isSelf){
        if(nameColor == c_prop.pkNameColorKey.white)
            return c_game.pkOutLootGold[4];
        if(nameColor == c_prop.pkNameColorKey.yellow)
            return c_game.pkOutLootGold[7];
        if(nameColor == c_prop.pkNameColorKey.red)
            return c_game.pkOutLootGold[8];
    }else{
        if(nameColor == c_prop.pkNameColorKey.white)
            return c_game.pkOutLootGold[4];
        if(nameColor == c_prop.pkNameColorKey.yellow)
            return c_game.pkOutLootGold[0];
        if(nameColor == c_prop.pkNameColorKey.red)
            return c_game.pkOutLootGold[1];
    }
};

//获取经验掉落系数
exports.calLootExpcMult = function(nameColor,isSelf){
    /*
     参数3：pk掉落敌方经验黄名参数y
     参数4：pk掉落敌方经验红名参数y
     参数6：pk掉落经验白名参数x（敌方与己方相同）
     参数10：pk掉落已方经验黄名参数x
     参数11：pk掉落已方经验红名参数x
     */
    if(isSelf){
        if(nameColor == c_prop.pkNameColorKey.white)
            return c_game.pkOutLootGold[5];
        if(nameColor == c_prop.pkNameColorKey.yellow)
            return c_game.pkOutLootGold[9];
        if(nameColor == c_prop.pkNameColorKey.red)
            return c_game.pkOutLootGold[10];
    }else{
        if(nameColor == c_prop.pkNameColorKey.white)
            return c_game.pkOutLootGold[5];
        if(nameColor == c_prop.pkNameColorKey.yellow)
            return c_game.pkOutLootGold[2];
        if(nameColor == c_prop.pkNameColorKey.red)
            return c_game.pkOutLootGold[3];
    }
};


exports.calLootEquipRate = function(){
/*
    参数1：黄名掉落白品物品概率
    参数2：黄名掉落绿品物品概率
    参数3：黄名掉落蓝品物品概率
    参数4：黄名掉落紫品物品概率
    参数5：黄名掉落橙品物品概率
    参数6：黄名掉落红品物品概率"
    "参数1：红名掉落白品物品概率
    参数2：红名掉落绿品物品概率
    参数3：红名掉落蓝品物品概率
    参数4：红名掉落紫品物品概率
    参数5：红名掉落橙品物品概率
    参数6：红名掉落红品物品概率"
    */

};

//计算胜负得到的荣誉值
exports.calLootHonorMult = function(isWin){
    //pkOutHonor
    //参数1：pk荣誉值胜参数
    //参数2：pk荣誉值负参数
    if(isWin)
        return c_game.pkOutHonor[0];
    else
        return c_game.pkOutHonor[1];
};

//计算得到的pk值
exports.calLootPkValue = function(ePkColor){
    if(ePkColor == c_prop.pkNameColorKey.red)
        return 0;
    //参数2：每次战胜pk值增加
    return c_game.pkOutCfg[1];
};