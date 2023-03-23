/**
 * Created by Administrator on 2015/9/23.
 */
var c_lvl = require("uw-data").c_lvl;
var c_prop = require("uw-data").c_prop;
var t_hero = require("uw-data").t_hero;
var t_item = require("uw-data").t_item;
var t_rebirth = require("uw-data").t_rebirth;
var t_monster = require("uw-data").t_monster;
var t_itemEquip = require("uw-data").t_itemEquip;
var t_itemBreak = require("uw-data").t_itemBreak;
var t_talisman = require("uw-data").t_talisman;
var t_talismanLvl = require("uw-data").t_talismanLvl;
var t_talismanRes = require("uw-data").t_talismanRes;
var t_talismanSkill = require("uw-data").t_talismanSkill;
var t_talismanStar = require("uw-data").t_talismanStar;
var c_gem = require("uw-data").c_gem;
var t_wing = require("uw-data").t_wing;
var t_wingStrength = require("uw-data").t_wingStrength;
var c_realm = require("uw-data").c_realm;
var t_skill = require("uw-data").t_skill;
var t_itemRealm = require("uw-data").t_itemRealm;
var c_game = require("uw-data").c_game;
var c_guildLvl = require("uw-data").c_guildLvl;
var c_guildEnnoble = require("uw-data").c_guildEnnoble;
var logger = require("uw-log").getLogger("uw-logger",__filename);
var formula = require("uw-formula");
var g_guild = require("uw-global").g_guild;
var g_data = require("uw-global").g_data;
var t_medal = require("uw-data").t_medal;
var t_medalLvl = require("uw-data").t_medalLvl;
var t_strengthRefine = require("uw-data").t_strengthRefine;
var c_demonLotus = require("uw-data").c_demonLotus;
var c_heartStuntLvl = require("uw-data").c_heartStuntLvl;
var exports = module.exports;
var MAX_PROP = 46;

/**
 * 计算英雄属性
 * @param userData 必须包含lvl ,equipBag, id,rebirthLvl,medalData,isKing,propertyData
 * @param heroData
 */
