//+++++++++++++++++公用数据结构 开始+++++++++++++++
//心法
exports.ExHeartStuntData = function () {
    this.heartStuntData = null;//
    this.userData = null;//
    this.isSucceed = null;//
    this.genuineQiArr = null;//
};

//聚灵妖莲
exports.ExDemonLotusData = function () {
    this.demonLotusData = null;//
    this.userData = null;//
    this.expSum = null;//
    this.isSucceed = null;
    this.isWeek = null;//是否激活周卡
    this.isMonth = null;//是否激活月卡
    this.delBagItems = null;//
    this.genuineQiArr = null;//[真气值,更新时间]
};

//战斗数据
exports.FightData = function () {
    this.isWin = null;//是否胜利
    this.star = null;//星级
    this.vData = null;//验证数据
    this.residueHp = null;//剩余血量
};

//boss信息
exports.BossData = function () {
    this.originHp = null;//原始生命值
    this.curHp = null;//当前hp
    this.bossId = null;//boss的id
    this.startTime = null;//开始时间
    this.endTime = null;//结束时间
    this.inspireHurt = null;//伤害加成
    this.inspireEndTime = null;//鼓舞结束时间
    this.inspireNum = null;//鼓舞次数
    this.myHurt = null;//我的伤害
    this.myRank = null;//我的排名
    this.myGuildName = null;//我的行会名
    this.myKey = null;//我的key值
    this.callUserName = null;//召唤者名字
    this.callUserGuildName = null;//召唤者公会id
    this.lastExitTime = null;//上一次退出时间
    this.isOver = null;//战斗是否结束
    this.isFirstEnter = null;//第一次进入
    this.type = null;//boss类型
    this.isRepeat = null;//是否复活召唤
    this.callUserId = null;//召唤者id
    this.callUserGuildId = null;//召唤者公会id
};

exports.ExBossData = function () {
    this.bossData = null;
    this.userData = null;
    this.bossEntity = null;
    this.delBagItems = null;
};

exports.ExTreasureBossData = function() {
    this.bossData = null;
    this.bagItem = null;
};

exports.ExBossEntity = function () {
    this.bossList = null;//boss数据组
    this.otherData = null;//其他数据 {bossId:[行会id,行会名称，是否上锁]}
    this.nowDate = null;//当前时间
};

//世界BOSS输出排行数据
exports.BossHurtRank = function () {
    this.userId = null;
    this.rank = null;//排行
    this.icon = null;//头像id
    this.userName = null;//用户名
    this.guildName = null;//公会名
    this.hurt = null;//伤害
    this.vip = null;//伤害
};

//boss结果数据
exports.BossResult = function () {
    this.isWin = null;//是否胜利
    this.totalHurt = null;//累计伤害
    this.myHurtRank = null;//我的伤害排名
    this.hurtGold = null;//伤害奖励
    this.killTotalTime = null;//击杀耗时
    this.firstHurtName = null;//伤害第一的名字
    this.killUserName = null;//最后一击的名字
    this.bossId = null;//bossId
    this.items = null;//得到的物品
};

//boss保存数据
exports.BossSaveResult = function () {
    this.rank10 = null;//前十
    this.callUserId = null;//召唤者id
    this.guildUserIds = null;//公会id
    this.callGuildName = null;//公会名称
    this.hurtDic = null;//伤害数据
    this.isWin = null;//是否胜利
    this.killTotalTime = null;//击杀耗时
    this.firstHurtName = null;//伤害第一的名字
    this.killUserName = null;//最后一击的名字
};

//boss保存数据
exports.BossResultData = function () {
    this.rank5 = null;//前5
    this.callUserName = null;//召唤者
    this.callGuildName = null;//召唤公会
    this.firstHurtName = null;//伤害第一的名字
    this.killUserName = null;//最后一击的名字
    this.myHurt = null;//我的伤害
    this.isWin = null;//是否胜利
};

