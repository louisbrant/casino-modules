/**
 * Created by Administrator on 2016/4/9.
 */
var ds = require("uw-ds").ds;
var c_game = require("uw-data").c_game;


/**
 * 公会信息
 * @constructor
 */
var GuildWarData = function () {
    this.serverName = null;//服务器名(静)
    this.serverId = null;//服务器id
    this.serverHost = null;//服务器host(静)
    this.serverPort = null;//服务器port(静)
    this.guildId = null;//行会id(静)
    this.guildName = null;//行会名(静)
    this.guildLvl = null;//行会等级(静)
    this.doorLives = null;//守卫存活数(同步)
    this.points = null;//积分(同步)
    this.progress = null;//进度，百分比
    this.groupId = null;//分组id(静)
    this.doorData = {};//守卫门口信息 {"门":ds.GuildWarDoor,..}
    this.rank = 0;
    this.chairmanData = null;//会长数据 [会长id,会长名称，会长vip,会长头像](静)
    this.lastLootTime = 0;//(同步)
    this.fightRecordArr = [];//战斗记录,保存10条
    this.refreshId = 0;
    this.maxPoints = 0;
};

/**
 * 个人信息
 * @constructor
 */

var GuildWarUser = function () {
    this.userId = null;//用户id(静)
    this.userName = null;//用户名(静)
    this.guildId = null;//行会id(静)
    this.guildName = null;//行会名(静)
    this.points = null;//个人积分(同步)
    this.vip = null;//vip(静)
    this.iconId = null;//用户头像(静)
    this.lastLootTime = 0;//最后掠夺时间(同步)
    this.rank = 0;
    this.groupId = null;//(静)
    this.nextFightTime = null;//下一次可以战斗的时间
    this.inspireEndTime = null;//鼓舞结束时间
    this.guildPosition = null;//行会职务(静)
    this.nextUpTime = null;//下一次上阵时间
    this.serverId = null;//服务器id(静)
    this.combat = null;
};


