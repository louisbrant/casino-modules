/**
 * Created by Administrator on 2014/5/16.
 */

var async = require("async");
var getMsg = require("uw-utils").msgFunc(__filename);
var commonUtils = require("uw-utils").commonUtils;
var chatDao = require("./../dao/chatDao");
var userDao = require("uw-user").userDao;
var sysMsgDao = require("./../dao/sysMsgDao");
var g_chat = require("uw-global").g_chat;
var g_data = require("uw-global").g_data;
var g_guild = require("uw-global").g_guild;
var c_chatSys = require("uw-data").c_chatSys;
var c_msgCode = require("uw-data").c_msgCode;
var c_prop = require("uw-data").c_prop;
var c_game = require("uw-data").c_game;
var t_item = require("uw-data").t_item;
var sessionManager = require("uw-route").sessionManager;
var accountDao = require("uw-account").accountDao;
var consts = require("uw-data").consts;
var serverInfoBiz = require("uw-server-info").serverInfoBiz;
var serverInfoDao = require("uw-server-info").serverInfoDao;
var serverUtils = require("uw-utils").serverUtils;
var iface = require("uw-data").iface;
var mainClient = require("uw-db").mainClient;
var loginClient = require("uw-db").loginClient;

var userUtils = null;
var serversGroupBiz = null;

//hd {
var project = require("uw-config").project;
//hd }

var exports = module.exports;
var sysMsgs = [];
var bendYear = 2;//禁言两年

var checkRequire = function() {
    userUtils = userUtils||require("uw-user").userUtils;
    serversGroupBiz = serversGroupBiz || require("uw-servers-group").serversGroupBiz;
}


/**
 * 获取数据
 * @param client
 * @param userId
 * @param lastId
 * @param guildLastId
 */
exports.getNewList = function (client, userId, lastId,guildId,guildLastId) {
    var guList = [];
    var chatGuildDataList = [];
    var nowGuildId = g_data.getGuildId(userId)||0;
    var isOri = true;
    if(nowGuildId!=guildId){
        isOri = false;
        guildId = nowGuildId;
    }
    if(guildId!=0) {
        if(guildLastId==0) guildLastId = g_chat.getCurGID(guildId) - 3;
        chatGuildDataList =  g_chat.getGuildList(guildId);
        for(var i = 0;i<chatGuildDataList.length;i++){
            var locData = chatGuildDataList[i];
            if(locData.uniqueId>guildLastId){
                guList.push(locData);
            }
        }
    }

    var chatDataList =  g_chat.getList();
    if(lastId==0) lastId = g_chat.getCurUID()-1;
    var reList = [];
    for(var i = 0;i<chatDataList.length;i++){
        var locData = chatDataList[i];
        if(locData.uniqueId>lastId){
            reList.push(locData);
        }
    }
    return [reList,guList,isOri,guildId];
};

exports.refreshSysMsg = function(){
    sysMsgDao.list(mainClient, '(serverId = 0 || serverId = ?) and status = 0 and sendTime < now() and expireTime > now() order by id desc', [project.serverId], function(err, data) {
        if (err) return;
        sysMsgs = [];
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            item.message = '[ubb'+ (item.color?' color='+item.color:'')
            +(item.size?' fontSize='+item.size:'') + ']'+item.message+'[/ubb]';
            sysMsgs.push({
                uniqueId: item.id,
                type: c_prop.chatTypeKey.sys,
                subType: item.type,
                sysArgs: [9999, item.message, item.times?item.times:0, item.interval?item.interval:0]
            });
            if (i == 0)
                g_chat.setLastSysMsgId(item.id);
        }
    });
};

exports.getNewSysMsgList = function(client, lastId, cb) {
    var dataList = [];
    for (var i = 0; i < sysMsgs.length; i++) {
        var data = sysMsgs[i];
        if (data.uniqueId > lastId)
            dataList.push(data);
    }
    cb(null, dataList);
};

/**
 *  GM指令
 *  @param client
 *  @param userId
 *  @param content [命令,玩家名/id,數值]
 *  @param cb
 */
