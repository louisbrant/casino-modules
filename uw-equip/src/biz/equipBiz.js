var uwData = require("uw-data");
var formula = require("uw-formula");
var consts = uwData.consts;
var c_prop = uwData.c_prop;
var c_game = uwData.c_game;
var t_item = uwData.t_item;
var t_sellItem = uwData.t_sellItem;
var c_msgCode = uwData.c_msgCode;
var c_customParameter = uwData.c_customParameter;
var t_inheritedEquip = uwData.t_inheritedEquip;
var t_itemEquip = uwData.t_itemEquip;

var UserEntity = require('uw-entity').UserEntity;
var propUtils = require("uw-utils").propUtils;
var EventEntity = require('uw-entity').EventEntity;
var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var exports = module.exports;

var heroDao = null;
var userDao = null;
var userUtils = null;
var heroPropHelper = null;
var mailBiz = null;
var chatBiz = null;
var commonUtils = null;

var checkRequire = function(){
    commonUtils = commonUtils||require("uw-utils").commonUtils;
    chatBiz = chatBiz||require("uw-chat").chatBiz;
     heroDao = heroDao||require("uw-hero").heroDao;
     userDao = userDao||require("uw-user").userDao;
     userUtils = userUtils||require("uw-user").userUtils;
     heroPropHelper = heroPropHelper||require('uw-hero').heroPropHelper;
    mailBiz = mailBiz||require("uw-mail").mailBiz;
};

/**
 * 装备
 * @param client
 * @param userId
 * @param tempId   英雄id
 * @param index   装备位置
 * @param equipId   装备id
 * @param cb
 */
exports.changeEquip = function(client,userId,tempId,index,equipId,cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            heroDao.select(client,{userId:userId,tempId:tempId},cb1);
        }
    ],function(err,data){
        if(err) return cb(err);
        var userData = data[0],heroData = data[1];
        var equipBag = userData.equipBag||{};
        var equipData = heroData.equipData||{};
        var equipLvl = t_item[equipBag[equipId][0]].level;      //等级需求
        var type = t_itemEquip[equipBag[equipId][0]].type;       //装备类型
        var job = t_itemEquip[equipBag[equipId][0]].job;     //职业
        if(!equipBag[equipId]) return cb("背包没有该装备");
        if(equipBag[equipId][3] == 1) return cb("该装备已装备");
        var equipType = 0;
        switch (parseInt(index)){
            case c_prop.heroEquipIndexKey.weapon:
                equipType = c_prop.equipTypeKey.weapon;
                break;
            case c_prop.heroEquipIndexKey.clothes:
                equipType = c_prop.equipTypeKey.clothes;
                break;
            case c_prop.heroEquipIndexKey.bracelet1:
                equipType = c_prop.equipTypeKey.bracelet;
                break;
            case c_prop.heroEquipIndexKey.ring1:
                equipType = c_prop.equipTypeKey.ring;
                break;
            case c_prop.heroEquipIndexKey.paralysisRing:
                equipType = c_prop.equipTypeKey.paralysisRing;
                break;
            case c_prop.heroEquipIndexKey.reviveRing:
                equipType = c_prop.equipTypeKey.reviveRing;
                break;
            case c_prop.heroEquipIndexKey.protectRing:
                equipType = c_prop.equipTypeKey.protectRing;
                break;
            case c_prop.heroEquipIndexKey.harmRing:
                equipType = c_prop.equipTypeKey.harmRing;
                break;
            case c_prop.heroEquipIndexKey.ring2:
                equipType = c_prop.equipTypeKey.ring;
                break;
            case c_prop.heroEquipIndexKey.bracelet2:
                equipType = c_prop.equipTypeKey.bracelet;
                break;
            case c_prop.heroEquipIndexKey.helmet:
                equipType = c_prop.equipTypeKey.helmet;
                break;
            case c_prop.heroEquipIndexKey.necklace:
                equipType = c_prop.equipTypeKey.necklace;
                break;
        }
        if(type != equipType) return cb("该装备不属于该部位");
        if(job != tempId) return cb("不属于该职业装备");
        if(userData.lvl < equipLvl) return cb("等级不够");
        var equipBagItems = {};

        //判断身上是否已有装备
        if(equipData[index]){
            var nowId = equipData[index];
            userData.equipBag[nowId][3] = 0;     //设置原来装备物品为未装备
            equipBagItems[nowId] = userData.equipBag[nowId];
        }

        //装备物品
        userData.equipBag[equipId][3] = 1;     //设置原来装备物品为未装备  装备背包 {"1":[物品id,[随到的属性值],评价,是否穿戴],...}  "1":指定id,累加上去的
        equipBagItems[equipId] = userData.equipBag[equipId];
        heroData.equipData[index] = parseInt(equipId);
        heroData.propArr =  heroPropHelper.calHeroProp(userData,heroData);
        heroData.combat = heroPropHelper.calCombat(userData,heroData);

        //更新
        var upUserData = {
            equipBag:userData.equipBag
        };
        var upHeroData = {
            propArr:heroData.propArr,
            equipData:heroData.equipData,
            combat:heroData.combat
        };
        async.parallel([
            function(cb2){
                userDao.update(client,upUserData,{id:userId},cb2);
            },
            function(cb2){
                heroDao.update(client,upHeroData,{id:heroData.id},cb2);
            }
        ],function(err,upData) {
            if (err) return cb(err);
            cb(null,[upHeroData,equipBagItems]);
        });
    });
};


