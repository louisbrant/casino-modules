/**
 * Created by Sara on 2015/10/6.
 */
var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(44,1);

//初始化数据
function getInfo(){
    var args = {};
    core4Test.callIface(iface.a_task_getInfo, args, cb);
}

//任务奖励领取
function taskAward(){
    var args = {};
    var argsKeys = iface.a_task_taskAward_args;
    args[argsKeys.taskId] = 1008023;
    core4Test.callIface(iface.a_task_taskAward, args, cb);
}

//领取活跃度宝箱
function getVitalityChest(){
    var args = {};
    var argsKeys = iface.a_task_getVitalityChest_args;
    args[argsKeys.index] = 0;
    core4Test.callIface(iface.a_task_getVitalityChest, args, cb);
}

/***********************************************************************************************************************/
//getInfo();
taskAward();
//getVitalityChest();