exports.gmPassWord = function(client, userId,  content,cb) {
    if (content.length == 2){
        userDao.select(client, {nickName: content[1]}, function (err, userData) {
            if (err) return cb(err);
            if(!userData) cb("无该玩家数据");
            _dealWithPassWorld(content[0], userData.accountId,userData.serverIndexId, cb);
        })
    }else if(content.length == 3 &&  content[1] == "id"){
            userDao.select(client, {id: content[2]}, function(err, userData){
                if(err) return cb(err);
                if(!userData) cb("无该玩家数据");
                _dealWithPassWorld(content[0],userData.accountId, userData.serverIndexId,cb);
            });
    }else {
        cb("命令格式错误");
    }
}

//执行具体操作
var _dealWithPassWorld = function(password ,accountId,serverIndexId, cb){
    switch(password){
        case "/踢人":
            _kickOut(accountId,serverIndexId, cb);
            break;
        case "/禁言":
            _bend(accountId, cb);
            break;
        case "/封号":
            _kickOut(accountId, serverIndexId,function(){});
            _seal(accountId, cb);
            break;
        default:
            cb("不存在的操作命令")
            break;
    }
}
//封号
var _seal = function(accountId, cb){
    var upAccountData = {
        status: consts.accountStatus.lock
    }
    accountDao.update(loginClient, upAccountData, {id: accountId}, function(err, accountData){
        if(err) return cb(err);
        cb(null);
    })
}

//禁言
var _bend = function(accountId, cb){
    accountDao.selectCols(loginClient,"bendExpireAt, bendType",{id:accountId},function(err,accountData) {
        if(err) return cb(err);
        if(!accountData) return cb("账号有误");
        accountData.bendExpireAt = new Date().addYears(bendYear);
        accountData.bendType |= 1;
        var upAccountData = {
            bendExpireAt: accountData.bendExpireAt,
            bendType: accountData.bendType
        }
        accountDao.update(loginClient, upAccountData, {id: accountId}, function(err, data){
            if(err) return cb(err);
            cb(null);
        })
    });
}

//踢人
var _kickOut = function(accountId,serverIndexId, cb) {
    var session = sessionManager.getSessionByAccountId(accountId,serverIndexId);
    if(session)
        session.isKick = 1;
    cb(null);
}


/**
 * 添加聊天消息
 * @param client
 * @param userId
 * @param content
 * @param isGM 是否GM
 * @param type
 * @param type
 * @param type
 * @param cb
 */
exports.addChatData = function(client, userId, content,isGM,type,oldGuildId,isLittleHorn, cb){
    checkRequire();
    userDao.selectCols(client,"id,nickName,vip,lvl,medalTitle,diamond,giveDiamond,buyDiamond,bag,exData","id=?",[userId],function(err,userData){
        if(err) return cb(err);
        if(!isGM && userData.lvl<30) return cb(getMsg(c_msgCode.noLvlToTalk));
        async.parallel([
            function(cb1) {
                if(isLittleHorn){
                    _CostlittleHorn(client,userData,cb1);
                }else {
                    cb1(null);
                }
            }],function(err, data) {
                if(err) return cb(err);
                var littleHornData = data[0];
                var updateUser = null;
                var debagItem = null;
                var costDiamond = 0;
                if(isLittleHorn) {
                    updateUser = littleHornData[0];
                    debagItem = littleHornData[1];
                    costDiamond = littleHornData[2];
                }
                var guildId = g_data.getGuildId(userId) || 0;
                var isOri = true;
                if (oldGuildId != guildId) {
                    isOri = false;
                }
                var guildData = g_guild.getGuild(guildId);
                var guildName = "";
                var guildPosition = c_prop.guildPostKey.rankFile;
                if (guildData) {
                    guildName = guildData.name;
                    var viceChairmanId = guildData.viceChairmanId || [];
                    if (guildData.chairmanId == userId) {
                        guildPosition = c_prop.guildPostKey.chairman;
                    } else if (viceChairmanId.indexOf(userId) >= 0) {
                        guildPosition = c_prop.guildPostKey.viceChairman;
                    }
                }
                if (type == c_prop.chatTypeKey.user) {
                    g_chat.addUserData(userData.nickName, userData.vip, content, isGM, guildName, userData.medalTitle, isLittleHorn);
                    if(isLittleHorn){//发送跨服消息
                        var args = {};
                        var argsKeys = iface.admin_chat_serversChat_args;
                        args[argsKeys.nickName] = userData.nickName;
                        args[argsKeys.vip] = userData.vip;
                        args[argsKeys.content] = content;
                        args[argsKeys.isGM] = isGM;
                        args[argsKeys.guildName] = guildName;
                        args[argsKeys.medalTitle] = userData.medalTitle;
                        args[argsKeys.isLittleHorn] = isLittleHorn;
                        exports.sendChat2ServersArr(mainClient, userId, args,function(err, data){if(err) console.log(err);console.log(data)});
                    }
                } else {
                    g_chat.addGuildData(guildId, userData.nickName, userData.vip, guildPosition, content, userData.medalTitle)
                }
                if(isLittleHorn){
                    cb(null, [isOri, guildId, updateUser, debagItem, costDiamond]);
                }else {
                    cb(null, [isOri, guildId]);
                }
            }
        );
    })
};


