/**
 * Created by Sara on 2015/9/19.
 */
var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(6,1);

//装备
function changeEquip(){                 // {tempId:"英雄id",index:"装备位置",equipId:"装备id"}
    var args = {};
    var argsKeys = iface.a_equip_changeEquip_args;
    args[argsKeys.tempId] = 1;
    args[argsKeys.index] = 2;
    args[argsKeys.equipId] = 22;
    core4Test.callIface(iface.a_equip_changeEquip , args, cb);
}

/***********************************************************************************************************************/
changeEquip();