exports.calHeroProp = function(userData,heroData){
    var userLvl = userData.lvl,equipBag = userData.equipBag,isKing = userData.isKing;
    var propArr = [];
    _clearPropArr(propArr);

    //固定属性
    var t_heroData = t_hero[heroData.tempId];
    _addPropValue(propArr,c_prop.heroPropKey.moveSpeedTemp,t_heroData.moveSpeed);
    _addPropValue(propArr,c_prop.heroPropKey.attackIntervalTemp,t_heroData.attackInterval);

    var c_levelUpData = c_lvl[userLvl];
    //计算基础成长
    //maxHp	attack	defence	magicDefence	hit	dodge	critical	disCritical
    //幻术师特殊
    if(t_heroData.job == c_prop.heroJobKey.ys){
        _addPropValue(propArr,c_prop.heroPropKey.maxHp,c_levelUpData.maxHp2);
        _addPropValue(propArr,c_prop.heroPropKey.attack,c_levelUpData.attack2);
        _addPropValue(propArr,c_prop.heroPropKey.defence,c_levelUpData.defence2);
        _addPropValue(propArr,c_prop.heroPropKey.magicDefence,c_levelUpData.magicDefence2);
        _addPropValue(propArr,c_prop.heroPropKey.hit,c_levelUpData.hit2);
        _addPropValue(propArr,c_prop.heroPropKey.dodge,c_levelUpData.dodge2);
        _addPropValue(propArr,c_prop.heroPropKey.critical,c_levelUpData.critical2);
        _addPropValue(propArr,c_prop.heroPropKey.disCritical,c_levelUpData.disCritical2);
    }else{
        _addPropValue(propArr,c_prop.heroPropKey.maxHp,c_levelUpData.maxHp);
        _addPropValue(propArr,c_prop.heroPropKey.attack,c_levelUpData.attack);
        _addPropValue(propArr,c_prop.heroPropKey.defence,c_levelUpData.defence);
        _addPropValue(propArr,c_prop.heroPropKey.magicDefence,c_levelUpData.magicDefence);
        _addPropValue(propArr,c_prop.heroPropKey.hit,c_levelUpData.hit);
        _addPropValue(propArr,c_prop.heroPropKey.dodge,c_levelUpData.dodge);
        _addPropValue(propArr,c_prop.heroPropKey.critical,c_levelUpData.critical);
        _addPropValue(propArr,c_prop.heroPropKey.disCritical,c_levelUpData.disCritical);
    }
    //计算装备
    var equipData = heroData.equipData||{};            //{"部位":物品id,....}
    var intensifyArr = heroData.intensifyArr||[];            //强化[等级,等级,...] 下标对应装备位置
    var starArr = heroData.starArr||[];            //星级[星级,星级,...] 下标对应装备位置
    var gemArr = heroData.gemArr||[];//[id,id,id,...]    //宝石

    var refineArr = heroData.refineArr||[];/*装备精炼[等级,等级,...] 下标对应装备位置*/
    var starTopArr = heroData.starTopArr||[];/*升星突破[升星突破重数,升星突破重数,...] 下标对应装备位置*/

    for(var key in equipData){
        var locItemUid = equipData[key];
        if(!locItemUid) continue;
        var locBagData = [];
        var locItemId = null;
        //戒指存的是tempid
        if(key==c_prop.heroEquipIndexKey.paralysisRing||
            key==c_prop.heroEquipIndexKey.reviveRing||
            key==c_prop.heroEquipIndexKey.protectRing||
            key==c_prop.heroEquipIndexKey.harmRing
        ){
            locItemId = locItemUid;
        }else{
            locBagData = equipBag[locItemUid]||{};
            locItemId = locBagData[0];
        }

        //物品基础属性

        var locItemData = t_item[locItemId];
        if(!locItemData){
            logger.error("英雄计算属性没有这个装备，这是为什么呢，locItemUid[%s],locItemId[%s]",locItemUid,locItemId);
            continue;
        }
        if(locItemData.type == c_prop.itemTypeKey.equip){
            var locItemEquipData = t_itemEquip[locItemId];
            if(locItemEquipData){
                var locEquipPropertys = locItemEquipData.propertys;
                var locPropertys = [];
                var chuanchenIdArr = c_game.customizationCfg[14];
                chuanchenIdArr = chuanchenIdArr.split(",");
                if(locItemId>=parseInt(chuanchenIdArr[0])&&locItemId<=parseInt(chuanchenIdArr[1])){
                    var indexArr = locBagData[5]||[];
                    for(var indexI = 0 ;indexI<indexArr.length;indexI++){
                        var locIndex = indexArr[indexI];
                        locPropertys.push(locEquipPropertys[locIndex]);
                    }
                }else{
                    locPropertys = locEquipPropertys;
                }

                _addPropsToProp(propArr,locPropertys);

                //升星
                //upStarPropAdd
                var upStarPropAdd = c_lvl[starArr[key]||0].upStarPropAdd/10000;
                _addPropsToProp(propArr,locPropertys,upStarPropAdd);
                //[10,4,null,4]
                //升星突破
                var starTopProps = c_lvl[starTopArr[key] || 0].propertys;
                var topAddIndex = 0;
                var topAddValue = 0;
                var leftIndexArr = [0, 1, 2, 3];
                if (leftIndexArr.indexOf(parseInt(key)) > -1) {
                    var topProps = starTopProps[key] || [];
                    topAddIndex = topProps[0];
                    topAddValue = topProps[1];
                }
                var rightIndexArr = [8, 9, 10, 11];
                if (rightIndexArr.indexOf(parseInt(key)) > -1) {
                    var topProps = starTopProps[key - 4] || [];
                    topAddIndex = topProps[0];
                    topAddValue = topProps[1];
                }

                _addPropValue(propArr, topAddIndex, topAddValue);

                //强化属性
                //slotStrengthProperty	propValue
                var propValue = (locItemEquipData.propValue||0)*(intensifyArr[key]||0);
                //强化精炼
                var strengthAdd = t_strengthRefine[refineArr[key] || 0].strAddition;
                _addPropValue(propArr,locItemEquipData.slotStrengthProperty,propValue*(1+strengthAdd/10000));

                //宝石
                var locGemId = gemArr[key];
                var locGemData = c_gem[locGemId];
                if(locGemData){
                    _addPropValue(propArr,locGemData.effectType1,locGemData.effectPro1);
                    _addPropValue(propArr,locGemData.effectType2,locGemData.effectPro2);
                    _addPropValue(propArr,locGemData.effectType3,locGemData.effectPro3);
                    _addPropValue(propArr,locGemData.effectType4,locGemData.effectPro4);
                }

                //随机属性
                var locRandomProps = locBagData[1];

                if(locRandomProps){
                    _addPropsToProp(propArr,locRandomProps);
                }
            }
        }
        if(locItemData.type == c_prop.itemTypeKey.break) {
            var locItemBreakData = t_itemBreak[locItemId];
            if (locItemBreakData) {
                var locPropertys = locItemBreakData.props;
                _addPropsToProp(propArr, locPropertys);
            }
        }
    }

    //翅膀
    var wingArr = heroData.wingArr;//[id,等级,星级,当前星经验,左翅强化等级,右翅强化等级]

    var wingId = wingArr[0];
    var wingLeftLvl = wingArr[4]||0;
    var wingRightLvl = wingArr[5]||0;
    var t_wingData = t_wing[wingId];
    if(t_wingData){
        //attack	maxHp	defense	magicDefense
        _addPropValue(propArr, c_prop.heroPropKey.maxHpTemp, t_wingData.maxHp * (1+t_wingStrength[wingRightLvl].maxHp/10000) );
        _addPropValue(propArr, c_prop.heroPropKey.attackTemp, t_wingData.attack * (1+ t_wingStrength[wingLeftLvl].attack/10000) );
        _addPropValue(propArr, c_prop.heroPropKey.defenceTemp, t_wingData.defence * (1+ t_wingStrength[wingLeftLvl].defence/10000) );
        _addPropValue(propArr, c_prop.heroPropKey.magicDefenceTemp, t_wingData.magicDefence * (1+ t_wingStrength[wingRightLvl].magicDefence/10000) );
    }

    //境界
    var realmLvl = heroData.realmLvl;//境界等级
    var c_realmData = c_realm[realmLvl];
    if(c_realmData){
        _addPropsToProp(propArr,c_realmData.propertys);
    }
    var realmArr = heroData.realmArr;//境界符文
    for(var i = 0;i<realmArr.length;i++){
        var locRealmId = realmArr[i];
        if(!locRealmId) continue;
        var locItemRealmData = t_itemRealm[locRealmId];
        if(!locItemRealmData) continue;
        _addPropsToProp(propArr,locItemRealmData.propertys);
    }

    //公会加成

    var userId = userData.id;
    if (userId) {
        var guildId = g_data.getGuildId(userId);
        var guildData = g_guild.getGuild(guildId);
        if (guildId && guildData) {
            var guildLvlData = c_guildLvl[guildData.lvl];
            if (guildLvlData) {
                //c_guildFuncCfg
                var guildMult = 0;
                var ennoble = g_data.getGuildEnnoble(userId);
                var guildEnnobleData = c_guildEnnoble[ennoble];
                if(guildEnnobleData){
                    guildMult = guildEnnobleData.props/10000;
                }
                //c_guildFuncCfg
                _addPropsToProp(propArr, guildLvlData.props, guildMult);
            }
        }
    }

    //霸主
    if(isKing){
        /* var kingItemId = c_game.challengeCupCfg[5];
         var locItemEquipData = t_itemEquip[kingItemId];
         if(locItemEquipData) {
         var locPropertys = locItemEquipData.propertys;
         _addPropsToProp(propArr, locPropertys);
         }*/
        var kingPropMult = c_game.challengeCupCfg[11];
        for(var i = 0;i<propArr.length;i++){
            var locPropValue = propArr[i];
            if(i>=33&&i<=40){
                if(locPropValue){
                    propArr[i] = locPropValue*(1+kingPropMult/10000);
                }
            }
        }
    }

    //转生等级
    if(userData.rebirthLvl){
        var  t_rebirthData = t_rebirth[userData.rebirthLvl];
        if(t_rebirthData) {
            _addPropValue(propArr, c_prop.heroPropKey.maxHpTemp, t_rebirthData.maxHpTemp);
            _addPropValue(propArr, c_prop.heroPropKey.attackTemp, t_rebirthData.attackTemp);
            _addPropValue(propArr, c_prop.heroPropKey.defenceTemp, t_rebirthData.defenceTemp);
            _addPropValue(propArr, c_prop.heroPropKey.magicDefenceTemp, t_rebirthData.magicDefenceTemp);
            _addPropValue(propArr, c_prop.heroPropKey.hitTemp, t_rebirthData.hitTemp);
            _addPropValue(propArr, c_prop.heroPropKey.dodgeTemp, t_rebirthData.dodgeTemp);
            _addPropValue(propArr, c_prop.heroPropKey.criticalTemp, t_rebirthData.criticalTemp);
            _addPropValue(propArr, c_prop.heroPropKey.disCriticalTemp, t_rebirthData.disCriticalTemp);
        }
    }

    //勋章
    if(userData.medalData){
        for(var key in userData.medalData){
            var locMedalId = parseInt(key);
            var locMedalData = userData.medalData[key]||[];
            var locMedalLvlId = parseInt(locMedalData[0]||0);
            var t_medalData = t_medal[locMedalId];
            var t_medalLvlData = t_medalLvl[locMedalLvlId];
            if(t_medalData){
                _addPropsToProp(propArr, t_medalData.propertys, t_medalLvlData.strengthPro/10000);
            }
        }
    }

    if(userData.propertyData){
        for(var key in userData.propertyData){
            if(key == c_prop.propertyDataKey.dlTreasure){
                var treaLvl = userData.propertyData[key];
                var demonLotusData = c_demonLotus[treaLvl];
                if(demonLotusData){
                    _addPropsToProp(propArr, demonLotusData.treaPropertys);
                }
            }
            if(key == c_prop.propertyDataKey.heartStunt){
                var heartData = userData.propertyData[key]||{};
                for(var key in heartData){
                    var locHeartId = parseInt(key);
                    var locHeartLvl = parseInt(heartData[key]||0);
                    var locHeartProps = _getHeartProps(locHeartId,locHeartLvl);
                    _addPropsToProp(propArr, locHeartProps);
                }
            }
        }
    }

    //宝物
    if(heroData.talismanData){
        var talismanData = heroData.talismanData;       //法宝数据{法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...},临时资质],法宝id:[等级,资质,星级,最高星级,{星级:技能id,星级:技能id,...},临时资质],....}
        for(var key in talismanData){
            var locTalId = parseInt(key);
            var locTalData = talismanData[key]||[];

            var talLvl = 0;     //等级
            var talAptitude = 0;        //资质
            var skillObj = {};
            if(locTalData[0]) talLvl = locTalData[0];
            if(locTalData[1]) talAptitude = locTalData[1];
            if(locTalData[4]) skillObj = locTalData[4];

            //基础属性
            var talismanLvl = t_talismanLvl[locTalId + talLvl];
            if(talismanLvl){
                _addPropsToProp(propArr, talismanLvl.propertys, talAptitude/1000);
            }
            //技能
            if(JSON.stringify(skillObj).length>2){
                for(var star in  skillObj){
                    var talismanSkill = t_talismanSkill[skillObj[star]];
                    if(talismanSkill.type == 1){
                        _addPropsToProp(propArr, talismanSkill.effect);
                    }
                }
            }
        }
        //共鸣
        var talismanFg = heroData.talismanFg;
        for(var key in talismanFg){
            var talismanRes = t_talismanRes[key];
            if(!talismanRes) continue;
            if(talismanRes.type == 1){
                var resArr = talismanFg[key]||[];
                var resonance = talismanRes.resonance;
                var isRes = true;
                var resLength = resonance.length;
                //预防
                if(resLength <= 0) continue;
                for(var i = 0; i < resLength; i++){
                    if(!resArr[i]) {
                        isRes = false;
                        break;
                    }
                }
                if(isRes){
                    _addPropsToProp(propArr, talismanRes.extraPro);
                }
            }
        }
    }

    //c_heartStuntLvl
    return propArr;
};