exports.sendChat2ServersArr = function (client, userId, chatData,cb) {
    var serverId = project.serverId;
    serversGroupBiz.inServerList(client, serverId, c_prop.serverArrTypeKey.littleHorn,function (err, serverArr) {
        if (err) return cb(err);
        var taskArr = [];
        for (var i = 0; i < serverArr.length; i++) {
            var locServerId = serverArr[i];
            if (locServerId == project.serverId) continue;
            taskArr.push(function (cb1) {
                _sendChat2Servers(client, this[0], this[1], this[2],cb1);
            }.bind([userId, locServerId,chatData]));
        }
        if(taskArr.length <= 0){
            return cb(null, null);
        }
        async.parallel(taskArr, function (err, dataList) {
            if (err) return cb(err);
            var reArr = [];
            for (var i = 0; i < dataList.length; i++) {
                var locData = dataList[i];
                if (locData) reArr.push(locData);
            }
            cb(null, reArr);
        })
    });
};


var _sendChat2Servers = function (client, userId, serverId, chatData,cb) {
    serverInfoDao.select(loginClient, {serverId: serverId}, function (err, serverData) {
        if (err) return cb(err);
        if (!serverData) return cb(null, null);
        serverInfoBiz.getServerClient(serverId, function (err, sClient) {
            if (err) return cb(err);
            if (!sClient) return cb(null, null);
            _requestSendChat2Severs(serverData.host,serverData.port, chatData,function (err, serverId) {
                if (err) return cb(err);
                if (!serverId) return cb(null, null);
                cb(null, serverId);
            });
        });
    });
};



/**
 * 添加跨服消息
 */
exports.addServersChat = function(nickname, vip, content, isGM, guildName, meldalTitle, isLittleHorn){
    g_chat.addUserData(nickname, vip, content, isGM, guildName, meldalTitle, isLittleHorn);
}

/**
 * 添加系统消息
 * @param id
 * @param args
 */
