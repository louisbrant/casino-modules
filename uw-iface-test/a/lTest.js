/**
 * Created by Sara on 2015/10/4.
 */
var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(6,1);

//抽奖
function lottery(){
    var args = {};
    var argsKeys = iface.a_lottery_lottery_args;
    args[argsKeys.type] = 3;
    args[argsKeys.count] = 1;
    core4Test.callIface(iface.a_lottery_lottery, args, cb);
}

//领取探宝值宝箱
function getTreasureChest(){
    var args = {};
    core4Test.callIface(iface.a_lottery_getTreasureChest, args, cb);
}

//初始化数据
function getInfo(){
    var args = {};
    core4Test.callIface(iface.a_lottery_getInfo, args, cb);
}

/***********************************************************************************************************************/
lottery();
//getTreasureChest();
//getInfo();