/**
 * 传承
 * @param client
 * @param userId
 * @param equipId   装备id
 * @param tempId
 * @param cb
 */
exports.inheritedEquip = function(client, userId, equipId, tempId,cb) {
    checkRequire();
    //先判断是否为可传承装备
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},cb1);
        },
        function(cb1){
            heroDao.select(client,{userId:userId,tempId:tempId},cb1);
        }
    ],function(err,data) {
        if (err) cb(err);
        var userData = data[0];
        var heroData = data[1];
        var equipBag = userData.equipBag||{};
        var bag = userData.bag || {};
        if (!equipBag[equipId]){
            return cb("尚未拥有该装备");
        }

        var inheritedData = t_inheritedEquip[equipBag[equipId][0]];
        if (!inheritedData) {
            return cb("该装备不可传承");
        }
        //var index = 0;
        //获得下一级传承的信息
        //if (equipBag[equipId].length < 3){
        //    return cb("背包数据有误")
        //}
        //else if (equipBag[equipId].length < 4) {//装备未传承
        //    userData.equipBag[equipId] = [equipBag[equipId][0], equipBag[equipId][1], equipBag[equipId][2], 0];
        //    index = 0;
        //}else {//装备已传承，
        //    index = userData.equipBag[equipId][3];
        //}
        var nextEquipId = inheritedData.nextId;
        if (nextEquipId == 0) {
            return cb("已是顶级装备");
        }


        //先判断等级是否满足
        if (t_item[nextEquipId].level > userData.lvl) {
            return  cb("角色等级不足");
        }
        //判断是否拥有传承道具
        var costItemId = c_game.inheritedEquip[0];
        var num  = bag[costItemId] || 0;
        var needNum = inheritedData.num;
        if (needNum > num) {
            return cb("道具不足");
        }

        bag[costItemId] -= needNum;
        if (bag[costItemId] <= 0) {
            delete bag[costItemId];
        }
        userData.bag = bag;

        //判断元宝是否够
        /*var needDiamond = inheritedData.diamond;
        if (needDiamond > userData.diamond) {
            return cb(getMsg(c_msgCode.noDiamond));
        }*/

        //userUtils.reduceDiamond(userData, needDiamond);
        //开始传承
        userData.equipBag[equipId][0] = nextEquipId;
        var equipData = t_itemEquip[nextEquipId] || {};
        var randomArr = equipData.fixProp; //装备随到的属性值
        var gradeBase = exports.getEquipGrade(nextEquipId,randomArr);       //装备评分
        userData.equipBag[equipId][1] = randomArr;
        userData.equipBag[equipId][2] = gradeBase;
        var upHeroData = {};
        if (heroData) {
            heroData.propArr = heroPropHelper.calHeroProp(userData, heroData);
            heroData.combat = heroPropHelper.calCombat(userData, heroData);
            upHeroData = {
                propArr:heroData.propArr,
                equipData:heroData.equipData,
                combat:heroData.combat
            };
        }

        //更新
        var upUserData = {
            bag: userData.bag,
            equipBag:userData.equipBag
        };

        var equipBagItems = {};
        equipBagItems[equipId] = userData.equipBag[equipId];

        var bagItems = {};
        bagItems[costItemId] = needNum;


        async.parallel([
            function(cb2){
                userDao.update(client,upUserData,{id:userId},cb2);
            },
            function(cb2){
                if (heroData) {
                    heroDao.update(client, upHeroData, {id: heroData.id}, cb2);
                }else {
                    cb2(null);
                }
            }
        ],function(err,upData) {
            if (err) return cb(err);
            delete upUserData.equipBag;
            delete upUserData.bag;
            cb(null,[bagItems, upUserData, upHeroData, equipBagItems]);
        });
    });
};