exports.addSysData = function(id,args){
    var c_chatSysData = c_chatSys[id];
    if(!c_chatSysData) return;
    var curArgs = null;
    switch (id){
        case 3:
        case 4:
            var color = args[1];
            if(c_chatSysData.arg.indexOf(color)>-1){
                curArgs = args;
                curArgs[1] = commonUtils.getColorByQuality(color)
            }
            break;
        case 5:
            var color = args[1];
            var strengthLvl = args[3];
            if(c_chatSysData.arg.indexOf(strengthLvl)>-1){
                curArgs = args;
                curArgs[1] = commonUtils.getColorByQuality(color)
            }
            break;
        case 6:
        case 7:
            var color = args[1];
            var starLvl = args[3];
            if(c_chatSysData.arg.indexOf(starLvl)>-1){
                curArgs = args;
                curArgs[1] = commonUtils.getColorByQuality(color)
            }
            break;
        case 8:
        case 9:
            var wingId = args[2];
            if(c_chatSysData.arg.indexOf(wingId)>-1){
                curArgs = [args[0],args[1]];
            }
            break;
        case 10:
            var isCrit = args[1];
            if(isCrit){
                curArgs = [args[0]];
            }
            break;
        case 11:
        case 12:
            //todo
            break;
        case 13:
        case 14:
            var color = args[2];
            if(c_chatSysData.arg.indexOf(color)>-1){
                curArgs = [args[0],args[1]];
            }
            break;
        case 15:
        case 16:
            var copyId = args[2];
            if(c_chatSysData.arg.indexOf(copyId)>-1){
                curArgs = [args[0],args[1]];
            }
            break;
        case 17:
        case 18:
            var realmLvl = args[2];
            if(c_chatSysData.arg.indexOf(realmLvl)>-1){
                curArgs = [args[0],args[1]];
            }
            break;
        case 19:
            var heroNum = args[1];
            if(c_chatSysData.arg.indexOf(heroNum)>-1){
                curArgs = [args[0],args[1]];
            }
            break;
        case 20:
            //todo
            break;
        case 21:
        case 22:
            var vip = args[1];
            if(c_chatSysData.arg.indexOf(vip)>-1){
                curArgs = [args[0],args[1]];
            }
            break;
        case 23:
            var color = args[2];
            if(c_chatSysData.arg.indexOf(color)>-1){
                curArgs = [args[0],args[1]];
            }
            break;
        case 24:
            var winCount = args[1];
            if(c_chatSysData.arg.indexOf(winCount)>-1){
                curArgs = [args[0],args[1]];
            }
            break;
        case 25:
            var winCount = args[1];
            if(c_chatSysData.arg.indexOf(winCount)>-1){
                curArgs = [args[0],args[1]];
            }
            break;
        case 26:
/*            第一个%s：杀人玩家名
            第二个%s：被杀玩家名
            第三个%s：稀有物品名*/
            var color = args[3];
            if(c_chatSysData.arg.indexOf(color)>-1){
                curArgs = [args[0],args[1],args[2]];
            }
            break;
        case 27:
            var oldColor = args[1];
            var newColor = args[2];
            if (oldColor != newColor && newColor == c_prop.pkNameColorKey.red) {
                curArgs = [args[0]];
            }
            break;
        case 28:
            var eColor = args[2];
            if (eColor == c_prop.pkNameColorKey.red) {
                curArgs = [args[0],args[1]];
            }
            break;
        case 29:
            var color = args[1];
            var strengthLvl = args[3];
            if(c_chatSysData.arg.indexOf(strengthLvl)>-1){
                curArgs = args;
                curArgs[1] = commonUtils.getColorByQuality(color)
            }
            break;
        case 30:
            // [ubb color=0x52c8d2]%s[/ubb]击杀红名 [ubb color=0x52c8d2]%s[/ubb]！爆得BOSS替代令！
            var eColor = args[2];
            if (eColor == c_prop.pkNameColorKey.red) {
                curArgs = [args[0],args[1]];
            }
            break;

        case 31:
            //  [ubb color=#00cdff]%s[/ubb]击杀了 [ubb color=#00cdff]%s[/ubb]！获得系统奖励BOSS替代令！
            curArgs = [args[0],args[1]];
            break;
        case 32:
            var color = args[2];
            if(c_chatSysData.arg.indexOf(color)>-1){
                curArgs = [args[0],args[1]];
            }
            break;
        case 33:
            var color = args[1];
            curArgs = [args[0],commonUtils.getColorByQuality(color),args[2]];
            break;
        case 34:
            //第一个%s：公会名
            //第二个%s：玩家名
            //第三个%s：世界BOSS名字
            curArgs = [args[0],args[1],args[2]];
            break;
        case 35:
            //第一个%s：世界BOSS名字
            //第二个%s：BOSS剩余血量百分比
            curArgs = [args[0],args[1]+"%"];
            break;
        case 36:
            //第一个%s：世界BOSS名字
            //第二个%s：伤害第一的玩家名
            curArgs = [args[0],args[1]];
            break;
        case 37:
            //第一个%s：世界BOSS名字
            curArgs = [args[0]];
            break;
        case 38:
            //第一个%s：世界BOSS名字
            //第二个%s：BOSS剩余血量百分比
            curArgs = [args[0],args[1]+"%"];
            break;
        case 39:
            //第一个%s：公会名
            //第二个%s：玩家名
            curArgs = [args[0],args[1]];
            break;
        case 40:
            //第一个%s：世界BOSS名字
            //第二个%s：伤害第一的玩家名//
            curArgs = [args[0],args[1]];
            break;
        case 41:
            //第一个%s：玩家名
            //第二个%s：元宝数量
            //第三个%s：红包文本信息
            curArgs = [args[0],args[1],args[2]];
            break;
        case 42:
            //第一个%s：抢夺红包的玩家名
            //第二个%s：发送红包的玩家名
            //第三个%s：抢得元宝数量
            //第四个%s：红包文本信息
            curArgs = [args[0],args[1],args[2],args[3]];
            break;
        case 43:
            //第一个%s：玩家名
            //第二个%s：行会名称
            //第三个%s：元宝数量
            //第四个%s：红包文本信息
            curArgs = [args[0],args[1],args[2],args[3]];
            break;
        case 44:
            //第一个%s：抢夺红包的玩家名
            //第二个%s：发送红包的玩家名
            //第三个%s：行会名称
            //第四个%s：元宝数量
            //第五个%s：红包文本信息
            curArgs = [args[0],args[1],args[2],args[3],args[4]];
            break;
        case 47:
        case 54:
            curArgs = [args[0]];
            break;
        case 48:
        case 55:
            //第一个%s：挑战玩家名
            //第二个%s：守擂玩家名
            curArgs = [args[0], args[1]];
            break;
        case 49:
        case 56:
            curArgs = [args[0]];
            break;
        case 50:
        case 57:
            //第一个%s：霸主行会名
            //第二个%s：霸主玩家名
            curArgs = [args[0], args[1]];
            break;
        case 51:
            curArgs = [args[0]];
            break;
        case 52:
            //第一个%s：霸主行会名
            //第二个%s：霸主buff名//
            curArgs = [args[0],args[1]];
            break;
        case 53:
        case 59:
            curArgs = [args[0]];
            break;
        case 60:
        case 61:
            curArgs = [];
            break;
        case 62:
/*            第一个%s：掠夺者的服务器名
            第二个%s：掠夺者的名字
            第三个%s：青龙、白虎、朱雀、玄武
            第四个%s：守卫名
            */
            var door = c_prop.offersDoor[args[2]];
            curArgs = [args[0],args[1],door,args[3]];
            break;
        case 63:
            var door = c_prop.offersDoor[args[0]];
            //第一个%s：青龙、白虎、朱雀、玄武
            curArgs = [door];
            break;
        case 64:
/*            第一个%s：我服玩家名
            第二个%s：他服的服务器名
            第三个%s：青龙、白虎、朱雀、玄武
            第四个%s：玩家名
            第五个%s：货币数量*/
            var door = c_prop.offersDoor[args[2]];
            curArgs = [args[0],args[1],door,args[3],args[4]];
            break;
        case 65:
            /*            第一个%s：掠夺者的服务器名
             第二个%s：掠夺者的名字
             第三个%s：青龙、白虎、朱雀、玄武
             第四个%s：守卫名
             */
            var door = c_prop.offersDoor[args[2]];
            curArgs = [args[0],args[1],door,args[3]];
            break;
        case 66:
            var door = c_prop.offersDoor[args[0]];
            //第一个%s：青龙、白虎、朱雀、玄武
            curArgs = [door];
            break;
        case 67:
            var door = c_prop.offersDoor[args[2]];
            curArgs = [args[0],args[1],door,args[3],args[4]];
            break;
        case 68:
            curArgs = [args[0]];
            break;
        case 69:
            curArgs = [args[0]];
            break;
        case 72:
            curArgs = [args[0]];
            break;
        case 73:
            curArgs = [args[0],args[1]];
            break;
        case 74:
            var color = args[0];
            curArgs = [commonUtils.getColorByQuality(color),args[1],args[2]];
            break;
        case 75:
            curArgs = [args[0], args[1], args[2], args[3]];
            break;
        case 76:
            var color = args[2];
            curArgs = [args[0],args[1],commonUtils.getColorByQuality(color),args[3]];
            break;
        case 77:
            if(args[1]==4){
                curArgs = [args[0]];
            }
            break;
        case 78:
            if(args[1]==4){
                curArgs = [args[0]];
            }
            break;
        case 79:
            //第一个%s：玩家名
            //第二个%s：妖塔大奖道具名
            //第三个%s：道具数量
            curArgs = [args[0],args[1],args[2]];
            break;
        case 80:
            //第一个%s：玩家名
            //第二个%s：妖塔大奖道具名
            //第三个%s：道具数量
            curArgs = [args[0],args[1],args[2]];
            break;
        case 81:
            curArgs = [args[0]];
            break;
        case 82:
            curArgs = [args[0]];
            break;
        case 83:
            curArgs = [];
            break;
        case 84:
            curArgs = [];
            break;
        case 85:
            curArgs = [args[0]];
            break;
        case 86:
            curArgs = [args[0]];
            break;
        case 87:
            curArgs = [args[0],args[1],args[2]];
            break;
        case 88:
            curArgs = [args[0],args[1],args[2]];
            break;
        case 89:
            curArgs = [args[0], args[1]];
            break;
        case 90:
            curArgs = [args[0],args[1],args[2]];
            break;
        case 91:
            curArgs = [args[0], args[1], args[2], args[3]];
            break;
        case 92:
            curArgs = [args[0], args[1], args[2], args[3]];
            break;
        case 93:
            curArgs = [args[0],args[1],args[2]];
            break;
        case 94:
            curArgs = [args[0],args[1],args[2]];
            break;
        case 95:
            curArgs = [args[0], args[1]];
            break;
    }

    if (id == 23) {
        if (curArgs) {
            g_chat.addLotteryData(id, curArgs);
        }
    } else if (id == 32) {
        if (curArgs) {
            g_chat.addGuildLotteryData(id, curArgs);
        }
    } else {
        if (curArgs) {
            g_chat.addSysData(id, curArgs);
        }
    }

};

