/**
 * Created by Administrator on 2015/11/6.
 */

/**
 * Created by Administrator on 2015/9/18.
 */

//缓存
var dataCache = {};

var DataObj = function(){
    this.taskUpdateId = 0;
    this.hasDealPk = false;
    this.pkEnemyId = 0;
    this.pkOutCdArr = [];
    this.hasRankDealPk = false;
    this.bePkKill = false;
    this.pkOutWinCount = 0;
    this.preLootTime = null;//[异常次数，上一次时间]
    this.pkStartTime = null;
    this.guildId = null;
    this.guildEnnoble = null;//公会爵位
    this.userLvl = null;//用户等级
    this.bossCost = {};
    this.onlineLootData = [];//掉落统计[上一次预掉落时间，累计次数,累计时间,累计金币，累计经验,副本id,10波怪时间]
    this.coffersBreakNum = 0;
    this.isGuildChange = 0;     //公会是否变动
    this.guildWarUserId = null;//行会战用户id
};

//设置行会战用户id
exports.setGuildWarUserId = function(userId,guildWarUserId){
    var data = _getData(userId);
    data.guildWarUserId = guildWarUserId;
};

//获取行会战用户id
exports.getGuildWarUserId = function(userId){
    var data = _getData(userId);
    return data.guildWarUserId;
};

//设置在线掉落数据
exports.setOnlineLootData = function(userId,onlineLootData){
    var data = _getData(userId);
    data.onlineLootData = onlineLootData;
};

//获取在线掉落数据
exports.getOnlineLootData = function(userId){
    var data = _getData(userId);
    return data.onlineLootData;
};

//设置用户等级
exports.setUserLvl = function(userId,userLvl){
    var data = _getData(userId);
    data.userLvl = userLvl;
};

//获取用户等级
exports.getUserLvl = function(userId){
    var data = _getData(userId);
    return data.userLvl;
};

//设置公会变化
exports.setGuildChange = function(userId,isGuildChange){
    var data = _getData(userId);
    data.isGuildChange = isGuildChange;
};

//获取公会变化
exports.getGuildChange = function(userId){
    var data = _getData(userId);
    return data.isGuildChange;
};

//设置公会爵位
exports.setGuildEnnoble = function(userId,guildEnnoble){
    var data = _getData(userId);
    data.guildEnnoble = guildEnnoble;
};

//获取公会爵位
exports.getGuildEnnoble = function(userId){
    var data = _getData(userId);
    return data.guildEnnoble;
};

//设置公会id
exports.setGuildId = function(userId,guildId){
    var data = _getData(userId);
    data.guildId = guildId;
};

//获取公会id
exports.getGuildId = function(userId){
    var data = _getData(userId);
    return data.guildId;
};


//设置开始时间
exports.setPkStartTime = function(userId,time){
    var data = _getData(userId);
    data.pkStartTime = time;
};

//获取开始时间
exports.getPkStartTime = function(userId){
    var data = _getData(userId);
    return data.pkStartTime;
};


//设置预掉落时间
exports.setPreLootTime = function(userId,time){
    var data = _getData(userId);
    data.preLootTime = time;
};

//获取预掉落时间
exports.getPreLootTime = function(userId){
    var data = _getData(userId);
    return data.preLootTime;
};


//获取pk连胜
exports.getPkOutWinCount = function(userId){
    var data = _getData(userId);
    return data.pkOutWinCount;
};

//增加pk连胜
exports.addPkOutWinCount = function(userId){
    var data = _getData(userId);
    data.pkOutWinCount++;
};

//重置pk连胜
exports.resetPkOutWinCount = function(userId){
    var data = _getData(userId);
    data.pkOutWinCount = 0;
};

//设置野外pk被击杀
exports.setBePkKill = function(userId,bool){
    var data = _getData(userId);
    data.bePkKill = bool;
};

//获取野外pk被击杀
exports.getBePkKill = function(userId){
    var data = _getData(userId);
    return data.bePkKill;
};

//添加pk人的cd
exports.addPkOutCdArr = function(userId,eid){
    var data = _getData(userId);
    data.pkOutCdArr.push([eid,new Date()]);
};

//获取pk人的cd
exports.getPkOutCdArr = function(userId){
    var data = _getData(userId);
    return data.pkOutCdArr;
};

//设置pk人的cd
exports.setPkOutCdArr = function(userId,pkOutCdArr){
    var data = _getData(userId);
    data.pkOutCdArr = pkOutCdArr;
};


//添加任务
exports.addTaskUpdateId = function(userId){
    var data = _getData(userId);
    data.taskUpdateId++;
};

//获取任务
exports.getTaskUpdateId = function(userId){
    var data = _getData(userId);
    return data.taskUpdateId;
};

//设置处理pk
exports.setHasDealPk = function(userId,bool){
    var data = _getData(userId);
    data.hasDealPk = bool;
};

//获取排行处理pk
exports.getHasRankDealPk = function(userId){
    var data = _getData(userId);
    return data.hasRankDealPk;
};

//设置处理pk
exports.setHasRankDealPk = function(userId,bool){
    var data = _getData(userId);
    data.hasRankDealPk = bool;
};

//获取处理pk
exports.getHasDealPk = function(userId){
    var data = _getData(userId);
    return data.hasDealPk;
};

//设置挑战对手
exports.setPkEnemyId = function(userId,enemyId){
    var data = _getData(userId);
    data.pkEnemyId = enemyId;
};

//获取挑战对手
exports.getPkEnemyId = function(userId){
    var data = _getData(userId);
    return data.pkEnemyId;
};

//设置国库击破守卫数
exports.setCoffersBreakNum = function(userId,num){
    var data = _getData(userId);
    data.coffersBreakNum = num;
};

//获取国库击破守卫数
exports.getCoffersBreakNum = function(userId){
    var data = _getData(userId);
    return data.coffersBreakNum;
};



//设置炼狱消耗
exports.setBossCost = function(userId,costObj){
    var data = _getData(userId);
    data.bossCost = costObj;
};

//获取炼狱消耗
exports.getBossCost = function(userId){
    var data = _getData(userId);
    return data.bossCost;
};


/**
 * 新增
 * @param userId
 * @param lootUid
 */
var _newData =  function(userId,data){
    dataCache[userId] = data;
};

/**
 * 获取
 * @param userId
 * @returns {*}
 */
var _getData = function(userId){
    var data = dataCache[userId];
    if(!data){
        data = new DataObj();
        dataCache[userId] = data;
    }
    return data;
};

/**
 * 删除
 * @param userId
 */
exports.delData =  function(userId){
    if(!dataCache[userId]) return;
    delete dataCache[userId];
};