//战斗结算
exports.FightResult = function () {
    //显示用
    this.winStatus = null;//1：胜利，2：失败
    this.gold = null;//获得金币
    this.items = null;//得到的物品
    this.honor = null;//得到的荣誉
    this.expc = null;//得到的经验
    this.killValue = null;//杀戮值
    this.pkValue = null;//pk值
    this.prestige = null;//声望值
    this.curRank = null;//最终排名
    this.changeRank = null;//改变的排名
    this.hasChangeRank = null;
    this.attackMember = null;//攻击方信息 [名字,战力,头像id,服务器名，行会名]
    this.beAttackMember = null;//被攻击方信息 [名字,战力,头像id,服务器名，行会名]
    this.mPkColor = null;
    this.ePkColor = null;
    this.isRevenge = null;//是否复仇 1:已复仇  0：未复仇
    this.coffersPerson = null;//个人收益增加
    this.coffersCommon = null;//国库储量增加
    this.coffersStatus = null;//掠夺状态，0：正常，1：已经掠夺过，2：已经被捷足先登或者已经达到上限
    this.coffersPoints = null;//国库积分
    this.coffersHurt = null;//国库伤害
    this.guildWarPoints = null;//行会战积分
    this.guildWarStatus = null;//掠夺状态，0：正常，1：已经击破，2：活动结束 3: 跨服数据异常

    //更新用
    this.updateUser = null;//用户更新的数据
    this.updatePkOut = null;//更新
    this.updateArena = null;//更新
    this.bagItems = null; //背包添加itmes
    this.equipBagItems = null; //装备背包添加itmes
    this.guildData = null;//
    this.guildPersonalData = null; //
    this.updateCoffers = null;//更新国库
};


//副本进度扩展
exports.ExCopyProgress = function () {
    this.copyProgress = null;
    this.userData = null;
    this.copyLoot = null;//掉落
    this.items = null;//获得奖励items
    this.delBagItems = null; //背包删除itmes

    this.bagItems = null;//
    this.equipBagItems = null; //
    this.guildData = null;//
    this.guildPersonalData = null; //
    this.isWin = null;
    this.progress = null;//公会副本进度
    this.damage = null;//公会副本伤害
    this.msg = null;
    this.wipeCount = null;//扫荡次数
};

exports.ServerInfo = function (id, area, name, host, port, isNew, status) {
    this.id = id || 0;
    this.area = area;//区
    this.name = name;//名字
    this.host = host;//主机ip
    this.port = port;//端口
    this.isNew = isNew;//是否新服
    this.status = status;//状态 0:维护 1:流畅 2:火爆 3:爆满
};

/**
 * 通过sdk登陆得到的数据
 * @constructor
 */
exports.LoginData = function (sdkData, account, user, rechargeData) {
    this.sdkData = sdkData;//dsnConsts.SDKData
    this.account = account;//dsnConsts.AccountEntity
    this.user = user;//dsnConsts.UserEntity
    this.rechargeData = rechargeData;//dsnConsts.RechargeData
    this.rank = null;
    this.offLineData = null;//离线数据，[离线时间（）秒、获得经验、获得金币、装备等级、件数、自动出售件数]
    this.arenaData = null;//竞技场数据
    this.copyProgressList = null;//副本进度
    this.heroList = null;//拥有的英雄
    this.pkOut = null;//野外pk数据
    this.lottery = null;//抽奖数据
    this.task = null;//任务数据
    this.lootTypeArr = null;//不掉落类型
};

/**
 * sdk返回数据结构
 * @param id
 * @param name
 * @param pic
 * @param sex
 * @param age
 * @constructor
 */
exports.SDKData = function (id, name, pic, sex, age) {
    this.id = id;
    this.name = name;
    this.pic = pic;
    this.sex = sex;
    this.age = age;
};

exports.ExAccount = function () {
    this.account = null;//
    this.loginKey = null;
};

/**
 * 公会数据扩展
 * @constructor
 */
exports.ExGuildData = function () {
    this.userData = null;//
    this.guildData = null;//
    this.guildPersonalData = null;
    this.chairmanName = null;//公长名称
    this.rank = null;//公会排名
    this.isGuild = null;//是否有公会
    this.isJoin = null;//是否成功加入公会
    this.isAtherGuild = null;//是否已加入其它公会
    this.isMembersMax = null;//是否满员
    this.dissolveId = null;//解散公会id
    this.items = null;//得到的物品
    this.bagItems = null; //背包添加itmes
    this.equipBagItems = null; //装备背包添加itmes
    this.isOpenBoss = null; //是否开启BOSS
    this.isOpenGuildWar = null; //是否开启行会战
    this.cfgData = null;//配置数据
};

