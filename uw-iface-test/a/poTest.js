/**
 * Created by Sara on 2015/5/28.
 */
var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(2509,1);



//获取敌人列表
function getEnemyList(){
    var args = {};
  /*  var argsKeys = iface.a_pkOut_getEnemyList_args;
    args[argsKeys.honorId] = 4;*/
    core4Test.callIface(iface.a_pkOut_getEnemyList, args, cb);
}

//获取敌人列表
function refreshEnemy(){
    var args = {};
    /*  var argsKeys = iface.a_pkOut_getEnemyList_args;
     args[argsKeys.honorId] = 4;*/
    core4Test.callIface(iface.a_pkOut_refreshEnemy, args, cb);
}

//获取敌人列表
function dealRecord(){
    var args = {};
      var argsKeys = iface.a_pkOut_dealRecord_args;
     args[argsKeys.fightType] = 1;
    core4Test.callIface(iface.a_pkOut_dealRecord, args, cb);
}


//开始pk
function start(){
    var args = {};
      var argsKeys = iface.a_pkOut_start_args;
     args[argsKeys.enemyId] = 2332;
    args[argsKeys.fightType] = 1;
    args[argsKeys.isRevenge] = 1;
    core4Test.callIface(iface.a_pkOut_start, args, cb);
}

/***********************************************************************************************************************/

//getEnemyList();

//refreshEnemy();

dealRecord();

//start();