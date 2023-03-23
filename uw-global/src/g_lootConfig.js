/**
 * Created by Administrator on 2016/4/19.
 */
var t_item = require("uw-data").t_item;

var __lootTypeArr = [];

exports.setLootTypeArr = function(arr){
    __lootTypeArr = arr;
};

exports.getLootTypeArr = function(){
    return   __lootTypeArr;
};

//正在
exports.isLoot = function(itemId){
    var itemData = t_item[itemId];
    if(!itemData) return false;
    var lootType = itemData.lootType||0;
    if(lootType==0) return true;
    if(__lootTypeArr.indexOf(lootType)>-1){
        return true;
    }else{
        return false;
    }
};