/**
 * 红包数据扩展
 * @constructor
 */
exports.ExRedEnvelopeData = function () {
    this.userData = null;//
    this.guildPersonalData = null;//
    this.redEnvelopeData = null;//
    this.redEnvelopePersonalData = null;//
    this.isGet = null; //是否领取
    this.nameObj = null; //
};

/**
 * 用户数据扩展
 * @constructor
 */
exports.ExUserData = function () {
    this.userData = null;
    this.heroData = null;//英雄
    this.lotteryData = null;//抽奖
    this.taskData = null;//任务
    this.gold = null;//金币
    this.expc = null;//经验
    this.eventData = null;//事件数据 [事件id,物品items]
    this.items = null;//得到的物品
    this.arenaData = null;//巅峰赛
    this.shopData = null;//商店
    this.isFriend = null;//是否好友  0：陌生人  1：好友
    this.cheerCombat = null;//助阵后的战力
    this.friendCount = null; //助阵友情点
    this.residueCount = null; //好友助阵剩余次数
    this.pickAllItemsArr = null; //一键领取邮件id【id，id。。。】
    this.pickAllItemsList = null; //一键领取邮件items【items，items。。。】
    this.buyGoldResultArr = null;//购买金币获得的数据
    this.copyProgressData = null;//副本数据
    this.gainArr = null;//存放熔炼所得  [[名字,数量,颜色],[名字,数量,颜色]...]
    this.treasureValue = null; //获得探宝值
    this.cosTreValue = null; //扣除探宝值
    this.vitality = null; //活跃度
    this.offlineArr = null; //离线获得数据
    this.isMail = null; //开宝箱是否发邮件
    this.isFull = null; //开邮件背包是否满
    this.bagItems = null; //背包添加itmes
    this.delBagItems = null; //背包删除itmes
    this.equipBagItems = null; //装备背包添加itmes
    this.delEquipBagArr = null; //装备背包删除Arr     【id，id，。。。】
    this.wingExp = null;    //培养翅膀获得经验
    this.isWingCrit = null; //培养翅膀是否暴击
    this.shopIdObj = null;//全部购买商品数据 {id:数量,...}
    this.showMsgArr = null;//装备商店金币钻石消息码数组
    this.rebirthExp = null; //转生经验
    this.strengthArr = null; //强化结果【是否成功,结果等级,是否暴击】
    this.genuineQi = null; //真气
    this.wingCritNum = null;//翅膀暴击次数
    this.isGetSkill = null;//是否获得技能
    this.baptizeValue = null;//洗炼的值
};

/**
 * 水晶数据扩展
 * @constructor
 */
exports.ExCrystalData = function () {
    this.crystalData = null;
    this.beyondPer = null;
};

/**
 * 战印数据扩展
 * @constructor
 */
exports.ExWarPrintedData = function () {
    this.medalData = null;
    this.medalTitle = null;
    this.isUpdata = null;
    this.delBagItems = null;
};

/**
 * 个人排名数据扩展
 * @constructor
 */
exports.ExUserRankData = function () {
    this.userRankList = null;//对应的所有数据 ds.UserRankEntity
    this.userRankData = null;//对应的个人数据 ds.UserRankEntity
    this.userRank = null;//排名
    this.guildName = null;//公会名称
    this.value = null;//排名值
};

/**
 * 英雄争夺记录
 * @constructor
 */
exports.HeroChangeRecord = function () {
    this.type = null;//0:抢夺，1:被抢, 2:包含抢夺和被抢记录
    this.fightType = null;//1：段位赛 2：仇人榜
    this.enemyName = null;//名字
    this.heroData = null;//英雄改变数据 {id:count}
    this.time = null;//时间
    this.gold = null;//金币
    this.isWin = null;//是否胜利
};

//充值记录数据
exports.RechargeData = function (countMap, cardTimeMap) {
    this.countMap = countMap;//充值次数映射
    this.cardTimeMap = cardTimeMap;//月卡时间映射：rechargeTime, effTime, endTime  充值时间、生效时间、失效时间
};