/**
 * 定制武器
 * @param client
 * @param userId
 * @param certificate
 * @param job
 * @param name
 * @param lvl
 * @param abilityIndex
 * @param cb
 */
exports.customization = function(client,userId,certificate,job,name,lvl,abilityIndex,equipType,cb){
    checkRequire();
    var equipTypeKey = [0,1,2,3,4,5];
    if(equipTypeKey.indexOf(parseInt(equipType)) == -1) return cb("部位错误");
    if(!c_customParameter[certificate]) return cb("定制凭证错误");
    var lvlMin = c_customParameter[certificate].equip_lvl_range[0];
    var lvlMax = c_customParameter[certificate].equip_lvl_range[1];
    if(lvl<lvlMin) return cb("最小等级为"+lvlMin+"级");
    if(lvl>lvlMax) return cb("最大等级为"+lvlMax+"级");
    //限制长度
    if(name.indexOf(" ")>=0) return cb("名称不能包含空格");
    if(name.indexOf("\n")>=0 || name.indexOf("\\n")>=0 || name.indexOf("\r")>=0 || name.indexOf("\\r")>=0|| name.indexOf("\"")>=0) return cb("名称不能包含回车换行或双引号");
    name=name.replace("\\n","");name=name.replace("\n","");
    name=name.replace("\\r","");name=name.replace("\r","");
    name=name.replace("\"","");
    var nameLength = commonUtils.getStringLength(name);
    if(nameLength<= 0) return cb(getMsg(c_msgCode.noItemName));//长度超出啦
    if(nameLength>12) return cb(getMsg(c_msgCode.nameToolong));//长度超出啦
    //过滤敏感字符
    if(commonUtils.checkFuckWord(name)) return cb(getMsg(c_msgCode.fuckWord));
    if(c_game.customizationCfg[3].indexOf(certificate.toString()) == -1) return cb("定制凭证错误");
    var customizationId = _getCustomizationId(certificate,job,lvl,equipType);     //定制武器id
    if(!t_itemEquip[customizationId]) return cb("没有该定制装备");
    if((abilityIndex.length-1) != c_game.customizationCfg[12]) return cb(getMsg(c_msgCode.choseProperty));
    var itemEquip = t_itemEquip[customizationId];
    var propertys = itemEquip.propertys;
    for(var i=0;i<abilityIndex.length;i++){
        if(!propertys[abilityIndex[i]]) return cb("属性勾选出错");
    }
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData){
        if(err) return cb(err);
        //if(c_customParameter[certificate].vip > userData.vip && c_customParameter[certificate].gainType <=1) return cb("vip等级不足！");
        var bag = userData.bag;
        if(!bag[certificate] || bag[certificate] == 0) return cb("缺少定制凭证");

        //获得定制装备
        var mailItems = {};
        var delBagItems = {};
        var equipBagItems = {};
        //var basisArr = [];      //装备基础属性值
        var randomArr =[];      //装备随到的属性值
        var random = c_game.customizationCfg[1]/10000;
        for(var i=0;i<abilityIndex.length;i++){
            var valueArr = propertys[abilityIndex[i]];      //属性数组【id：值】
            //basisArr.push(valueArr);
            randomArr.push([valueArr[0],Math.round(valueArr[1]*random)]);
        }
        var equipBagResGrid = userUtils.getEquipBagResGrid(userData);       //装备背包剩余格数
        if(equipBagResGrid >= 1){          //装备需要判断背包是否有空间
            var equipMaxId = 1;
            if (userData.equipBag != null && JSON.stringify(userData.equipBag) != "{}") equipMaxId = parseInt(commonUtils.getLastKey(userData.equipBag)) + 1;
            userData.equipBag[equipMaxId] = [customizationId, randomArr, 0, 0, name, abilityIndex];             //[物品id,[随到的属性值],评价,是否穿戴,name,[基础属性]]
            equipBagItems[equipMaxId] = [customizationId, randomArr, 0, 0, name, abilityIndex];
        }else{
            mailItems[customizationId] = [1,randomArr,0, name, abilityIndex];
        }
        //扣除物品
        userData.bag[certificate] -= 1;
        delBagItems[certificate] = 1;
        if(userData.bag[certificate] == 0) delete userData.bag[certificate];

        //更新
        var updateData = {
            bag: userData.bag,
            equipBag: userData.equipBag
        };
        userDao.update(client,updateData,{id:userId},function(err,upData){
            if (err) return cb(err);
            var color = c_customParameter[certificate].color;
            if(color == 6){
                chatBiz.addSysData(85,[userData.nickName]);
                chatBiz.addSysData(86,[userData.nickName]);
            }else{
                chatBiz.addSysData(68,[userData.nickName]);
                chatBiz.addSysData(69,[userData.nickName]);
            }
            var isMail = false;
            if(JSON.stringify(mailItems) != "{}"){
                mailBiz.addByType(client, userId, c_prop.mailTypeKey.equipChest, [], mailItems, function(err,data1){
                    if (err) return cb(err);
                    isMail = true;
                    return cb(null, [delBagItems,equipBagItems,isMail]);     //if(mailList.length == returnArr.length)
                });
            }else{
                return cb(null, [delBagItems,equipBagItems,isMail]);     //if(mailList.length == returnArr.length)
            }
        });
    });
};

