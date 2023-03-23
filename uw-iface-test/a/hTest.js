/**
 * Created by Sara on 2015/5/28.
 */
var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(65,1);

//获取用户成就信息
function getInfo(){
    var args = {};
    core4Test.callIface(iface.a_honor_getInfo, args, cb);
}

//用户领取成就奖励
function getAward(){
    var args = {};
    var argsKeys = iface.a_honor_getAward_args;
    args[argsKeys.honorId] = 4;
    core4Test.callIface(iface.a_honor_getAward, args, cb);
}

//结算百分比类效果扣除时照成的收益加成错误修改
function bugAlter(){
    var args = {};
    core4Test.callIface(iface.a_honor_bugAlter, args, cb);
}
/***********************************************************************************************************************/
//getInfo();
//getAward()
bugAlter();