/**
 * 计算英雄战力
 * @param userData 必须包含lvl ,equipBag, id
 * @param heroData
 */
exports.calCombat = function(userData,heroData){
    var userLvl = userData.lvl,equipBag = userData.equipBag;
    /**
     * 基础属性战斗力公式
     * @param a 血量之和
     * @param a1 血量参数
     * @param b 攻击之和
     * @param b1 攻击参数
     * @param c 物防之和
     * @param c1 物防参数
     * @param d 魔防之和
     * @param d1 魔防参数
     * @param e 暴击之和
     * @param e1 暴击参数
     * @param f 抗暴之和
     * @param f1 抗暴参数
     * @param g 闪避之和
     * @param g1 闪避参数
     * @param h 命中之和
     * @param h1 命中参数
     * @param j 攻击频率
     * @param j1 攻击频率参数
     */
    var maxHp = getMaxHpFight(heroData);
    var attack = getAttackFight(heroData);
    var defence = getDefenceFight(heroData);
    var magicDefence = getMagicDefenceFight(heroData);
    var critical = getCriticalFight(heroData);
    var disCritical = getDisCriticalFight(heroData);
    var dodge = getDodgeFight(heroData);
    var hit = getHitFight(heroData);
    var attackInterval = attackIntervalFight(heroData);


    //参数1：血量参数
    //参数2：攻击参数
    //参数3：物防参数
    //参数4：魔防参数
    //参数5：暴击参数
    //参数6：抗暴参数
    //参数7：闪避参数
    //参数8：命中参数
    //参数9：攻击频率
    var maxHp1 = c_game.combatMult[0]/10000;
    var attack1 = c_game.combatMult[1]/10000;
    var defence1 = c_game.combatMult[2]/10000;
    var magicDefence1 = c_game.combatMult[3]/10000;
    var hit1 = c_game.combatMult[4]/10000;
    var dodge1 = c_game.combatMult[5]/10000;
    var critical1 = c_game.combatMult[6]/10000;
    var disCritical1 = c_game.combatMult[7]/10000;
    var attackInterval1 = c_game.combatMult[8];
    //基础属性战斗力公式
    //console.log(maxHp,maxHp1,attack,attack1,defence,defence1,magicDefence,magicDefence1,critical,critical1,disCritical,disCritical1,dodge,dodge1,hit,hit1,attackInterval,attackInterval1);
    var combat1 = formula.calBaseCombat(maxHp,maxHp1,attack,attack1,defence,defence1,magicDefence,magicDefence1,critical,critical1,disCritical,disCritical1,dodge,dodge1,hit,hit1,attackInterval,attackInterval1);

    //戒指战力公式
    /**
     * 戒指战力公式
     * @param a 戒指1
     * @param b 戒指2
     * @param c 戒指3
     * @param d 戒指4
     */
    var breakCombat1 = 0;
    var breakCombat2 = 0;
    var breakCombat3 = 0;
    var breakCombat4 = 0;
    //breakCombat1 =
    for(var key in heroData.equipData){
        var locItemUid = heroData.equipData[key];
        if(!locItemUid) continue;
        //物品基础属性
        var locItemId = locItemUid;
        var locItemBreak = t_itemBreak[locItemId];
        if(!locItemBreak) continue;

        if(key == c_prop.heroEquipIndexKey.paralysisRing){
            breakCombat1 = locItemBreak.combat;
        }
        if(key == c_prop.heroEquipIndexKey.reviveRing){
            breakCombat2 = locItemBreak.combat;
        }
        if(key == c_prop.heroEquipIndexKey.protectRing){
            breakCombat3 = locItemBreak.combat;
        }
        if(key == c_prop.heroEquipIndexKey.harmRing){
            breakCombat4 = locItemBreak.combat;
        }
    }

    var combat2 = formula.calBreakCombat(breakCombat1,breakCombat2,breakCombat3,breakCombat4);
    //技能战力公式
    /**
     * 技能战力公式
     * @param k 第1技能战力
     * @param k1 第1技能等级
     * @param l 第2技能战力
     * @param l1 第2技能等级
     * @param m 第3技能战力
     * @param m1 第3技能等级
     * @param n 第4技能战力
     * @param n1 第4技能等级
     * @param s 第5技能战力
     * @param s1 第5技能等级
     */

    var skillCombatArr = [0,0,0,0,0];
    var skillLvlArr = [0,0,0,0,0];
    var skillOpenNeedArr = c_game.skillRate[4];
    skillOpenNeedArr = skillOpenNeedArr.split(",");
    var t_heroData = t_hero[heroData.tempId];
    var tempSkillIds = t_heroData.skillIds;
    for(var i = 0;i<tempSkillIds.length;i++){
        var locSkillId = tempSkillIds[i];
        var locTalentSkillId = _getReplaceTalentSkillId(i,heroData.talismanData);
        if(locTalentSkillId) locSkillId = locTalentSkillId;
        var locSkillData = t_skill[locSkillId];
        if(!locSkillData) continue;
        var locNeedLvl = parseInt(skillOpenNeedArr[i]) ;

        if(userLvl>=locNeedLvl){
            //开启的
            skillCombatArr[i] = locSkillData.combat;
            skillLvlArr[i] = heroData.skillLvlArr[i]||1;
        }
    }
    var combat3 = formula.calSkillCombat(skillCombatArr[0],skillLvlArr[0],skillCombatArr[1],skillLvlArr[1],skillCombatArr[2],skillLvlArr[2],skillCombatArr[3],skillLvlArr[3],skillCombatArr[4],skillLvlArr[4]);
    //console.log(combat1,combat2,combat3);
    var allCombat = combat1+combat2+combat3;
    allCombat = parseInt(allCombat);
    return allCombat;
};