/**
 * 升级定制武器
 * @param client
 * @param userId
 * @param equipId
 * @param cb
 */
exports.upCustomization = function(client,userId,equipId,cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData) {
        if (err) return cb(err);
        var equipBag = userData.equipBag;
        if(!equipBag[equipId]) return cb("背包没有该装备");
        var customizationId = parseInt(equipBag[equipId][0]);
        var newCustomizationId = customizationId+10;
        if(!t_itemEquip[newCustomizationId]) return cb("定制武器已升到最高级");
        var level = t_item[newCustomizationId].level;
        if(userData.lvl<level) return cb("人物等级需要达到"+level+"级");
        var needId = c_game.customizationCfg[2];        //需要材料id
        var needCount = 999999;
        var needArr = c_game.customizationCfg[4].split(",");        //需要材料数量Arr
        switch (t_item[customizationId].itemLvl){
            case 120:
                needCount = needArr[0];
                break;
            case 130:
                needCount = needArr[1];
                break;
            case 140:
                needCount = needArr[2];
                break;
            case 150:
                needCount = needArr[3];
                break;
            case 160:
                needCount = needArr[4];
                break;
            case 170:
                needCount = needArr[5];
                break;
            case 180:
                needCount = needArr[6];
                break;
            case 190:
                needCount = needArr[7];
                break;
        }
        if(!userData.bag[needId] || userData.bag[needId]<needCount) return cb("材料不足");

        var delBagItems = {};
        var equipBagItems = {};
        //升级        [物品id,[随到的属性值],评价,是否穿戴,name,[基础属性]]
        userData.equipBag[equipId][0] = parseInt(newCustomizationId);
        //var basisArr = [];      //装备基础属性值
        //var abilityArr = userData.equipBag[equipId][5];
        //var propertys = t_itemEquip[newCustomizationId].propertys;
        //for(var i=0;i<abilityArr.length;i++){
        //    var id = abilityArr[i][0];      //属性数组【id：值】
        //    for(var j=0;j<propertys.length;j++){
        //        if(propertys[j][0] == id){
        //            basisArr.push(propertys[j]);
        //            break;
        //        }
        //    }
        //}
        //userData.equipBag[equipId][5] = basisArr;
        equipBagItems[equipId] = userData.equipBag[equipId];
        //扣除材料
        userData.bag[needId] -= needCount;
        delBagItems[needId] = needCount;
        if(userData.bag[needId] == 0) delete userData.bag[needId];

        //更新
        var updateData = {
            bag: userData.bag,
            equipBag: userData.equipBag
        };
        userDao.update(client,updateData,{id:userId},function(err,upData){
            if (err) return cb(err);
            return cb(null, [delBagItems,equipBagItems]);     //if(mailList.length == returnArr.length)
        });
    });
};