//活动扩展数据
exports.ExActivity = function () {
    this.activity = null;//活动数据
    this.activityItems = null;//[ds.ActivityItem]
    this.todayRecharge = null;//今天累充钻石
    this.allRecharge = null;//所有累充钻石
    this.todayCost = null;//今天消耗钻石
    this.allCost = null;//所有消耗钻石
    this.isNeedOp = null;//是否需要操作，主要是红点
    this.days = null; //五日活动进行到的天数
    this.bgType = null;//背景图类型
    this.leftTime = null;//活动剩余时间（秒为单位）
    this.maxPaymoney = null;//单笔充值金额
    this.luckValue = null; //幸运值
};

/**
 * 活动项数据
 * @constructor
 */
exports.ActivityItem = function () {
    this.items = null;//物品 {"id":num,..}
    this.diamond = null;//钻石
    this.rmb = null;//人民币
    this.userLvl = null;//用户等级
    this.limitNum = null;//限购次数
    this.discount = null;//几折
    this.vipLvl = null;//vip等级
    this.randomHero = null;//随即英雄
    this.wordSet = null;//字集
    this.vPlan= null; //V计划
};


//活动扩展数据
exports.ExActivityData = function () {
    this.userData = null;
    this.bagItems = null;
    this.equipBagItems = null;
    this.lotteryItemsArr = null;
    this.mysterShopArr = null;
    this.luckyTalosItemArr = null;
    this.exItem = null;
    this.getGold = null;
};

/**
 * sdk的vip数据
 */
exports.SdkVipData = function () {
    this.isVip = null;//是否vip 0:否，1：是
    this.vipLevel = null;//vip等级
    this.score = null;//积分（星星）数量
};


/**
 * 排行数据
 * @constructor
 */
exports.Rank = function () {
    this.rank = null;//领主排名
    this.name = null;//领主名字
    this.iconId = null;//领主头像id
    this.lvl = null;//领主等级
    this.combat = null;//战斗力
    this.killValue = null;//杀戮值
    this.vip = null;//vip
    this.userId = null;//用户id
    this.pkValue = null;//红名点
    this.guildName = null;//公会名称
};

/**
 * 野外PK返回数据结构
 * @constructor
 */
exports.PkOutUserData = function () {
    this.userId = null;
    this.name = null;//名字
    this.iconId = null;//头像
    this.killValue = null;//杀戮值
    this.gold = null;//金币
    this.expc = null;//可掠夺经验
    this.lvl = null;//等级
    this.pkValue = null;//pk值
    this.vip = null;//vip
    this.combat = null;//战斗力
    this.guildName = null;//公会名称
    this.isTreasure = null; //是否是秘宝携带者
};

/**
 * 野外pk扩展
 * @constructor
 */
exports.ExPkOut = function () {
    this.pkOutData = null;
    this.heroList = null;
    this.enemyList = null;
    this.otherDataList = null;
    this.userData = null;
    this.hasNewDeal = null;
    this.fightData = null;//["敌方用户等级"]
    this.guildData = null;
    this.guildPersonalData = null;
};

/**
 * 竞技场扩展
 * @constructor
 */
exports.ExArena = function () {
    this.arenaData = null;
    this.heroList = null;
    this.otherDataList = null; //[[衣服显示id,武器显示id,翅膀显示id],..]
    this.fightData = null;//["敌方用户等级"]
    this.userData = null;

};

/**
 * 竞技场PK返回数据结构
 * @constructor
 */
exports.PKUserData = function () {
    this.userId = null;
    this.name = null;//名字
    this.iconId = null;//头像
    this.combat = null;//战斗力
    this.lvl = null;//等级
    this.rank = null;//排名
    this.vip = null;//vip
    this.guildName = null;//公会名称
};

/**
 * 聊天数据
 * @param uniqueId
 * @param type
 * @param sysArgs
 * @param userArgs
 * @constructor
 */
exports.ChatData = function (uniqueId, type, sysArgs, userArgs, subType, guildArgs) {
    this.uniqueId = uniqueId;//唯一id
    this.type = type;//类型：0:普通聊天 1:系统 2:公会
    this.sysArgs = sysArgs;//系统参数 数组 [系统id,参数1，参数2....]
    this.userArgs = userArgs;//玩家聊天参数 [用户名,vip,聊天内容,是否GM,公会名称]
    this.guildArgs = guildArgs;//玩家公会聊天参数 [用户名,vip,头衔,聊天内容]
    this.subType = subType;//1:跑马灯 2:即时公告
};

