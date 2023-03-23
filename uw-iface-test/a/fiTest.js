var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;
var fightUtils = require("uw-fight").fightUtils;
var async = require("async");
core4Test.setSession(2282,1);

function getAndInitNextLoot(cb){
    var args = {};
    var argsKeys = iface.a_fight_getAndInitNextLoot_args;
    args[argsKeys.copyId] = 100;
    args[argsKeys.isBoss] = 0;
    //cb(null,{"v":{"1":[1,1]}});
    core4Test.callIface(iface.a_fight_getAndInitNextLoot, args, cb);
}

function pickLoot(uid,cb){
    var args = {};
    var argsKeys = iface.a_fight_pickLoot_args;
    args[argsKeys.copyId] = 1;
    args[argsKeys.uidArr] = [uid];
    //cb(null,null);
    core4Test.callIface(iface.a_fight_pickLoot, args, cb);
}

function getAndPick(cb){
    getAndInitNextLoot(function(err,data){
        if(err) return cb(err);
        var lootData = data.v;
        var lastKey = Object.keys(lootData)[0];
        delete lootData[lastKey];
        console.log(lootData);
        pickLoot(lastKey,function(err,data){
            if(err) return cb(err);
            var equipBagItems = (data.v||{})[28]||{};
            var num1 = equipBagItems[1545]||0;
            var num2 = equipBagItems[1550]||0;
            console.log(equipBagItems);
            g_num1+=num1;
            g_num2+=num2;
            if(g_num1>0)
                console.log("g_num1��",g_num1);
            if(g_num2>0)
            console.log("g_num2��",g_num2);
            cb();
        });
    });
};

function testGet(cb){
    getAndInitNextLoot(function(err,data){
        if(err) return cb(err);
        var lootData = data.v;
        var lastKey = Object.keys(lootData)[0];
        //delete lootData[lastKey];
        console.log(lootData);
        for(var key in lootData){
            var itemArr = lootData[key];

            for(var i = 0;i<itemArr.length;i++){
                var locItemData = itemArr[i];
                if(locItemData[0]==1545){
                    g_num1+=locItemData[1];
                    console.log("1111111111111111111111");
                }
                if(locItemData[0]==1550){
                    g_num2+=locItemData[1];
                    console.log("22222222222222");
                }
            }
        }
        if(g_num1>0)
            console.log("g_num1��",g_num1);
        if(g_num2>0)
            console.log("g_num2��",g_num2);
        cb();
    });
};


var g_num1 = 0;
var g_num2 = 0;
var g_num3 = 0;
var arr = [];
//10025
var testLoot =function(){
    for(var i = 0;i<18000;i++){
        var itemArr = fightUtils.getLootItems(10025);
        for(var j = 0;j<itemArr.length;j++){
            var locItemData = itemArr[j];
            if(locItemData[0]==5105){
                g_num1+=locItemData[1];
            }
            if(locItemData[0]==5205){
                g_num2+=locItemData[1];
            }
            if(locItemData[0]==5305){
                g_num3+=locItemData[1];
            }
        }
    }
    console.log("铜:%s,银:%s,金:%s",g_num1,g_num2,g_num3);
    g_num1 = 0;
    g_num2 = 0;
    g_num3 = 0;
}

/**********************************************************************************************************************/

for(var k = 0;k<100;k++){
    testLoot();
}


//getAndPick(function(){});