/*****************************************************************************************************/

var _getCustomizationId = function(certificate,job,lvl,equipType){
    //var equipType = "00";
    var jobStr = job.toString();
    //var part = c_customParameter[certificate].part;
    var color = c_customParameter[certificate].color;
    //if(part == 0){
    //    equipType = c_prop.equipTypeKey.weapon.toString();
    //}else if(part == 1){
    //    equipType = c_prop.equipTypeKey.clothes.toString();
    //}else if (part == 10) {
    //    equipType = c_prop.equipTypeKey.helmet.toString();
    //} else if (part == 3) {
    //    equipType = c_prop.equipTypeKey.ring.toString();
    //} else if (part == 2) {
    //    equipType = c_prop.equipTypeKey.bracelet.toString();
    //} else if (part == 11) {
    //    equipType = c_prop.equipTypeKey.necklace.toString();
    //}
    if(color == 6) jobStr = (parseInt(job) + 3).toString();
    var customizationId = "9" + jobStr + equipType.toString() + (Math.ceil(lvl/10)*10).toString();
    return parseInt(customizationId);
};

//输出指定范围内的随机数的随机整数
var _getRandomNumber = function(start,end){
    var choice=end-start+1;
    return Math.floor(Math.random()*choice+start);
};

//装备随到的属性值  templateId:装备模板id
exports.getRandomAbility = function(templateId){
    checkRequire();
    var randomArr = [];
    var propertys = [].concat(t_itemEquip[templateId].propertys);       //模板装备属性
    var rate = t_itemEquip[templateId].randomRate;       //随机加成属性倍率
    var randomPro = t_itemEquip[templateId].randomPro;      //随机属性个数概率
    var randomNum = _getRandomNumber(1, 10000);
    var count = 0;
    var proSum = 0;
    for(var i = 0;i < randomPro.length;i++){
        proSum += randomPro[i][1];
        if (randomNum <= proSum) {
            count = randomPro[i][0];
            break;
        }
    }
    //var indexArr = [];
    //for(var i = 0;i < propertys.length;i++){
    //    indexArr.push(i);
    //}
    for(var i = 0;i < count;i++){
        var randomindex = _getRandomNumber(0, (propertys.length-1));
        var abilityId = propertys[randomindex][0];        //属性id
        var abilityValue = propertys[randomindex][1];        //属性值
        var randomAbility = formula.calEquipSubjoin(abilityValue,rate);       //0:装备属性; 1:装备属性随机倍率
        randomArr.push([abilityId,randomAbility]);
        propertys.splice(randomindex,1);
        //indexArr.splice(randomindex,1);
    }
    var min = c_game.equipMinRandomCfg[0];
    var max = c_game.equipMinRandomCfg[1];
    for(var i = 0;i < propertys.length;i++){
        var value = Math.ceil(propertys[i][1]*_getRandomNumber(min,max)/10000);        //属性值
        randomArr.push([propertys[i][0],value]);
    }

    return randomArr;
};

//装备评分计算        templateId:装备模板id  randomArr:额外属性数组
exports.getEquipGrade = function(templateId,randomArr){
    checkRequire();
    var gradeBase = t_itemEquip[templateId].gradeBase;       //模板装备基础评分
    var extraGrade = 0;     //额外评分
    var equipGrade = 0;     //装备附加参数
    for(var i = 0;i < randomArr.length;i++){
        var abilityId = randomArr[i][0];        //属性id
        var abilityValue = randomArr[i][1];        //属性值
        switch (abilityId){
            case c_prop.equipPropKey.maxHpTemp:        //生命
                equipGrade = c_game.equipGrade[0];
                break;
            case c_prop.equipPropKey.attackTemp:       //攻击
                equipGrade = c_game.equipGrade[1];
                break;
            case c_prop.equipPropKey.defenceTemp:      //物防
                equipGrade = c_game.equipGrade[2];
                break;
            case c_prop.equipPropKey.magicDefenceTemp:     //法防
                equipGrade = c_game.equipGrade[3];
                break;
            case c_prop.equipPropKey.hitTemp:      //命中
                equipGrade = c_game.equipGrade[4];
                break;
            case c_prop.equipPropKey.dodgeTemp:        //闪避
                equipGrade = c_game.equipGrade[5];
                break;
            case c_prop.equipPropKey.criticalTemp:     //暴击
                equipGrade = c_game.equipGrade[6];
                break;
            case c_prop.equipPropKey.disCriticalTemp:      //抗暴
                equipGrade = c_game.equipGrade[7];
                break;
        }
        extraGrade += equipGrade*abilityValue;
    }
    gradeBase += extraGrade;
    return gradeBase;
};