//公会聊天、世界聊天
exports.AllChatData = function () {
    this.worldChat = null;
    this.guildChat = null;
    this.isOri = null;//是否原公会
    this.guildId = null;
    this.userData = null;
    this.delBagItems = null;
};

/**
 *同步数据
 */
exports.AsyncData = function () {
    this.chat = null;//聊天
    this.redEnvelope = null;//红包
    this.task = null;//任务
    this.pkDeal = null;//pk处理
    this.rankPkDeal = null;//排行榜pk处理
    this.kefu = null; //客服数据
    this.sysMsg = null; //即时公告、跑马灯
    this.bePkKill = null; //pk被攻击
    this.inspire = null;//鼓舞
    this.isBossOpen = null;//是否挑战boss中
    this.buffArr = null;//buff数组
    this.guildChat = null;//公会聊天
    this.isGuildChange = null;//公会是否变动
    this.guildWarIsOpen = null;//公会战是否开启
};

exports.AsyncData2 = function(){
    this.lastUpdateTime = null;//最后更新时间
    this.lootTypeArr = null;//不掉落的类型组
};

exports.ExTask = function () {
    this.taskData = null;//任务
    this.updateId = null;//更新id
};

exports.HandleRecharge = function () {
    this.userData = null;//用户数据
    this.addDiamond = null;//得到的钻石
    this.isFinish = null;//是否完成
    this.rechargeId = null;//充值项
};


//公会成员
exports.GuildMember = function () {
    this.lvl = null;//等级
    this.nickName = null;//昵称
    this.combat = null;//战力
    this.guildAct = null;//累计公会贡献
    this.position = null;//职能
    this.ennoble = null;//爵位
    this.lastUpdateTime = null;//最后更新时间
    this.iconId = null;//头像
    this.vip = null;//vip
    this.userId = null;//用户id
    this.offlineHour  = null;//离线小时数
};

// 获取兄弟的返利信息
exports.BonusInfo = function () {
    this.shareInfo = null; //分红的汇总信息
    this.relations = null; //下家的贡献列表
}

// 兄弟分享的主信息
exports.BonusShareData = function (isFirst, relationCount, amountDraw, balance) {
    this.isFirst = isFirst; //是否是首次使用分红
    this.relationCount = relationCount; // 下家的个数
    this.amountDraw = amountDraw; // 已经提取的金额
    this.balance = balance; // 为提取的金额
}

// 兄弟分享的详细信息
exports.BonusRelationData = function (id, userId, nickName, level, vip, amount) {
    this.id = id;
    this.userId = userId;
    this.nickName = nickName;
    this.level = level;
    this.vip = vip;
    this.amount = amount; // 累积的贡献金额
}

// 兄弟分享的url
exports.BonusShareUrl = function (url, gifted) {
    this.url = url;
    this.gifted = gifted;
}

exports.BonusDrawResult = function (added, total) {
    this.added = added;
    this.total = total;
}

//五日目标
exports.FiveDaysTaret = function () {
    this.day = null; //活动天数
    this.items = null; //每日数
}

exports.ExFiveDaysTargetData = function () {
    this.value = null;
    this.rank = null;
}

/**
 * 显示英雄数据
 * @constructor
 */
exports.ShowHeroData = function () {
    this.heroList = null;
    this.otherDataList = null; //[[衣服显示id,武器显示id,翅膀显示id],..]
    this.fightData = null;
};

//王城霸主
/**
 * *王城霸主信息
 *@constructor
 */
exports.ChallengeCupData = function () {
    this.isOpen = null; //活动状态 0：已结束 1：开始
    this.userId = null; //守擂者id
    this.nickName = null; //昵称
    this.iconId = null; //头像id
    this.lvl = null; //玩家等级
    this.vip = null;//vip等级
    this.combat = null;//战力
    this.guildName = null; //工会名字
    this.guildLevel = null; //工会等级
    this.challengerUserId = null;//当前挑战者userId
    this.leftTime = null; //成为霸主的时间戳
    this.nextChallengeTime = null; //下次可以挑战的时间戳
    this.activityLeftTime = null; //活动剩余时间
    this.HeroDisplay = null;
    this.upCount = null;//顶数
    this.downCount = null;//踩数
    this.myOpNum = null;//个人操作次数
}