//获取法宝技能        [技能id,技能id,...]
var _getTalismanSkill = function(talismanData){
    var self = this;
    var returnArr = [];
    for(var key in talismanData){
        var skillObj = talismanData[key][4]||{};
        for(var key1 in skillObj){
            returnArr.push(skillObj[key1]);
        }
    }
    return returnArr;
}

var _getReplaceTalentSkillId = function(index,talismanData){
    var skillArr = _getTalismanSkill(talismanData);
    var reSkillId = 0;//

    for(var i = 0;i<skillArr.length;i++){
        var locSkillId = skillArr[i];
        if(!locSkillId) continue;
        var locSkillData = t_talismanSkill[locSkillId];
        var locType = locSkillData.type;
        if(locType!=c_prop.talismanSkillTypeKey.replaceSkill) continue;
        var locTeffect = locSkillData.effect||[];
        locTeffect = locTeffect[0];
        if(!locTeffect) continue;
        var locIndex = locTeffect[0];
        var locTalentSkillId = locTeffect[1];
        if(index!=locIndex) continue;

        if(locTalentSkillId>reSkillId){
            reSkillId = locTalentSkillId;
        }
    }
    return reSkillId;
}


var _clearPropArr = function(propArr){
    for(var i = 0;i<MAX_PROP+1;i++){
        propArr[i] = 0;
    }
};