//updateEquipItemLockStatus
exports.updateEquipItemLockStatus = function(client,userId,equipId,isLocked,cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData) {
        if (err) return cb(err);
        var equipBag = userData.equipBag;
        var equipItemData = equipBag[equipId];
        if(!equipItemData) return cb("背包没有该装备");
        if(equipItemData[3]){
            return cb("已穿戴的装备不可锁定");
        }
        if(equipItemData[6] == isLocked){
            return cb(null);
        }else {
            equipItemData[6] = isLocked;
        }
        equipBag[equipId] =  equipItemData;
        userData.equipBag = equipBag;
        var equipBagItems = {};
        equipBagItems[equipId] = userData.equipBag[equipId];
        var updateData = {
            equipBag: userData.equipBag
        };
        userDao.update(client,updateData,{id:userId},function(err,upData){
            if (err) return cb(err);
            return cb(null, equipBagItems);     //if(mailList.length == returnArr.length)
        });
    });
};


exports.sellEquipItems = function(client,userId,equipIdArr,cb){
    checkRequire();
    userDao.select(client,{id:userId},function(err,userData) {
        if(err) return cb(err);
        var equipBag = userData.equipBag;
        var bagItems = {};
        var items = {};
        var delEquipBagArr = [];
        if(equipIdArr.length <= 0){
            return cb("当前未选中任何装备");
        }
        var costDiamond = 0;
        for(var i=0; i<equipIdArr.length; i++){
            var equipId = equipIdArr[i];
            var equipItemData = equipBag[equipId];
            if(!equipItemData) return cb("背包没有该装备");
            var sellItemData = t_sellItem[equipItemData[0]];
            var equipData = t_itemEquip[equipItemData[0]];
            if(!sellItemData) return cb("该装备不可出售");
            if(equipItemData[3]){
                return cb("已穿戴的装备不可出售");
            }
            if(equipItemData[6] || (equipItemData[6]==undefined && equipData.isLocked)){
                return cb("已锁定的装备不可出售")
            }
            var sellItems = sellItemData.items;
            var sells = sellItemData.sells;
            if(sells){
                if(sells[0][0] == c_prop.spItemIdKey.diamond)
                    costDiamond += sells[0][1];
            }

            for(var key in sellItems){
                var item = sellItems[key];
                if(t_item[item[0]].type == c_prop.itemTypeKey.equip) {
                    return cb("目前不支持获得装备")
                }
                items[item[0]] = item[1];
            }
            var itemsArr = userUtils.saveItems(userData,items);
            if(Object.keys(itemsArr[0]).length>0) bagItems = propUtils.mergerProp(bagItems,itemsArr[0]);
            delEquipBagArr.push(equipId);
            delete equipBag[equipId];
        }
        if(costDiamond){
            if(userData.diamond < costDiamond)
                return cb(getMsg(c_msgCode.noDiamond));
            userUtils.reduceDiamond(userData,costDiamond);
        }
        var getGold = userUtils.getNumOfItems(items,c_prop.itemTypeKey.gold);
        var getDiamond = userUtils.getNumOfItems(items,c_prop.itemTypeKey.diamond);
        var updateUser = {
            gold: userData.gold,
            diamond: userData.diamond,
            bag: userData.bag,
            equipBag:userData.equipBag
        }
        userDao.update(client, updateUser, {id:userData.id}, function(err, data){
            if (err) return cb(err);
            delete updateUser.bag;
            delete updateUser.equipBag;
            return cb(null, [updateUser,bagItems,getDiamond, delEquipBagArr,costDiamond]);
        });
    });
};

