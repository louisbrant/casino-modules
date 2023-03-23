/**
 * Created by Sara on 2015/12/10.
 */
var core4Test = require("uw-test").core4Test;
var cb = core4Test.cb4Test;
var iface = require("uw-data").iface;

core4Test.setSession(2431,1);

//获取公会数据
function getInfo(){
    var args = {};
    core4Test.callIface(iface.a_guild_getInfo, args, cb);
}

//创建公会
function establishGuild(){
    var args = {};
    var argsKeys = iface.a_guild_establishGuild_args;
    args[argsKeys.name] = "rrrrrr";
    core4Test.callIface(iface.a_guild_establishGuild, args, cb);
}

//申请加入公会
function joinGuild(){
    var args = {};
    var argsKeys = iface.a_guild_joinGuild_args;
    args[argsKeys.guildId] = 7;
    core4Test.callIface(iface.a_guild_joinGuild, args, cb);
}

//退会
function exitGuild(){
    var args = {};
    core4Test.callIface(iface.a_guild_exitGuild, args, cb);
}


/***********************************************************************************************************************/
//getInfo();
//establishGuild();
//joinGuild();
exitGuild();