var _addPropValue = function(propArr,index,value){
    if(!index||!value) return;
    propArr[index]+=value;
};

var _addPropsToProp = function(propArr,props,mult){
    mult = mult || 0;
    if(!props) return;
    for(var i = 0;i<props.length;i++){
        var locData = props[i];
        if(!locData) continue;
        var locIndex = locData[0];
        if(!locIndex) continue;
        propArr[locIndex]+=locData[1]*(1+mult);
    }
};

//生命
var getMaxHpFight = function (heroData) {
    return _getFightPropByIndex(heroData, 1, 2, 33);
}

//物攻
var getAttackFight = function (heroData) {
    return _getFightPropByIndex(heroData, 3, 4, 34);
}

//物防
var getDefenceFight = function (heroData) {
    return _getFightPropByIndex(heroData, 5, 6, 35);
}

//魔防
var getMagicDefenceFight = function (heroData) {
    return _getFightPropByIndex(heroData, 7, 8, 36);
}

//命中
var getHitFight = function (heroData) {
    return _getFightPropByIndex(heroData, 9, 10, 37);
}

//闪避
var getDodgeFight = function (heroData) {
    return _getFightPropByIndex(heroData, 11, 12, 38);
}

//暴击
var getCriticalFight = function (heroData) {
    return _getFightPropByIndex(heroData, 13, 14, 39);
}