var GuildWarServerData = function () {
    this._guildWarGroupDic = {};//{"组别id":[]}
    this._guildWarDic = {};//{"行会id":GuildWarData}
    this._guildWarUserDic = {};//{"userId":WarUser}
    this._guildWarUserGroupDic = {};//{"组别id":[WarUser]}

    this._guildWarDefenceRecordDic = {};//防守记录 {"行会id":[]}
    this._guildWarAttackRecordDic = {};//战况记录{"组别id":[]}
    this._fightRecordId = 0;

    this.clear = function(){

    };

//增加记录
    this.pushFightRecord = function (type, guildId, data) {
        this._fightRecordId++;
        if (this._fightRecordId > 99999999) this._fightRecordId = 0;
        var record = new ds.GuildWarFightRecord();
        record.id = this._fightRecordId;//id
        record.type = type;//1:攻打，2：被攻打
        if (type == 1) {
            record.attackData = data;//[玩家名，服务器名,行会名，门]
        } else {
            record.beAttackData = data;//[门，服务器名,行会名,玩家名]
        }
        var guildWarData = this.getGuildWarData(guildId);
        guildWarData.fightRecordArr.push(record);
        if (guildWarData.fightRecordArr.length >= 10) guildWarData.fightRecordArr.shift();
    };

//获取防守记录
    this.getGuildWarDefenceRecordArr = function (guildId) {
        var recordArr = this._guildWarDefenceRecordDic[guildId];
        if (!recordArr) {
            recordArr = [];
        }
        this._guildWarDefenceRecordDic[guildId] = recordArr;
        return recordArr;
    };

//获取战况记录
    this.getGuildWarAttackRecordArr = function (groupId) {
        var recordArr = this._guildWarAttackRecordDic[groupId];
        if (!recordArr) {
            recordArr = [];
        }
        this._guildWarAttackRecordDic[groupId] = recordArr;
        return recordArr;
    };

    //
    this.getGuildWarAttackRecordDic = function(){
        return this._guildWarAttackRecordDic;
    };

    this.pushWarUserGroup = function (groupId, warUser) {
        var arr = this.getWarUserArrByGroupId(groupId);
        if (arr.indexOf(warUser) <= -1) {
            arr.push(warUser);
        }
    };

    this.getWarUserArrByGroupId = function (groupId) {
        var arr = this._guildWarUserGroupDic[groupId];
        if (!arr) {
            arr = [];
        }
        this._guildWarUserGroupDic[groupId] = arr;
        return arr;
    };

    this.getGuildWarUserDic = function () {
        return this._guildWarUserDic;
    };

    this.hasGuildWarUser = function (userId) {
        var userData = this._guildWarUserDic[userId];
        if (userData) return true;
        return false;
    };

//获取行会战用户信息
    this.getGuildWarUser = function (userId) {
        return this._guildWarUserDic[userId];
    };

//获取行会战用户信息
    this.newGuildWarUser = function (userId) {
        var userData = this._guildWarUserDic[userId];
        if (!userData) {
            userData = new GuildWarUser();
            userData.userId = userId;
        }
        this._guildWarUserDic[userId] = userData;
        return userData;
    };

    this.getGroupWarGroupDic = function () {
        return this._guildWarGroupDic;
    };

//获取新的服务器信息
    this.createGuildWarData = function (data) {
        var sData = new GuildWarData();
        sData.serverName = data.serverName;//服务器名
        sData.serverId = data.serverId;//服务器id
        sData.serverHost = data.serverHost;//服务器host
        sData.serverPort = data.serverPort;//服务器port
        sData.guildId = data.guildId;//行会id
        sData.guildName = data.guildName;//行会名
        sData.guildLvl = data.guildLvl;//行会等级
        sData.doorLives = 4;//守卫存活数
        sData.points = c_game.guildWar[1] * 4;//积分
        sData.progress = 100;//进度，百分比
        sData.maxPoints = c_game.guildWar[1] * 4;//最大积分
        sData.groupId = data.groupId;//组别id
        sData.rank = 0;
        sData.chairmanData = data.chairmanData;//会长信息
        return sData;
    };

    this.getGuildWarDic = function () {
        return this._guildWarDic;
    };

    this.getGuildWarData = function (guildId) {
        return this._guildWarDic[guildId];
    };

    /**
     * 增加服务器数据
     * @param groupId
     * @param data
     */
    this.pushGuildWarData = function (groupId, data) {
        var servers = this._guildWarGroupDic[groupId] || [];
        servers.push(data);
        this._guildWarGroupDic[groupId] = servers;
        this._guildWarDic[data.guildId] = data;
    };

    /**
     * 根据组别id获取行会组
     * @param groupId
     * @returns {*|Array}
     */
    this.getGuildWarDataByGroupId = function (groupId) {
        return this._guildWarGroupDic[groupId] || [];
    };


//计算排名
    this.sortGuildWarList = function (groupId) {
        var guildWarList = this.getGuildWarDataByGroupId(groupId);
        _sortList(guildWarList);
        var firstData = guildWarList[0];
        var maxPoints = 0;
        if (firstData) {
            maxPoints = firstData.points;
        }
        for (var i = 0; i < guildWarList.length; i++) {
            var locData = guildWarList[i];
            locData.maxPoints = maxPoints;
            locData.progress = parseInt(locData.points / locData.maxPoints * 100);
        }
        return guildWarList;
    };

//计算排名
    this.calGuildWarRank = function (groupId) {
        var guildWarList = this.getGuildWarDataByGroupId(groupId);
        var tempArr = guildWarList.concat([]);
        _sortGuildWarRankList(tempArr);
        for (var i = 0; i < tempArr.length; i++) {
            var locData = tempArr[i];
            locData.rank = i + 1;
        }
        return tempArr;
    };


//计算排名
    this.calUserRank = function (groupId) {
        var warUserList = this.getWarUserArrByGroupId(groupId);
        _sortUserRankList(warUserList);
        for (var i = 0; i < warUserList.length; i++) {
            var locData = warUserList[i];
            locData.rank = i + 1;
        }
        return warUserList;
    };

//排序
    var _sortList = function (list) {
        //this._guildWarGroupDic
        //数据结构：[行会id,行会积分]
        var sortKeyArr = ["points", "doorLives", "lastLootTime"]; //排序规则：积分＞守卫存活数＞最后掠夺升序
        var sortType = [-1, 1, 1]; //积分降序，守卫存活数升序,最后掠夺升序
        list.sort(function (a, b) {
            for (var i = 0; i < 3; i++) {
                var type = sortType[i];
                if (a[sortKeyArr[i]] > b[sortKeyArr[i]]) {
                    return type <= 0 ? -1 : 1;
                }
                else if (a[sortKeyArr[i]] < b[sortKeyArr[i]]) {
                    return type <= 0 ? 1 : -1;
                }
            }
            return 0;
        });
        return list;
    };

};

//排序
var _sortGuildWarRankList = function (list) {
    //this._guildWarGroupDic
    //数据结构：[行会id,行会积分]
    var sortKeyArr = ["points", "doorLives", "lastLootTime"]; //排序规则：积分＞守卫存活数＞最后掠夺升序
    var sortType = [-1, -1, 1]; //积分降序，守卫存活数升序,最后掠夺升序
    list.sort(function (a, b) {
        for (var i = 0; i < 3; i++) {
            var type = sortType[i];
            if (a[sortKeyArr[i]] > b[sortKeyArr[i]]) {
                return type <= 0 ? -1 : 1;
            }
            else if (a[sortKeyArr[i]] < b[sortKeyArr[i]]) {
                return type <= 0 ? 1 : -1;
            }
        }
        return 0;
    });
    return list;
};

//排序
var _sortUserRankList = function (list) {
    //this._guildWarGroupDic
    //数据结构：[行会id,行会积分]
    var sortKeyArr = ["points", "combat"]; //排序规则：积分＞最后掠夺
    var sortType = [-1, -1]; //积分降序，最后掠夺升序
    list.sort(function (a, b) {
        for (var i = 0; i < 2; i++) {
            var type = sortType[i];
            if (a[sortKeyArr[i]] > b[sortKeyArr[i]]) {
                return type <= 0 ? -1 : 1;
            }
            else if (a[sortKeyArr[i]] < b[sortKeyArr[i]]) {
                return type <= 0 ? 1 : -1;
            }
        }
        return 0;
    });
    return list;
};


module.exports = GuildWarServerData;