//擂主守擂排行榜数据
exports.ChampionDurationTimeRank = function () {
    this.rank = null;
    this.name = null;
    this.iconId = null;
    this.lvl = null;
    this.durationTime = null;
    this.userId = null;
    this.vip = null;
}

/*
 **
 * 擂台赛扩展
 * @constructor
 */
exports.ExChallengeCupFight = function () {
    this.errCode = null;
    this.heroList = null;
    this.otherDataList = null; //[[衣服显示id,武器显示id,翅膀显示id],..]
    this.fightData = null;//["敌方用户等级"]
    this.userData = null;
};

/*
 **
 * 霸主
 * @constructor
 */
exports.King = function () {
    this.myGuildId = null;//自己行会id
    this.myGuildName = null;//自己行会名
    this.kingGuildId = null;//霸主行会id
    this.kingGuildName = null;//霸主行会名
    this.kingGuildLvl = null;//霸主行会等级
    this.kingId = null;//霸主名字
    this.kingName = null;//霸主名字
    this.kingVip = null;//霸主vip
    this.kingLvl = null;//霸主等级
    this.kingHeroDisplay = null;//霸主外观
    this.beWorshipNum = null;//被膜拜的次数
    this.beWorshipCount = null;//被膜拜的总次数
    this.buffOpenNum = null;//buff开启次数
    this.buffOpenTime = null;//最后一次开启时间
    this.buffEndTime = null;//buff结束时间
};

/**
 * 霸主扩展
 * @constructor
 */
exports.ExKing = function () {
    this.king = null;//霸主数据
    this.userData = null;//用户数据
    this.bagItems = null;//得到的物品
};

/**
 * 转生
 * @constructor
 */
exports.Rebirth = function () {
    this.userData = null;
    this.heroList = null;
};

/**
 * 开光
 * @constructor
 */
exports.Opening = function () {
    this.userData = null;
    this.diffExp = null;
}

/**
 * 国库扩展
 * @constructor
 */
exports.ExCoffers = function () {
    this.coffers = null;//国库
    this.userData = null;//用户数据
    this.heroList = null;
    this.otherDataList = null; //[[衣服显示id,武器显示id,翅膀显示id],..]
    this.fightData = null;//["敌方用户等级"]
    this.addBuildValue = null;//增加的建设值
    this.addGold = null;//增加的金币
    this.addBuffExpc = null;//增加的激励值
    this.delBagItems = null;//删除的物品
    this.coffersLvl = null;//国库等级
    this.status = null;//1：已经击破
};

/**
 * 国库记录
 * @constructor
 */
exports.CoffersRecord = function () {
    this.isWin = null;//是否胜利
    this.time = null;//时间
    this.attackName = null;//攻击玩家名
    this.serverName = null;//服务器名称
    this.door = null;//门
    this.defeseName = null;//防守玩家名
    this.recource = null;//得到的金币
    this.points = null;//跨服积分
};

//国库守卫用户信息
exports.CofferUser = function () {
    this.userId = null;//用户id
    this.serverId = null;//服务器id
    this.door = null;//门
    this.rankType = null;//头衔类型
    this.icon = null;//头像
    this.lvl = null;//等级
    this.vip = null;//vip
    this.name = null;//名字
    this.combat = null;//战力
    this.isLoot = null;//是否掠夺
    this.isBreak = null;//是否击破
    this.medalTitle = null;//勋章
    this.breakReplaySeconds = null;//击破恢复剩余秒数
};

//国库守卫扩展
exports.ExDefenceData = function () {
    this.cofferUserArr = null;//守卫数据
    this.hpAdd = null;//生命加成百分比
    this.attackAdd = null;//攻击加成百分比
    this.personResource = null;//个人收益
    this.coffersResource = null;//国库收益
    this.lootRate = null;//掠夺倍率
    this.breakNum = null;//击破数量
    this.isCanLoot = null;//是否还可以掠夺
    this.todayLootNum = null;//今日已掠夺次数
    this.coffersLvl = null;//国库等级
    this.curResource = null;//国库当前储量
    this.serverName = null;//服务器名称
    this.serverId = null;//服务器id
};