//抗暴
var getDisCriticalFight = function (heroData) {
    return _getFightPropByIndex(heroData, 15, 16, 40);
}

//攻击速度
var attackIntervalFight = function(heroData){
    return _getFightPropByIndex(heroData,21,22,43);
}

var _getPropByIndex = function(heroData,index){
    return heroData.propArr[index];
};

var _getFightPropByIndex = function(heroData, baseIndex, scaleIndex, tempScale){
    return Math.floor(_getPropByIndex(heroData,baseIndex)*(1+_getPropByIndex(heroData,scaleIndex)/10000)+_getPropByIndex(heroData,tempScale));
};

//单次攻击最高伤害
exports.getDamageMaxAHit = function(heroData, target, lvl){      //target = t_monster[32];
    var skill;
    var critDamage, defence, damage, maxDamage=0;

    critDamage = _getCritDamage(getCriticalFight(heroData), target.disCritical);
    defence = _getDefence(target.defense, target.magicDefence, heroData.tempId, lvl, getAttackFight(heroData));

    var skillOpenNeedArr = c_game.skillRate[4];
    skillOpenNeedArr = skillOpenNeedArr.split(",");
    var tempSkillIds = t_hero[heroData.tempId].skillIds;
    var skillArr = [];
    for(var i = 0;i<tempSkillIds.length;i++){
        var locNeedLvl = parseInt(skillOpenNeedArr[i]) ;
        if(lvl>=locNeedLvl){
            skillArr.push(heroData.skillLvlArr[i]||1);
        }
    }

    for(var i=0; i<skillArr.length; ++i){
        skill = t_skill[tempSkillIds[i]];        // 获取技能表数据
        var skillLevel = skillArr[i];  // 技能等级
        if(skillLevel==0)
            continue;
        var hpCoefficient = _getHpCoefficient(skill, skillLevel);
        if(hpCoefficient<0){
            damage = getAttackFight(heroData);
            damage *= (1-defence);
            damage = (damage + damage*critDamage);
            damage *= 1+getDamageIncreaseFight(heroData)-target.damageDecrease;
            damage *= hpCoefficient;

        }else{
            damage = 0;
        }
        damage = -damage;
        damage = Math.ceil(damage);
        if(damage>maxDamage){
            maxDamage = damage;
        }
    }

    return maxDamage;
}

