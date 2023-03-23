var uwData = require("uw-data");
var t_warrior = uwData.t_warrior;
var t_hero = uwData.t_hero;
var c_secret = uwData.c_secret;
var t_itemEquipExclusive = uwData.t_itemEquipExclusive;

/** 专属映射到warrior */
var exclusiveToWarrior = exports.exclusiveToWarrior = {};
for (var id in t_warrior) {
    var temp = t_warrior[id];
    if(temp && temp.exclusiveId){
        exclusiveToWarrior[temp.exclusiveId] = parseInt(id);
    }
}

/** warrior映射到秘术 */
var warriorToSecret = exports.warriorToSecret = {};
var secretToExclusives = exports.secretToExclusives = {};
//todo 临时注释
/*for(var id in c_secret){
    var temp = c_secret[id];
    if(temp){
        var heroTempIds = temp.heroIds;
        var exclusives = [];
        var tempId = parseInt(id);
        for(var i = 0, li = heroTempIds.length; i < li; ++i){
            var warriorId = t_hero[heroTempIds[i]].tid;
            warriorToSecret[warriorId] = tempId;
            var warriorTemp = t_warrior[warriorId];
            exclusives.push(warriorTemp.exclusiveId);
        }
        secretToExclusives[tempId] = exclusives;
    }
}*/

/** 专属映射到秘术 */
var exclusiveToSecret = exports.exclusiveToSecret = {};
//todo 临时注释
/*for(var id in t_itemEquipExclusive){
    var temp = c_secret[id];
    if(temp){
        var tempId = parseInt(id);
        exclusiveToSecret[tempId] = warriorToSecret[exclusiveToWarrior[tempId]];
    }
}*/
