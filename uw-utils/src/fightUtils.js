var logger = require('uw-log').getLogger("uw-logger",__filename);
var uwData = require("uw-data");
var consts = uwData.consts;
var c_msgCode = uwData.c_msgCode;
var c_game = uwData.c_game;

var fightUtils = module.exports;

/**
 * 根据战力计算输赢
 * @param isWin
 * @param attackLvl
 * @param attackCombat
 * @param defenceCombat
 */
fightUtils.checkIsWinByCombat = function(isWin,attackLvl,attackCombat,defenceCombat){
    if(!isWin) return isWin;
    var protectCfg = c_game.fightProtect[0];
    protectCfg = protectCfg.split(",");
    var diff = attackCombat-defenceCombat;
    if(diff>0) return isWin;

    //[10,20,50,100,200,500,1000,2000];
    //['30,50,100,200,350,800,1500,2700'],
    // ['20,35,75,150,300,750,1350,2600']

    //获取能赢的最高伤害
    var limitCombat = 0;
    attackCombat = attackCombat/10000;
    defenceCombat = defenceCombat/10000;

    if(attackCombat<=10){
        limitCombat = parseInt(protectCfg[0]);
    } else if(attackCombat<=20){
        limitCombat = parseInt(protectCfg[1]);
    } else if(attackCombat<=50){
        limitCombat = parseInt(protectCfg[2]);
    } else if(attackCombat<=100){
        limitCombat = parseInt(protectCfg[3]);
    } else if(attackCombat<=200){
        limitCombat = parseInt(protectCfg[4]);
    } else if(attackCombat<=500){
        limitCombat = parseInt(protectCfg[5]);
    } else if(attackCombat<=1000){
        limitCombat = parseInt(protectCfg[6]);
    } else if(attackCombat<=2000){
        limitCombat = parseInt(protectCfg[7]);
    }else {
        limitCombat = 999999;
    }
    if(defenceCombat>limitCombat){
        isWin = false;
    }

    return isWin;
};