//国库服务器
exports.CoffersServer = function () {
    this.serverName = null;//服务器名
    this.serverId = null;//服务器id
    this.resource = null;//国库储量
    this.isLootArr = null;//[状态,状态...]  状态 0：未掠夺，1：已掠夺
    this.isBreakArr = null;//[状态,状态...]  状态 0：未击破，1：已击破
};

//玩吧礼包
exports.WanbaGift = function () {
    this.code = null;//领取状态 0：领取成功 1：已领取 -1:其他错误
    this.message = null;//错误信息
    this.userData = null;
    this.getGold = null;
    this.getDiamond = null;
    this.bagItems = null;
    this.equipBagItems = null;
};

exports.MyGuildWarData = function () {
    this.groupId = null;//组别
    this.guildReNum = null;//行会剩余数量
    this.guildRank = null;//我的行会排名
    this.doorLives = null;//城门存活数
    this.points = null;//点数
    this.nextFightTime = null;//下一次攻击时间
    this.inspireEndTime = null;//鼓舞结束时间
    this.warEndTime = null;//行会战结束时间
    this.guildTotal = null;//行会总数
    this.isDefence = null;//是否防守
    this.myGuildRefreshId = null;//己方刷新id
    this.serverId = null;//服务器id
};


//行会战信息
exports.ExMyGuildWarData = function () {
    this.userData = null;//用户信息
    this.myGuildWarData = null;//我的行会信息
};

//同步数据
exports.GuildWarSyncData = function(){
    this.myGuildWarData = null;
    this.fightRecordArr = null;
    this.guildList = null;//GuildServer
    this.attackData = null;//GuildWarData
    this.defenceData = null;//GuildWarData
};

exports.GuildWarFightRecord = function(){
    this.id = null;//id
    this.type = null;//1:攻打，2：被攻打
    this.attackData = null;//[玩家名，服务器名,行会名，门]
    this.beAttackData = null;//[门，服务器名,行会名,玩家名]
    this.time = null;//时间
};

/**
 * 公会服务器
 * @constructor
 */
exports.GuildServer = function () {
    this.serverName = null;//服务器名
    this.serverId = null;//服务器id
    this.guildId = null;//行会id
    this.guildName = null;//行会名
    this.guildLvl = null;//行会等级
    this.doorLives = null;//守卫存活数
    this.points = null;//积分
    this.progress = null;//进度，百分比
    this.maxPoints = null;//最大积分
    this.lastLootTime = null;//最后掠夺时间
};

//行会战信息
exports.GuildWarData = function () {
    this.doorList = null;//公会门信息
    this.guildId = null;//行会id
    this.guildName = null;//行会名
    this.cd = null;//剩余cd,秒
    this.serverId = null;//服务器id
};


exports.GuildFightData = function () {
    this.heroList = null;
    this.otherDataList = null; //[[衣服显示id,武器显示id,翅膀显示id],..]
    this.fightData = null;//["敌方用户等级"]
    this.directWin = null;//直接胜利
    this.myGuildWarData = null;//我的行会信息
    this.isBreak = null;//是否已经击破
    this.getPoints = null;//获得的积分
};

/**
 * 公会门信息
 * @constructor
 */
exports.GuildWarDoor = function () {
    this.door = null;//门口，东南西北 0,1,2,3
    this.hp = null;//生命值
    this.userId = null;//守门人id
    this.userName = null;//守门人名字
    this.userIcon = null;//守门人头像
    this.lastUserId = null;//最后的守门人id
    this.lastUserName = null;//最后的守门人名字
    this.lastUserIcon = null;//最后的守门人头像
    this.isBreak = null;//是否击破
    this.lastDownTime = null;//最后下阵时间
};

//所有排行
exports.GuildWarAllRank = function(){
    this.guildArr = null;//行会排行
    this.chairArr = null;//会长排行
    this.userArr = null;//个人排行
};

/**
 * 公会战积分排名
 * @constructor
 */
exports.GuildWarRank = function () {
    this.rank = null;//排名
    this.guildId = null;//行会id
    this.guildName = null;//行会名称
    this.points = null;//积分
    this.serverId = null;//服务器id
};

/**
 * 公会战个人排名
 * @constructor
 */
exports.GuildWarUserRank = function () {
    this.rank = null;//排名
    this.userId = null;//玩家id
    this.userName = null;//玩家名
    this.vip = null;//玩家vip
    this.iconId = null;//玩家头像
    this.guildName = null;//行会名
    this.points = null;//积分
    this.serverId = null;//服务器id
};