var _CostlittleHorn = function(client, userData, cb) {
    var delBagItems = {};
    var needDiamond = 0;
    var needItemId = c_prop.spItemIdKey.littleHorn;
    var ownNum = userData.bag[needItemId]||0;
    var ownNumJudgment = c_game.littlHorn[0] || 1;
    if(ownNum<ownNumJudgment){
        var exData = userData.exData;
        if(!exData || !exData[c_prop.userExDataKey.autoBuyLittleHorn]){
            return cb("喇叭数量不足");
        }
        if(userData.vip < 2){
            return cb("VIP2以上才可购买喇叭");
        }
        needDiamond = t_item[needItemId].price || 30;
        //判断元宝
        needDiamond *= ownNumJudgment;
        if(userData.diamond<needDiamond) return cb(getMsg(c_msgCode.noDiamond));

        userUtils.reduceDiamond(userData,needDiamond);
    }else{
        userUtils.delBag(userData.bag,needItemId,ownNumJudgment);
        delBagItems[needItemId] = ownNumJudgment;
    }
    var updateUser = {
        bag:userData.bag,
        diamond:userData.diamond,
        giveDiamond:userData.giveDiamond,
        buyDiamond:userData.buyDiamond
    };
    userDao.update(client,updateUser,{id:userData.id},function(err, data){
        if(err) return cb(err);
        delete  updateUser.bag;
        return cb(null, [updateUser, delBagItems, needDiamond]);
    })
}


/**
 * 发送跨服聊天消息
 * @param serverHost
 * @param serverPort
 * @param cb
 * @private
 */
var _requestSendChat2Severs = function(serverHost,serverPort,args,cb){
    serverUtils.requestServer(iface.admin_chat_serversChat,args,serverHost,serverPort,cb);
}