//计算单个英雄秒伤
exports.getDamagePerSec = function(heroData, target, lvl){      //target = t_monster[32];
    var skill;
    var hitRate, critRate, critDamage, defence, damage;
    var skillDamagePerSecs = [];

    hitRate = _getHitRate(getHitFight(heroData), target.dodge);
    critRate = _getCriticalRate(getCriticalFight(heroData), target.disCritical);
    critDamage = _getCritDamage(getCriticalFight(heroData), target.disCritical);
    defence = _getDefence(target.defense, target.magicDefence, heroData.tempId, lvl, getAttackFight(heroData));

    var skillOpenNeedArr = c_game.skillRate[4];
    skillOpenNeedArr = skillOpenNeedArr.split(",");
    var tempSkillIds = t_hero[heroData.tempId].skillIds;
    var skillArr = [];
    for(var i = 0;i<tempSkillIds.length;i++){
        var locNeedLvl = parseInt(skillOpenNeedArr[i]) ;
        if(lvl>=locNeedLvl){
            skillArr.push(heroData.skillLvlArr[i]||1);
        }
    }

    var damagePerSec = 0;
    for(var i=0; i<skillArr.length; ++i){
        skill = t_skill[tempSkillIds[i]];        // 获取技能表数据
        var skillLevel = skillArr[i];  // 技能等级
        if(skillLevel==0)
            continue;
        var hpCoefficient = _getHpCoefficient(skill, skillLevel);
        if(hpCoefficient<0){
            damage = getAttackFight(heroData);
            damage *= (1-defence);
            damage = (damage + damage*critRate*critDamage)/(1+critRate);
            damage *= 1+getDamageIncreaseFight(heroData)-target.damageDecrease;
            damage *= hpCoefficient;
            damage *= hitRate;

            damagePerSec += (-damage*1000/(skill.cd*10));
        }else{
            damage = 0;
        }
    }

    return damagePerSec;
}