/**
 * 公会战防守记录
 * @constructor
 */
exports.GuildWarDefenceRecord = function () {
    this.isWin = null;//是否胜利
    this.time = null;//时间
    this.door = null;//门
    this.attackServerId = null;//攻击者服务器id
    this.attackServerName = null;//攻击者服务器名
    this.attackUserName = null;//攻击者名称
    this.attackGuildName = null;//攻击者行会
    this.defenceUserName = null;//防守者名称
    this.hp = null;//损失血量
    this.isDirect = null;//是否直接击破
};

/**
 * 公会战战况
 * @constructor
 */
exports.GuildWarAttackRecord = function () {
    this.aServerId = null;//攻击者服务器id
    this.aServerName = null;//攻击者服务器名
    this.aUserName = null;//攻击者名称
    this.aGuildName = null;//攻击者行会
    this.dServerId = null;//防守者服务器id
    this.dServerName = null;//防守者服务器名
    this.dUserName = null;//防守者名称
    this.dGuildName = null;//防守者行会
    this.isBreak = null;//是否击破
    this.door = null;//门
    this.time = null;//时间
};

//江湖密探
exports.Incognito = function() {
    this.userData = null;
    this.openTime = null;
};

//密保信息
exports.TreasureInfo = function() {
    this.id = null;
    this.itemId = null;
    this.openTime = null;//开启时间
    this.status = null;  //状态
    this.items = null;//开出物品
};
//账户服务器
exports.AccountServer = function() {
    this.myServerArr = null;
    this.lastServer = null;
    this.serverArr = null;
};
exports.ServerNameInfo = function() {
    this.serverId = null;
    this.serverName = null;
};


//额外的pk信息
exports.ExPkOutInfo = function() {
    this.openTime = null; //隐姓埋名开启时间
    this.treasureInfo = null;
};

exports.GuildWarServerSyncData = function(){
    this.guildWarObj = null;//对象
    this.syncId = 0;//同步id
}
//合成
exports.ComposeInfo = function() {
    this.delBagItem = null;
    this.treasureInfo = null;
};

/**
 * 公会信息
 * @constructor
 */
exports.SyncGuildWarData = function () {
    this.serverName = null;//服务器名
    this.serverId = null;//服务器id
    this.serverHost = null;//服务器host
    this.serverPort = null;//服务器port
    this.guildId = null;//行会id
    this.guildName = null;//行会名
    this.guildLvl = null;//行会等级
    this.doorLives = null;//守卫存活数
    this.points = null;//积分
    this.progress = null;//进度，百分比
    this.groupId = null;//分组id
    this.doorData = {};//守卫门口信息 {"门":ds.GuildWarDoor,..}
    this.rank = 0;
    this.chairmanData = null;//会长数据 [会长id,会长名称，会长vip,会长头像]
    this.lastLootTime = 0;
    this.fightRecordArr = [];//战斗记录,保存10条
    this.refreshId = 0;
    this.maxPoints = 0;
};

/**
 * 个人信息
 * @constructor
 */

exports.SyncGuildWarUser = function () {
    this.userId = null;//用户id
    this.userName = null;//用户名
    this.guildId = null;//行会id
    this.guildName = null;//行会名
    this.points = null;//个人积分
    this.vip = null;//vip
    this.iconId = null;//用户头像
    this.lastLootTime = 0;//最后掠夺时间
    this.rank = 0;
    this.groupId = null;
    this.nextFightTime = null;//下一次可以战斗的时间
    this.inspireEndTime = null;//鼓舞结束时间
    this.guildPosition = null;//行会职务
    this.nextUpTime = null;//下一次上阵时间
    this.serverId = null;//服务器id
};

exports.SignData = function(){
    this.signGroupId = null;
    this.lastGroupId = null;
    this.lastGuildRank = null;
    this.lastUserRank = null;
    this.isPrize = null;
};

exports.ExpeditionData = function(){
    this.expData = null;
    this.expHeroData = null;
    this.upUserData = null;
    this.finishData = null;
    this.heroList = null;
    this.otherDataList = null;
    this.fightData = null;//["敌方用户等级"]
    this.finishLvl = null;
}