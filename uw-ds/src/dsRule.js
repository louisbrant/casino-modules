var dsnConsts = require("uw-data").dsNameConsts;

exports.ExHeartStuntData = {
    heartStuntData :dsnConsts.HeartStuntEntity,
    userData : dsnConsts.UserEntity
};

exports.AllChatData = {
    worldChat : dsnConsts.ChatData,
    guildChat : dsnConsts.ChatData
};

exports.ExBossData = {
    bossData : dsnConsts.BossData,
    userData : dsnConsts.UserEntity,
    bossEntity: dsnConsts.BossEntity
};

exports.ExTreasureBossData = {
    bossData : dsnConsts.BossData,
}

exports.ExBossEntity = {
    bossList: dsnConsts.BossEntity
};


exports.ExDemonLotusData = {
    demonLotusData : dsnConsts.DemonLotusEntity,
    userData : dsnConsts.UserEntity
};

exports.ExAccount = {
    account: dsnConsts.AccountEntity
}

exports.ExGuildData = {
    userData : dsnConsts.UserEntity,
    guildData : dsnConsts.GuildEntity,
    guildPersonalData : dsnConsts.GuildPersonalEntity
};

exports.ExRedEnvelopeData = {
    userData : dsnConsts.UserEntity,
    guildPersonalData : dsnConsts.guildPersonalData,
    redEnvelopeData : dsnConsts.RedEnvelopeEntity,
    redEnvelopePersonalData : dsnConsts.RedEnvelopePersonalEntity
};

exports.LoginData = {
    account : dsnConsts.AccountEntity,
    user: dsnConsts.UserEntity,
    rechargeData: dsnConsts.RechargeData,
    arenaData:dsnConsts.ArenaEntity,
    copyProgressList:dsnConsts.CopyProgressEntity,
    heroList:dsnConsts.HeroEntity,
    pkOut:dsnConsts.PkOutEntity,
    lottery:dsnConsts.LotteryEntity,
    task:dsnConsts.TaskEntity
};

exports.FightResult = {
    updateUser : dsnConsts.UserEntity,
    updateArena : dsnConsts.ArenaEntity,
    updatePkOut : dsnConsts.PkOutEntity,
    guildData : dsnConsts.GuildEntity,
    guildPersonalData : dsnConsts.GuildPersonalEntity
};

exports.ExCopyProgress = {
    copyProgress : dsnConsts.CopyProgressEntity,
    userData : dsnConsts.UserEntity,
    guildData : dsnConsts.GuildEntity,
    guildPersonalData : dsnConsts.GuildPersonalEntity
};

exports.FightRound = {
    doBuffEffectArr : dsnConsts.FightBuffEffect
};


exports.ExActivity = {
    activity : dsnConsts.ActivityEntity,
    activityItems : dsnConsts.ActivityItem
};

exports.ExActivityData = {
    userData : dsnConsts.UserEntity
};

exports.ExUserData = {
    userData : dsnConsts.UserEntity,
    arenaData : dsnConsts.ArenaEntity,
    heroData : dsnConsts.HeroEntity,
    lotteryData : dsnConsts.LotteryEntity,
    taskData : dsnConsts.TaskEntity,
    copyProgressData:dsnConsts.CopyProgressEntity,
    shopData : dsnConsts.ShopEntity
};

exports.ExCrystalData = {
    crystalData : dsnConsts.CrystalEntity
};

exports.ExUserRankData = {
    userRankData : dsnConsts.UserRankEntity,
    userRankList : dsnConsts.UserRankEntity
};

exports.ExArena = {
    arenaData : dsnConsts.ArenaEntity,
    heroList : dsnConsts.HeroEntity,
    userData: dsnConsts.UserEntity
};

/**
 * 野外pk扩展
 * @constructor
 */
exports.ExPkOut = {
    pkOutData : dsnConsts.PkOutEntity,
    heroList : dsnConsts.HeroEntity,
    enemyList : dsnConsts.PkOutUserData,
    userData : dsnConsts.UserEntity,
    guildData : dsnConsts.GuildEntity,
    guildPersonalData : dsnConsts.GuildPersonalEntity
};


exports.ExTask = {
    taskData : dsnConsts.TaskEntity
};

exports.HandleRecharge = {
    userData : dsnConsts.UserEntity
};

exports.BonusInfo = {
    shareInfo: dsnConsts.BonusShareData,
    relations: dsnConsts.BonusRelationData
};

exports.FiveDaysTaret = {
    items : dsnConsts.ExFiveDaysTargetData
}

exports.ExFiveDaysTargetData = {
    rank: dsnConsts.FiveDaysTargetEntity
}

/**
 * 显示英雄数据
 * @constructor
 */
exports.ShowHeroData = {
    heroList : dsnConsts.HeroEntity
};


exports.ExChallengeCupFight = {
    heroList : dsnConsts.HeroEntity,
    userData: dsnConsts.UserEntity
};

exports.ExKing = {
    king : dsnConsts.King,
    userData: dsnConsts.UserEntity
};


/**
 * 转生
 * @constructor
 */
exports.Rebirth = {
    userData : dsnConsts.UserEntity,
    heroList : dsnConsts.HeroEntity
};


/**
 * 开光
 * @constructor
 */
exports.Opening = {
    userData : dsnConsts.UserEntity
};
exports.ExCoffers = {
    coffers : dsnConsts.CoffersEntity,
    userData: dsnConsts.UserEntity,
    heroList : dsnConsts.HeroEntity
};

exports.ExDefenceData = {
    cofferUserArr : dsnConsts.CofferUser
};


exports.WanbaGift = {
    userData: dsnConsts.UserEntity
};

exports.GuildWarData = {
    doorList : dsnConsts.GuildWarDoor
};

exports.GuildWarSyncData = {
    myGuildWarData : dsnConsts.MyGuildWarData,
    fightRecordArr : dsnConsts.GuildWarFightRecord,
    guildList : dsnConsts.GuildServer,
    attackData : dsnConsts.GuildWarData,
    defenceData : dsnConsts.GuildWarData
};

exports.ExMyGuildWarData = {
    userData : dsnConsts.UserEntity,
    myGuildWarData : dsnConsts.MyGuildWarData
};

exports.GuildFightData = {
    heroList : dsnConsts.HeroEntity,
    myGuildWarData : dsnConsts.MyGuildWarData
};

exports.GuildWarAllRank = {
    guildArr : dsnConsts.GuildWarRank,
    chairArr: dsnConsts.GuildWarUserRank,
    userArr : dsnConsts.GuildWarUserRank
};

exports.Incognito = {
    userData: dsnConsts.UserEntity
};

exports.ExPkOutInfo = {
    treasureInfo: dsnConsts.TreasureInfo
};

exports.ComposeInfo = {
    treasureInfo: dsnConsts.TreasureInfo
};

exports.AccountServer = {
    myServerArr:dsnConsts.ServerInfoEntity,
    lastServer:dsnConsts.ServerInfoEntity,
    serverArr:dsnConsts.ServerInfoEntity
}