var getDamageIncreaseFight = function(heroData){
    return (_getPropByIndex(heroData, 23)+_getPropByIndex(heroData, 44))/10000;
}
var getDamageDecreaseFight = function(heroData){
    return (_getPropByIndex(heroData, 24)+_getPropByIndex(heroData, 45))/10000;
}

var _getHitRate = function(hitFight, dodgeFightTarget) {//是否命中成功，b对方的闪避
    return hitFight / (hitFight + dodgeFightTarget);
}

var _getCriticalRate = function (criticalFight, disCriticalFightTarget) {//是否暴击，b对方的抗暴
    return criticalFight / (criticalFight + disCriticalFightTarget);
}
var _getCritDamage = function(criticalFight, disCriticalFightTarget) {//获取暴击伤害，b对方的抗爆
    return criticalFight / (criticalFight + disCriticalFightTarget) * 3;
}

var _getDefence = function(defenceFight, magicDefenceFight, attackType, roleLevel, attack) {//获取防御，b攻击者的攻击行为， a攻击者等级
    //var def = 0;
    //def = attackType == 1 ? defenceFight : attackType == 2 ? magicDefenceFight : (magicDefenceFight + defenceFight) / 2;
    //return 20000 >= def ? 0.002 * def / (1 + 0.8 * attackRoleLevel + 0.002 * def) : 40 / (0.8 * attackRoleLevel + 41) + 0.001 * (def - 20000) / (1 + 0.8 * attackRoleLevel + 0.001 * (def - 20000));

    var def = attackType == 1 ? defenceFight : attackType == 2 ? magicDefenceFight : (magicDefenceFight + defenceFight) / 2;
    var curDef;
    if(def<=10000){
        curDef = 0.002*def/(1+0.015*roleLevel+0.002*def);
        curDef = Math.min(curDef, 0.6);
    }else if(def<60000){
        curDef = 100/(1+0.8*roleLevel+100)+0.001*(def-10000)/(1+1.25*roleLevel+0.001*(def-10000));
        curDef = Math.min(curDef, 0.9);
    }else{
        if(attack<120000){
            curDef = 0.8+def/(def+4000000);
        }else{
            curDef = def/(def+attack*0.125);
        }
        curDef = Math.min(curDef, 0.9);
    }

    return curDef;
}

var _getHpCoefficient=function(skillInfo, skillLevel){
    return (skillInfo.damage + skillInfo.damageScaleA * (skillLevel - 1)) / 10000;
}

var __heartPropCache = {};
var _getHeartProps = function(heartId,hearLvl){
    var heartLvlId = heartId+hearLvl;
    var heartProps = __heartPropCache[heartLvlId];
    if(heartProps) return heartProps;
    heartProps = [];
    for(var i = 0;i<= hearLvl;i++){
        var heartStuntLvlData = c_heartStuntLvl[heartId+i];
        if(!heartStuntLvlData) continue;
        if(!heartStuntLvlData.addProperty)continue;
        heartProps.push(heartStuntLvlData.addProperty);
    }
    __heartPropCache[heartLvlId] = heartProps;
    return heartProps;
};