/**
 * Created by Administrator on 2014/5/16.
 */

var async = require("async");
var PkOutEntity = require("uw-entity").PkOutEntity;
var IncognitoEntity = require("uw-entity").IncognitoEntity;
var c_game = require("uw-data").c_game;
var c_prop = require("uw-data").c_prop;
var c_lvl = require("uw-data").c_lvl;
var c_msgCode = require("uw-data").c_msgCode;
var t_item = require("uw-data").t_item;
var t_robot = require("uw-data").t_robot;
var g_robot = require("uw-global").g_robot;
var g_area = require("uw-global").g_area;
var g_data = require("uw-global").g_data;
var g_incognito = require("uw-global").g_incognito;
var g_lootConfig = require("uw-global").g_lootConfig;
var consts = require("uw-data").consts;
var fightUtils = require("uw-utils").fightUtils;
var c_pvpRankReward = require("uw-data").c_pvpRankReward;

var formula = require("uw-formula");
var ds = require("uw-ds").ds;
var getMsg = require("uw-utils").msgFunc(__filename);

var mainClient = require('uw-db').mainClient;
var loginClient = require('uw-db').loginClient;

var accountDao = null;
var mailBiz = null;
var chatBiz = null;
var rankDao = null;
var guildPersonalBiz = null;
var userDao = null;
var pkOutDao = null;
var commonUtils = null;
var userUtils = null;
var userDao = null;
var heroDao = null;
var heroBiz = null;
var propUtils = null;
var arenaRecordBiz = null;
var arenaRecordDao = null;
var pkOutUtils = null;
var incognitoDao = null;
var treasureDao = null;
var treasureBiz = null;


var checkRequire = function () {
    arenaRecordBiz = arenaRecordBiz||require("uw-arena-record").arenaRecordBiz;
    arenaRecordDao = arenaRecordDao||require("uw-arena-record").arenaRecordDao;
    pkOutUtils = pkOutUtils||require("./pkOutUtils");
    propUtils = propUtils || require("uw-utils").propUtils;
    userDao = userDao||require("uw-user").userDao;
    heroDao = heroDao||require("uw-hero").heroDao;
    heroBiz = heroBiz||require("uw-hero").heroBiz;
    userUtils = userUtils || require("uw-user").userUtils;
    commonUtils = commonUtils||require("uw-utils").commonUtils;
    pkOutDao = pkOutDao || require("./../dao/pkOutDao");
    userDao = userDao || require("uw-user").userDao;
    mailBiz = mailBiz || require("uw-mail").mailBiz;
    chatBiz = chatBiz || require("uw-chat").chatBiz;
    rankDao = rankDao || require("uw-rank").rankDao;
    accountDao = accountDao || require('uw-account').accountDao;
    guildPersonalBiz = guildPersonalBiz || require("uw-guild").guildPersonalBiz;
    incognitoDao = incognitoDao || require("./../dao/incognitoDao");
    treasureDao = treasureDao || require("uw-treasure").treasureDao;
    treasureBiz = treasureBiz || require("uw-treasure").treasureBiz;
};

var exports = module.exports;

var MAX_ENEMY = 3;//最多随即3个


/**
 * 开启，实际上插入新数据，条件判断在外面
 * @param client
 * @param userId
 * @param cb
 */
exports.open = function (client, userId, cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        },
        function (cb1) {
            pkOutDao.select(client, {userId: userId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0];
        var outPkData = data[1];
        if (outPkData) return cb(null, outPkData);
        var pkOutEntity = new PkOutEntity();
        pkOutEntity.userId = userId;
        //随即3个对手
        pkOutEntity.enemyIds = [];
        /*对手组*/
        pkOutEntity.freshTime = (new Date()).addDays(-1);
        /*上一次刷新对手时间*/
        pkOutEntity.pkValueTime = new Date();

        async.parallel([
            function (cb1) {
                userDao.update(client, {isOpenPk: 1}, {id: userId}, cb1);
            },
            function (cb1) {
                pkOutDao.insert(client, pkOutEntity, cb1);
            }
        ], function (err, data) {
            if (err) return cb(err);
            pkOutEntity.id = data[1].insertId;
            exports.calEnemy(client, userData, pkOutEntity, function (err, newOutPkData) {
                if (err) return cb(err);
                cb(null, newOutPkData);
            });
        });
    });
};

//获取对手列表
exports.getEnemyList = function (client, userId, cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        },
        function (cb1) {
            pkOutDao.select(client, {userId: userId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var mUserData = data[0];
        var mOutPkData = data[1];
        _calPkValue(mOutPkData);

        exports.calEnemy(client, mUserData, mOutPkData, function (err, newOutPkData) {
            if (err) return cb(err);
            pkOutDao.getPkOutUserList(client, newOutPkData.enemyIds, function (err, dataList) {
                if (err) return cb(err);
                _calEnemyDataList(client,mOutPkData, mUserData, dataList,function(err,enemyList){
                    if (err) return cb(err);
                    delete newOutPkData["pkValue"];
                    cb(null, [enemyList, newOutPkData]);
                });
            });

        });
    });

};


//获取未报仇仇人列表
exports.getRevengeEnemyList = function (client, userId, count, cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        },
        function (cb1) {
            pkOutDao.select(client, {userId: userId}, cb1);
        },
        function (cb1) {
            arenaRecordBiz.getRevengeUserIds(client, userId, count, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var mUserData = data[0];
        var mOutPkData = data[1];
        var userIds = data[2];
        _calPkValue(mOutPkData);
        pkOutDao.getPkOutUserList(client, userIds, function (err, dataList) {
            _calEnemyDataList(client, mOutPkData, mUserData, dataList,function(err,enemyList){
                if (err) return cb(err);
                cb(null, enemyList);
            });
        });
    });
};


//清除pk值
exports.clearPkValue = function (client, userId, cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.selectCols(client, "diamond,giveDiamond,buyDiamond", {id: userId}, cb1);
        },
        function (cb1) {
            pkOutDao.select(client, {userId: userId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0];
        var outPkData = data[1];
        _calPkValue(outPkData);
        var needDiamond = formula.calClearPkCost(outPkData.pkValue);
        if (userData.diamond < needDiamond) return cb(getMsg(c_msgCode.noDiamond));
        userUtils.reduceDiamond(userData, needDiamond);

        var updatepkOutData = {
            pkValue: 0,
            pkValueTime: outPkData.pkValueTime,
            freshTime: outPkData.freshTime
        };
        var updateUser = {
            diamond: userData.diamond,
            giveDiamond: userData.giveDiamond,
            buyDiamond: userData.buyDiamond
        };

        async.parallel([
            function (cb1) {
                userDao.update(client, updateUser, {id: userId}, cb1);
            },
            function (cb1) {
                pkOutDao.update(client, updatepkOutData, {id: outPkData.id}, cb1);
            }

        ], function (err, data) {
            if (err) return cb(err);
            cb(null, [updateUser, updatepkOutData, needDiamond]);
        });
    });
};

//计算对手
exports.calEnemy = function (client, userData, outPkData, cb) {
    checkRequire();
    var curNum = outPkData.enemyIds.length;
    //满了就不需要了
    if (curNum >= MAX_ENEMY) return cb(null, outPkData);
    var reData = _getCanFillEnemyNum(curNum, outPkData);
    var fillNum = reData[0];
    outPkData.freshTime = reData[1];

    _calEnemey(client, userData, outPkData, fillNum, function (err, data) {
        if (err) return cb(err);
        var updatePkOut = {
            enemyIds:outPkData.enemyIds,
            freshTime:outPkData.freshTime
        };
        //更新
        pkOutDao.update(client, updatePkOut, {id: outPkData.id}, function (err, data) {
            if (err) return cb(err);
            cb(null, outPkData);
        });
    });
};

//刷新对手
exports.refreshEnemy = function (client, userId, cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        },
        function (cb1) {
            pkOutDao.select(client, {userId: userId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0];
        var outPkData = data[1];
        if (outPkData.enemyIds.length >= 3) return cb(null, outPkData);
        pkOutUtils.calRefreshNum(outPkData);
        outPkData.todayRefreshNum++;
        var needDiamond = formula.calRefreshPKCost(outPkData.todayRefreshNum);
        if (userData.diamond < needDiamond) return cb(getMsg(c_msgCode.noDiamond));
        userUtils.reduceDiamond(userData, needDiamond);

        _calEnemey(client, userData, outPkData, 1, function (err, data) {
            if (err) return cb(err);
            outPkData.freshTime = new Date();
            var updatepkOutData = {
                enemyIds: outPkData.enemyIds,
                freshTime: outPkData.freshTime,
                todayRefreshNum: outPkData.todayRefreshNum,
                todayRefreshTime: outPkData.todayRefreshTime
            };
            var updateUser = {
                diamond: userData.diamond,
                giveDiamond: userData.giveDiamond,
                buyDiamond: userData.buyDiamond
            };
            async.parallel([
                function (cb1) {
                    userDao.update(client, updateUser, {id: userId}, cb1);
                },
                function (cb1) {
                    pkOutDao.update(client, updatepkOutData, {id: outPkData.id}, cb1);
                }
            ], function (err, data) {
                if (err) return cb(err);
                cb(null, [updateUser, updatepkOutData, needDiamond]);
            });
        });
    });
};

//战斗开始
exports.start = function (client, userId, enemyId, fightType, isRevenge, cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            pkOutDao.select(client, {userId: userId}, cb1);
        },
        function (cb1) {
            userDao.select(client, {id: enemyId}, cb1);
        },
        function (cb1) {
            if (fightType == c_prop.fightTypeKey.rankPk) {
                //rankDao.list(client, " rankType = ? ORDER BY rankValue DESC LIMIT ?", [c_prop.rankTypeKey.killRank, c_game.killChallengeCfg[0]], cb1);
                pkOutDao.getRankList(client, 3, cb1);
            } else {
                cb1(null);
            }
        },
        function (cb1) {
            if (isRevenge) {
                arenaRecordBiz.getRevengeUserIds(client, userId, 20, cb1);
            } else {
                cb1(null);
            }
        },
        function (cb1) {
            userDao.selectCols(client,"exData","id = ?",[userId], cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var outPkData = data[0], eUserData = data[1], rankList = data[2], userIds = data[3],mUserData = data[4];

        if (fightType == c_prop.fightTypeKey.pk) {
            if (isRevenge) {
                if (userIds.indexOf(enemyId) <= -1) return cb("无效的挑战对手");
            } else {
                if (outPkData.enemyIds.indexOf(enemyId) <= -1) return cb("无效的挑战对手");
                g_data.addPkOutCdArr(userId, enemyId);
                commonUtils.arrayRemoveObject(outPkData.enemyIds, enemyId);
                outPkData.freshTime = new Date();
            }
        } else if (fightType == c_prop.fightTypeKey.rankPk) {
            var winData = _getTodayRankWinData(mUserData);
            var eids = winData[1];
            if (eids.indexOf(enemyId)>-1) return cb("该对手今天已经成功挑战过1次");
            var isNullity = true;
            for (var i = 0; i < rankList.length; i++) {
                var locData = rankList[i];
                if (locData.userId == enemyId) {
                    isNullity = false;
                    break;
                }
            }
            if (isNullity) return cb("无效的挑战对手");
        }else{
            return cb("无效的挑战对手!");
        }
        var pkKey = ""+enemyId+fightType+isRevenge;
        g_data.setPkEnemyId(userId, pkKey);
        g_data.setPkStartTime(userId,new Date());
        var updateOutPkData = {
            enemyIds: outPkData.enemyIds,
            freshTime: outPkData.freshTime
        };

        async.parallel([
            function (cb1) {
                heroBiz.getPkList(client, eUserData, cb1);
            },
            function (cb1) {
                if (fightType == c_prop.fightTypeKey.pk) {
                    pkOutDao.update(client, updateOutPkData, {userId: userId}, cb1);
                } else {
                    cb1(null);
                }
            },
            function (cb1) {
                if (fightType == c_prop.fightTypeKey.pk && !isRevenge) {
                    guildPersonalBiz.otherAct(client, userId, 1, cb1);
                } else {
                    cb1(null, [{}, {}]);
                }
            }
        ], function (err, data) {
            if (err) return cb(err);
            var heroPkDataList = data[0];
            var actData = data[2];
            var guildData = actData[0];
            var guildPersonalData = actData[1];

            var heroList = heroPkDataList[0];
            var otherDataList = heroPkDataList[1];
            var fightData = heroPkDataList[2];
            cb(null, [updateOutPkData, heroList, otherDataList, fightData,guildData,guildPersonalData]);
        });
    });
};

//战斗结束
exports.end = function (client, userId, enemyId, isWin, fightData, fightType, isRevenge, cb) {
    checkRequire();
    async.parallel([
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        },
        function (cb1) {
            userDao.select(client, {id: enemyId}, cb1);
        },
        function (cb1) {
            pkOutDao.select(client, {userId: userId}, cb1);
        },
        function (cb1) {
            pkOutDao.select(client, {userId: enemyId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var mUserData = data[0], eUserData = data[1], mOutPkData = data[2], eOutPkData = data[3];
        var oldPkKey = g_data.getPkEnemyId(userId);
        var pkKey = ""+enemyId+fightType+isRevenge;
        if (oldPkKey != pkKey) return cb("无效的挑战对手");

        //校验一下战斗力
        isWin = fightUtils.checkIsWinByCombat(isWin,mUserData.lvl,mUserData.combat,eUserData.combat);

        g_data.setPkEnemyId(userId, -111);

        _calPkValue(mOutPkData);

        if (eUserData.robotId == 0) {
            _calPkValue(eOutPkData);
        }

        pkOutUtils.calRefreshNum(mOutPkData);

        //预防清零了
/*
        var pkStartTime = g_data.getPkStartTime(userId);
        if(!pkStartTime.equalsDay(new Date())){
            mOutPkData.killValue = 0;
        }
*/

        var mPkColor = pkOutUtils.calNameColor(mOutPkData.pkValue);
        var ePkColor = pkOutUtils.calNameColor(eOutPkData.pkValue);

        var oldKillValue = mOutPkData.killValue;
        var mOldPkColor = mPkColor;

        var getResult = calPkGetResult(mUserData, eUserData, mOutPkData, eOutPkData, isWin, fightType, isRevenge);
        var lootGold = getResult[0], lootItems = getResult[1], lootHonor = getResult[2], lootExpc = getResult[3], lootKillValue = getResult[4], lootPkValue = getResult[5];
        var lootId = 0;
        if(isWin && fightType == c_prop.fightTypeKey.pk) {
            lootId = g_incognito.getLootId(eUserData.id);
        }
        var newMail = {};
        //除了pk其他不走连胜
        if (fightType == c_prop.fightTypeKey.pk) {
            //不是仇杀
            if (!isRevenge) {
                if (isWin) {
                    mOutPkData.winCount++;
                    var accWinCount = mOutPkData.accWinCount||0;
                    mOutPkData.accWinCount=accWinCount+1;
                    if(mOutPkData.accWinCount >= 100){
                        newMail = {"10080":1};
                        mOutPkData.accWinCount-=100;
                    }
                    if(mOutPkData.accWinCount < 0) mOutPkData.accWinCount = 0;
                    if(mOutPkData.highWinCount<mOutPkData.winCount){
                        mOutPkData.highWinCount = mOutPkData.winCount;
                    }
                    //中断对方连胜
                    eOutPkData.winCount = 0;
                } else {
                    mOutPkData.winCount = 0;
                }
            }
            if(isWin){
                g_data.setBePkKill(enemyId,true);
            }
        }

        //金币
        userUtils.addGold(mUserData, lootGold);
        //物品
        var bagItems = {};
        var equipBagItems = {};
        var lootTreasureItem = g_incognito.getTreasureInfoById(lootId);
        if(lootTreasureItem) {
            //此消彼长
            /* userUtils.addBag(mUserData.bag,lootTreasureItem.treasureId,1);
             if(bagItems[lootTreasureItem.treasureId]){
             bagItems[lootTreasureItem.treasureId] += 1;
             }else {
             bagItems[lootTreasureItem.treasureId] = 1;
             }*/
            var valueBag = lootItems[lootTreasureItem.treasureId] || 0;
            lootItems[lootTreasureItem.treasureId] = valueBag +1;
            userUtils.delBag(eUserData.bag,lootTreasureItem.treasureId,1);
            lootTreasureItem.userId = mUserData.id;
            lootTreasureItem.openTime = new Date();
            lootTreasureItem.isOpen = 1;

            g_incognito.setTreasureInfoById(lootId, lootTreasureItem);
            //g_incognito.clearTreasureTimeOut(lootId);
            g_incognito.setTreasureOpenTimeOut(lootTreasureItem);
        }

        var itemsArr = userUtils.saveItems(mUserData, lootItems);
        if (Object.keys(itemsArr[0]).length > 0) bagItems = propUtils.mergerProp(bagItems, itemsArr[0]);
        if (Object.keys(itemsArr[1]).length > 0) equipBagItems = propUtils.mergerProp(equipBagItems, itemsArr[1]);


        //荣誉
        mUserData.honor += lootHonor;
        //经验
        userUtils.addUserExpc(mUserData, lootExpc);
        //赢才有杀戮值
        if (isWin) {
            //杀戮值
            mOutPkData.killValue += lootKillValue;
        }

        //pk值
        mOutPkData.pkValue += lootPkValue;
        if (mOutPkData.pkValue > mOutPkData.highPkValue) {
            mOutPkData.highPkValue = mOutPkData.pkValue;
        }

        //假如是排行榜的，记录前三名的记录
        if (fightType == c_prop.fightTypeKey.rankPk) {
            _setTodayRank(mUserData,eUserData.id);
        }

        var updateUser = {
            gold: mUserData.gold,
            honor: mUserData.honor,
            bag: mUserData.bag,
            equipBag: mUserData.equipBag,
            lvl: mUserData.lvl,
            expc: mUserData.expc,
            rebirthExp: mUserData.rebirthExp,
            exData:mUserData.exData,
            infuseExpc:mUserData.infuseExpc
        };
        var updateEUser = {
            bag: eUserData.bag
        };
        var updateOutPkData = {
            pkValue: mOutPkData.pkValue,
            pkValueTime: mOutPkData.pkValueTime,
            highPkValue: mOutPkData.highPkValue,
            killValue: mOutPkData.killValue,
            winCount: mOutPkData.winCount,
            highWinCount: mOutPkData.highWinCount,
            accWinCount: mOutPkData.accWinCount

        };

        async.parallel([
            function (cb1) {
                userDao.update(client, updateUser, {id: userId}, cb1);
            },
            function (cb1) {
                pkOutDao.update(client, updateOutPkData, {id: mOutPkData.id}, cb1);
            },
            function (cb1) {
                pkOutDao.getRank(client, oldKillValue, cb1);
            },
            function (cb1) {
                pkOutDao.getRank(client, mOutPkData.killValue, cb1);
            },
            function (cb1) {
                if (isRevenge) {
                    arenaRecordDao.update(client, {isRevenge: 1}, "userId = ? and enemyId = ? AND isRevenge = 0", [enemyId, userId], cb1);
                } else {
                    cb1();
                }
            },
            function (cb1) {
                pkOutDao.update(client, {winCount:eOutPkData.winCount}, {id: eOutPkData.id}, cb1);
            },
            function (cb1) {
                // 查openId以便用于qqBrower的推送
                if (mUserData.sdkChannelId != 100069 && mUserData.sdkChannelId != 100039)
                    return cb1();
                accountDao.listCols(loginClient, 'id, name', 'id in (?, ?)', [mUserData.accountId, eUserData.accountId], function(err, dataList) {
                    if (err) return cb1(err);
                    if (!dataList) return cb1(null);
                    var mOpenId, eOpenId;
                    for (var i = 0; i < dataList.length; i++) {
                        var data = dataList[i];
                        if (data.id == mUserData.accountId)
                            mOpenId = data.name;
                        else if (data.id == eUserData.accountId)
                            eOpenId = data.name;
                    }
                    cb1(null, [mOpenId, eOpenId]);
                });
            },
            function(cb1){
                if(Object.keys(newMail).length <= 0) return cb1(null);
                mailBiz.addByType(client, userId, c_prop.mailTypeKey.suraMedal, [], newMail, cb1);
            },
            function(cb1){
                if(lootTreasureItem) {
                    userDao.update(client, updateEUser, {id: eUserData.id}, cb1);
                }else {
                    cb1(null);
                }
            },
            function(cb1) {
                if(lootTreasureItem){
                    var upData = {
                        userId : lootTreasureItem.userId,
                        openTime : lootTreasureItem.openTime,
                        isOpen: lootTreasureItem.isOpen
                    }
                    treasureDao.update(client, upData,{id: lootTreasureItem.id}, cb1);
                }else {
                    cb1(null);
                }
            }
        ], function (err, data) {
            if (err) return cb(err);
            var oldRank = data[2], newRank = data[3];
            var mOpenId, eOpenId;
            if (data[6]) {
                mOpenId = data[6][0];
                eOpenId = data[6][1];
            }
            //获取新排名

            //计算收益
            var fightResult = new ds.FightResult();
            fightResult.winStatus = isWin ? consts.winStatus.win : consts.winStatus.lose;
            //显示用
            fightResult.gold = lootGold;//获得金币
            fightResult.items = lootItems;//得到的物品
            fightResult.honor = lootHonor;//得到的荣誉
            fightResult.expc = lootExpc;//得到的经验
            fightResult.killValue = lootKillValue;//得到的杀戮值
            fightResult.pkValue = lootPkValue;//得到的杀戮值
            fightResult.mPkColor = mPkColor;//己方颜色
            fightResult.ePkColor = ePkColor;//敌方颜色

            fightResult.attackMember = [mUserData.nickName, mUserData.combat, mUserData.iconId];
            fightResult.beAttackMember = [eUserData.nickName, eUserData.combat, mUserData.iconId];

            fightResult.curRank = newRank;//最终排名
            fightResult.changeRank = oldRank - newRank;//改变的排名

            delete updateUser.bag;
            delete updateUser.equipBag;
            fightResult.updateUser = updateUser;
            fightResult.updatePkOut = updateOutPkData;
            fightResult.bagItems = bagItems;
            fightResult.equipBagItems = equipBagItems;

            fightResult.isRevenge = isRevenge ? 1 : 0;

            cb(null, fightResult);


            if (fightType == c_prop.fightTypeKey.pk) {
                if(isWin){
                    //第一个%s：杀人玩家名
                    //第二个%s：被杀玩家名
                    chatBiz.addSysData(28, [mUserData.nickName, eUserData.nickName, ePkColor]);
                }

                if (mOpenId && eOpenId) {
                    var hgameBiz = require('uw-sdk').hgameBiz;
                    var msgData, templateId;
                    if (isWin) {
                        // '遭到'+mUserData.nickName+'的无耻偷袭,损失惨重';
                        templateId = 'tplt100423';
                        msgData = {
                            'nickname': mUserData.nickName,
                            'status': '损失惨重',
                            'action': '无耻偷袭'
                        };
                    } else {
                        // '轻松击败了'+mUserData.nickName+'的无耻偷袭';
                        templateId = 'tplt100333';
                        msgData = {
                            'nickname': mUserData.nickName,
                            'do': '击败',
                            'action': '无耻偷袭'
                        };
                    }
                    hgameBiz.sendQQBrowserPushMsg(templateId, mOpenId, eOpenId, msgData, function(){});
                }

                //for test
                /*
                if(isWin){
                    console.log('遭到'+mUserData.nickName+'的无耻偷袭,损失惨重');
                }else {
                    console.log();
                }
                */

                //各种消息
                var winCount = mOutPkData.winCount;

                chatBiz.addSysData(24, [mUserData.nickName, winCount]);
                chatBiz.addSysData(25, [mUserData.nickName, winCount]);
            }

            //items
            //推送系统消息(oldma)
            //第一个%s：玩家名
            //第二个%s：物品名
            for (var key in lootItems) {
                var locItemData = t_item[key];
                chatBiz.addSysData(26, [mUserData.nickName, eUserData.nickName,locItemData.name, locItemData.color]);
            }
            if(lootTreasureItem) {
                chatBiz.addSysData(75, [t_item[lootTreasureItem.treasureId].name,mUserData.nickName,lootTreasureItem.treasureId, eUserData.id]);
                treasureBiz.insertTreasureRecord(client, c_prop.treasureRecordTypeKey.pkTreasure, mUserData,lootTreasureItem.treasureId ,{},function(err, data){
                    if(err) console.log(err);});
                mailBiz.addByType(client, eUserData.id, c_prop.mailTypeKey.treasureMove, [t_item[lootTreasureItem.treasureId].name,mUserData.nickName], {}, function(){});
            }
            var mNewPkColor = pkOutUtils.calNameColor(mOutPkData.pkValue);
            chatBiz.addSysData(27, [mUserData.nickName, mOldPkColor, mNewPkColor]);

            if (fightType == c_prop.fightTypeKey.pk) {
                //以下信息不需要等待
                arenaRecordBiz.insertRecord(client, mUserData, eUserData, fightResult, c_prop.fightTypeKey.pk, function (err, data) {
                    g_area.pushMsgById(c_prop.receiverKey.pkDeal, {v: 1}, eUserData.id, function () {
                    });
                    g_data.setHasDealPk(eUserData.id, true);
                });
            } else if (fightType == c_prop.fightTypeKey.rankPk) {
                arenaRecordBiz.insertRecord(client, mUserData, eUserData, fightResult, c_prop.fightTypeKey.rankPk, function (err, data) {
                    //todo
                    //g_area.pushMsgById(c_prop.receiverKey.pkDeal,{v:1},eUserData.id,function(){});
                    g_data.setHasRankDealPk(eUserData.id, true);
                });
            }
        });

    });
};

//获取排名
exports.getRankList = function (client, cb) {
    checkRequire();
    pkOutDao.getRankList(client, 50, function (err, dataList) {
        if (err) return cb(err);
        var rankList = [];
        var userIds = [];
        for (var i = 0; i < dataList.length; i++) {
            var locRankData = dataList[i];
            var locRank = new ds.Rank();
            locRank.rank = i + 1;//领主排名
            locRank.name = locRankData.nickName;//领主名字
            locRank.iconId = locRankData.iconId;//领主头像id
            locRank.lvl = locRankData.lvl;//领主等级
            locRank.combat = locRankData.combat;//战斗力
            locRank.killValue = locRankData.killValue;//杀戮值
            locRank.vip = locRankData.vip;//杀戮值
            locRank.userId = locRankData.userId;//用户id
            locRank.pkValue = locRankData.pkValue;//红名点
            rankList.push(locRank);
            userIds.push(locRank.userId);
        }
        guildPersonalBiz.getGuildNameByUserIds(client,userIds,function(err,guildNameData){
            if(err) return cb(err);
            for (var i = 0; i < rankList.length; i++) {
                var locData = rankList[i];
                locData.guildName = guildNameData[locData.userId];
            }
            cb(null,rankList);
        });
    });
};

//获取我的排名
exports.getMyRank = function (client, userId, cb) {
    checkRequire();
    pkOutDao.select(client, {userId: userId}, function (err, pkOutData) {
        if (err) return cb(err);
        pkOutDao.getRank(client, pkOutData.killValue, function (err, rank) {
            if (err) return cb(err);
            cb(null, rank);
        });
    });
};

//处理记录
exports.dealRecord = function (client, userId, fightType, cb) {
    checkRequire();
    //todo 防和刷新冲突
    //前后2分钟不处理
    if(_checkTimeRange(new Date(),2)) return cb(null,[{},{},0,0]);
    async.parallel([
        function (cb1) {
            userDao.select(client, {id: userId}, cb1);
        },
        function (cb1) {
            pkOutDao.select(client, {userId: userId}, cb1);
        }
    ], function (err, data) {
        if (err) return cb(err);
        var userData = data[0];
        var pkOutData = data[1];
        _calPkValue(pkOutData);
        arenaRecordBiz.dealRecord(client, pkOutData, userData, fightType, function (err, dealPkRecordData) {
            if (err) return cb(err);
            var updateUser = {
                gold: userData.gold,
                equipBag: userData.equipBag,
                bag: userData.bag
            };
            var updatePkOut = {
                killValue: pkOutData.killValue,
                pkValue: pkOutData.pkValue,
                pkValueTime: pkOutData.pkValueTime
            };
            async.parallel([
                function (cb1) {
                    userDao.update(client, updateUser, {id: userId}, cb1);
                },
                function (cb1) {
                    pkOutDao.update(client, updatePkOut, {id: pkOutData.id}, cb1);
                }
            ], function (err, data) {
                if (err) return cb(err);
                cb(null, [updateUser, updatePkOut, dealPkRecordData[2], dealPkRecordData[3]]);
            });
        });

    });
};

/**
 * 发送奖励
 * @param client
 * @param cb
 */
exports.sendPkOutAward = function (client, cb) {
    checkRequire();
    pkOutDao.getBakRankList(client, function (err, pkDataList) {
        if (err) return cb(err);
        //先获取数据才清零

        var max = 1000;//分1000一批插入
        var groupList = [];
        var tempCount = 0;
        var tempList = [];
        var rank = 0;
        for (var i = 0; i < pkDataList.length; i++) {
            var locData = pkDataList[i];
            //机器人这个值为空
            rank++;
            var items = {};
            //[升星石数量，金币数量,元宝]
            var locRewardData = _getRankAward(rank);
            var awardStarStone = locRewardData[0] || 0;
            if (awardStarStone) items[c_prop.spItemIdKey.starStone] = awardStarStone;
            var awardGold = locRewardData[1] || 0;
            if (awardGold) items[c_prop.spItemIdKey.gold] = awardGold;
            var awardDiamond = locRewardData[2] || 0;
            if (awardDiamond) items[c_prop.spItemIdKey.diamond] = awardDiamond;
            var awardItems = locRewardData[3] || {};
            if(awardItems && Object.keys(awardItems).length > 0){
                items = propUtils.mergerProp(items,awardItems);
            }

            if (!items) continue;
            var mailEntity = mailBiz.createEntityByType(locData.userId, c_prop.mailTypeKey.pkKill, [rank], items);
            mailEntity.addTime = new Date();
            tempList.push(mailEntity);
            if (tempCount >= max) {
                tempCount = 0;
                groupList.push(tempList.concat([]));
                tempList.length = 0;
            }
            tempCount++;
        }
        if (tempList.length > 0) {
            groupList.push(tempList.concat([]));
        }

        async.mapLimit(groupList, 1, function (group, cb1) {
            mailBiz.addMailByList(client, group, cb1);
        }, cb);
    });
};

exports.exCalEnemey = function(client, userData, outPkData, num, cb) {
    checkRequire();
    _calEnemey(client, userData, outPkData, num, cb);
};


//隐姓埋名
exports.incognito =function(client, userId, cb){
    checkRequire();
    async.parallel([
        function(cb1){
            userDao.select(client, {id:userId},cb1);
        },
        function(cb1){
            incognitoDao.select(client, {userId:userId}, cb1);
        }
    ],function(err, data){
        if(err) return cb(err);
        var userData = data[0];
        var incognitoData = data[1];
        var isInsert =false;
        var now = new Date();

        if(!incognitoData){
            isInsert = true;
            incognitoData = new IncognitoEntity();
            incognitoData.userId = userId;
            incognitoData.openTime = new Date(0);
        }
        var cd = c_game.treasure[1];
        if(incognitoData.openTime.clone().addSeconds(cd).isAfter(now)){
            return cb("有效时间内，不可重复点击");
        }
        var count = userUtils.getTodayCount(userData, c_prop.userRefreshCountKey.incognito);
        var costDiamond = formula.calIncognito(count);        //刷新消耗
        if(userData.diamond < costDiamond){
            return cb(getMsg(c_msgCode.noDiamond));
        }
        userUtils.reduceDiamond(userData, costDiamond);
        userUtils.addTodayCount(userData, c_prop.userRefreshCountKey.incognito,1);
        incognitoData.openTime = now;
        g_incognito.setOpenTime(userId, now);
        var updateUser = {
            diamond: userData.diamond,
            giveDiamond: userData.giveDiamond,
            buyDiamond: userData.buyDiamond,
            counts:userData.counts,
            countsRefreshTime:userData.countsRefreshTime
        };

        async.parallel([
            function(cb1){
                userDao.update(client, updateUser,{id:userId}, cb1)
            },
            function(cb1){
                if(isInsert){
                    incognitoDao.insert(client,incognitoData, cb1);
                }else{
                    var updateIncognito = {
                        openTime: incognitoData.openTime
                    };
                    incognitoDao.update(client,updateIncognito,{id:incognitoData.id}, cb1);
                }
            }
        ],function(err, data){
            if(err) return cb(err);
            return cb(null, [updateUser,incognitoData.openTime,costDiamond]);
        })
    })
}

/****************************************************************************************************************************/

//判断时间区间
var _checkTimeRange = function(mDate,minutes){
    var nowDate = new Date();
    var time00 = nowDate.clone().clearTime();
    if(mDate.isAfter(time00.clone()) && mDate.isBefore(time00.clone().addMinutes(minutes))){
        return true;
    }
    var time24 = nowDate.clone().clearTime().addHours(24);
    if(mDate.isAfter(time24.clone().addMinutes(-minutes)) && mDate.clone().isBefore(time24)){
        return true;
    }
    if(mDate.equals(time00)){
        return true;
    }
    return false;
};

/**
 * 获取排名奖励
 * @param rank
 * @returns [升星石数量，金币数量,元宝,物品]
 */
var _getRankAward = function (rank) {
    var starStone = 0;
    var gold = 0;
    var diamond = 0;
    var items = {};
    var curData = null;
    if (rank <= 0) return [0, 0, 0,items];
    for (var i = 1; i < 100; i++) {
        var locData = c_pvpRankReward[i];
        if (!locData) break;
        curData = locData;
        if (rank <= locData.range) break;
    }
    if (curData) {
        starStone = curData.starStone;
        gold = curData.gold;
        diamond = curData.diamond;
        if(curData.items){
            for (var i = 0; i < curData.items.length; i++){
                items[curData.items[i][0]] = curData.items[i][1];
            }
        }
    }
    return [starStone, gold, diamond,items];
};

//计算获得
var calPkGetResult = function (mUserData, eUserData, mOutPkData, eOutPkData, isWin, fightType, isRevenge) {
    var lootGold = 0, lootItems = {}, lootHonor = 0, lootExpc = 0, lootKillValue = 0, lootPkValue = 0;
    var mPkColor = pkOutUtils.calNameColor(mOutPkData.pkValue);
    var ePkColor = pkOutUtils.calNameColor(eOutPkData.pkValue);

    //输赢都需要计算的
    //计算金币
    lootGold = _calLootGold(mOutPkData, eUserData, mPkColor, ePkColor);

    //计算物品
    lootItems = _calLootItems(isWin, mUserData, eUserData, mPkColor, ePkColor, fightType, mOutPkData, eOutPkData);

    //计算荣誉
    lootHonor = _calLootHonor(isWin, mOutPkData.highPkValue);

    //计算经验
    lootExpc = _calLootExpc(mOutPkData, mUserData, eUserData, mPkColor, ePkColor);

    //杀戮值
    lootKillValue = _calLootKillValue(isWin, mOutPkData, eOutPkData, fightType);

    //pk值
    lootPkValue = pkOutUtils.calLootPkValue(ePkColor);

    //失败不得到金币,装备,pk值
    if (!isWin) {
        lootItems = {};
        lootGold = 0;
        lootPkValue = 0;
        lootExpc = 0;
    }

    if (fightType == c_prop.fightTypeKey.pk) {
        if (isRevenge) {
            //	击杀仇人不会产生杀戮积分（奖杯），每次复仇无论输赢，都会获得金币奖励【game表 61 参数1】
            lootKillValue = 0;
            lootGold += c_game.revengeGolds[0];
            //仇人不会红名
            lootPkValue = 0;
        }
    }

    return [lootGold, lootItems, lootHonor, lootExpc, lootKillValue, lootPkValue];
};

var _calLootKillValue = function (isWin, mOutPkData, eOutPkData, fightType) {

    /**
     * 获得杀戮值计算
     * @param a 攻方杀戮值
     * @param b 防御方杀戮值
     */

    //杀戮值
    var lootKillValue = formula.calKillValue(mOutPkData.killValue, eOutPkData.killValue);
    lootKillValue = parseInt(lootKillValue);
    lootKillValue = Math.abs(lootKillValue);

    if (fightType == c_prop.fightTypeKey.rankPk) {
        lootKillValue = 0;
    }

    return lootKillValue;
};


var _calPkValue = function (pkOutData) {
    var self = this;
    var pkValue = pkOutData.pkValue;
    var pkValueTime = pkOutData.pkValueTime;
    pkValueTime = new Date(pkValueTime);

    pkValueTime = new Date(pkValueTime);
    var diffMinutes = pkValueTime.getMinutesBetween(new Date());
    var intDiffMinutes = parseInt(diffMinutes / 20);
    if (intDiffMinutes > 0) {
        pkValue -= c_game.pkOutCfg[0] * intDiffMinutes;
        pkValueTime.addMinutes(intDiffMinutes * 20);
    }

    pkValue = pkValue < 0 ? 0 : pkValue;
    pkOutData.pkValue = pkValue;
    pkOutData.pkValueTime = pkValueTime;
};

var _calEnemey = function (client, userData, outPkData, num, cb) {
    if (num <= 0) return cb(null, []);

    //计算概率
    //判断机器人还是玩家
    var robotRate = c_lvl[userData.lvl].robotRate;
    //robotRate
    var robotNum = 0;
    var userNum = 0;

    for (var i = 0; i < num; i++) {
        var random = Math.random() * 10000;
        if (random <= robotRate) {
            robotNum++;
        } else {
            userNum++;
        }
    }
    //获取数据
    var ignoreIds = [userData.id];
    //enemyTypes
    for (var i = 0; i < outPkData.enemyIds.length; i++) {
        var locId = outPkData.enemyIds[i];
        ignoreIds.push(locId);
    }

    //过滤cd中的
    var cdIds = _getPkCdIds(userData.id);
    ignoreIds = ignoreIds.concat(cdIds);
    //过滤隐形埋名的
    var incognitoIds = g_incognito.getIncognitoIds();
    ignoreIds = ignoreIds.concat(incognitoIds);

    var reList = [];
    //机器人
    _getOneRandomRobots(client, userData, ignoreIds, robotNum, function (err, robotList) {
        if (err) return cb(err);
        reList = reList.concat(robotList);
        //玩家
        _getOneRandomUsers(client, userData, outPkData, ignoreIds, userNum, function (err, userList) {
            if (err) return cb(err);
            reList = reList.concat(userList);
            for (var i = 0; i < reList.length; i++) {
                var locId = reList[i];
                outPkData.enemyIds.push(locId);
            }
            cb(null, reList);
        });
    });
};

var _getPkCdIds = function (userId) {
    var pkOutCdArr = g_data.getPkOutCdArr(userId);
    var cd = c_game.pkOutCfg[2] || 0;
    var reList = [];
    for (var i = 0; i < pkOutCdArr.length; i++) {
        var locData = pkOutCdArr[i];
        var locDate = locData[1];
        if (locDate.getSecondsBetween(new Date()) >= cd) {
            pkOutCdArr.splice(i, 1);
            i--;
        }
    }

    for (var i = 0; i < pkOutCdArr.length; i++) {
        var locData = pkOutCdArr[i];
        var locId = locData[0];
        reList.push(locId);
    }

    g_data.setPkOutCdArr(userId, pkOutCdArr);

    return reList;
};

var _getOneRandomRobot = function (userData, ignoreIds) {
    var minPKLvl = c_lvl[userData.lvl].minPKLvl;
    var maxPKLvl = c_lvl[userData.lvl].maxPKLvl;
    var curLvl = 0 | (Math.random() * (maxPKLvl - minPKLvl + 1)) + minPKLvl;
    var lvlList = g_robot.getListByLvl(curLvl);
    var reRobot = null;
    for (var i = 0; i < lvlList.length; i++) {
        var locRobot = lvlList[i];
        if (ignoreIds.indexOf(locRobot.uid) > -1) continue;
        reRobot = locRobot;
        break;
    }
    return locRobot;
};

var _getOneRandomUsers = function (client, userData, outPkData, ignoreIds, num, cb) {
    if (num <= 0) return cb(null, []);
    var reList = [];
    //匹配等级
    _getRandomUsersByLvl(client, userData, outPkData, ignoreIds, num, function (err, dataList) {
        if (err) return cb(err);
        reList = reList.concat(dataList);
        if (reList.length >= num) return cb(null, reList);

        //如果区间内没有，则取战力匹配
        _getRandomUsersByCombat(client, userData, outPkData, ignoreIds, num - reList.length, function (err, dataList) {
            if (err) return cb(err);
            reList = reList.concat(dataList);
            if (reList.length >= num) return cb(null, reList);

            //如果区间内没有，则取杀戮匹配
            _getRandomUsersByKillValue(client, userData, outPkData, ignoreIds, num - reList.length, function (err, dataList) {
                if (err) return cb(err);
                reList = reList.concat(dataList);
                if (reList.length >= num) return cb(null, reList);

                //如果区间内没有，则取等级最靠近的
                userDao.listCols(client, "id,combat,lvl", " isOpenPk =1 and  lvl<=? and id not in (?) order by lvl desc  limit 0,?", [userData.lvl, ignoreIds, num - reList.length], function (err, dataList) {
                    if (err) return cb(err);
                    for (var i = 0; i < dataList.length; i++) {
                        var locData = dataList[i];
                        reList.push(locData.id);
                        ignoreIds.push(locData.id);
                    }
                    cb(null, reList);
                });
            });
        });
    });
};

var _getRandomUsersByLvl = function (client, userData, outPkData, ignoreIds, num, cb) {
    var minPKLvl = c_lvl[userData.lvl].minPKLvl;
    var maxPKLvl = c_lvl[userData.lvl].maxPKLvl;
    var reList = [];
    userDao.listCols(client, "id,combat,lvl", " isOpenPk =1 and lvl >= ? and lvl<=? and id not in (?) order by rand() limit 0,?", [minPKLvl, maxPKLvl, ignoreIds, num], function (err, dataList) {
        if (err) return cb(err);
        for (var i = 0; i < dataList.length; i++) {
            var locData = dataList[i];
            reList.push(locData.id);
            ignoreIds.push(locData.id);
        }
        cb(null, reList);
    });
};

var _getRandomUsersByCombat = function (client, userData, outPkData, ignoreIds, num, cb) {
    var maxCombat = formula.calPkCombatCfg(userData.lvl, userData.combat, c_game.pkCombatRange[0]);
    var minCombat = formula.calPkCombatCfg(userData.lvl, userData.combat, c_game.pkCombatRange[1]);
    var reList = [];
    userDao.listCols(client, "id,combat,lvl", " isOpenPk =1 and combat >= ? and combat<=? and id not in (?) order by rand() limit 0,?", [minCombat, maxCombat, ignoreIds, num], function (err, dataList) {
        if (err) return cb(err);
        for (var i = 0; i < dataList.length; i++) {
            var locData = dataList[i];
            reList.push(locData.id);
            ignoreIds.push(locData.id);
        }
        cb(null, reList);
    });
};

var _getRandomUsersByKillValue = function (client, userData, outPkData, ignoreIds, num, cb) {
    var maxKillValue = formula.calPkKillCfg(outPkData.killValue, c_game.pkValueRange[0]);
    var minKillValue = formula.calPkKillCfg(outPkData.killValue, c_game.pkValueRange[1]);
    var reList = [];
    pkOutDao.listCols(client, "id,userId,killValue", "  killValue >= ? and killValue<=? and userId not in (?) order by rand() limit 0,?", [minKillValue, maxKillValue, ignoreIds, num], function (err, dataList) {
        if (err) return cb(err);
        for (var i = 0; i < dataList.length; i++) {
            var locData = dataList[i];
            reList.push(locData.userId);
            ignoreIds.push(locData.userId);
        }
        cb(null, reList);
    });
};


var _getOneRandomRobots = function (client, userData, ignoreIds, num, cb) {
    if (num <= 0) return cb(null, []);
    var minPKLvl = c_lvl[userData.lvl].minPKLvl;
    var maxPKLvl = c_lvl[userData.lvl].maxPKLvl;
    var reList = [];
    userDao.listCols(client, "id,combat,lvl", " accountId =0 and lvl >= ? and lvl<=? and id not in (?) order by rand() limit 0,?", [minPKLvl, maxPKLvl, ignoreIds, num], function (err, dataList) {
        if (err) return cb(err);

        for (var i = 0; i < dataList.length; i++) {
            var locData = dataList[i];
            ignoreIds.push(locData.id);
            reList.push(locData.id);
        }

        if (reList.length >= num) return cb(null, reList);


        //如果区间内没有，则取最靠近的
        userDao.listCols(client, "id,combat,lvl", " accountId =0 and  lvl<=? and id not in (?) order by lvl desc  limit 0,?", [userData.lvl, ignoreIds, num - reList.length], function (err, dataList1) {
            if (err) return cb(err);
            for (var i = 0; i < dataList.length; i++) {
                var locData = dataList[i];
                ignoreIds.push(locData.id);
                reList.push(locData.id);
            }
            cb(null, reList);
        });
    });
};


//获取可以填补的位置
var _getCanFillEnemyNum = function (curNum, outPkData) {
    var freshTime = outPkData.freshTime;
    if (!freshTime) freshTime = new Date();

    var canNum = 0;//填充的
    var exNum = 0;//额外填充的
    var isEx = 0;
    var canMax = MAX_ENEMY - curNum;
    //满了就不需要了
    if (canMax <= 0) {
        return [0, freshTime];
    }

    //时间填补空缺
    var cd1 = c_game.pkOutCfg[3];
    var cd2 = c_game.pkOutCfg[4];
    //todo 临时3秒，服务端和客户端时间很奇怪
    var nowDate = (new Date()).addSeconds(3);
    //获取可以填充的
    var seconds = freshTime.getSecondsBetween(nowDate);

    canNum = parseInt(seconds / cd2);
    //如果多出来
    if (canNum > canMax) {
        canNum = canMax;
        isEx = 1;
    }
    if (canNum > 0) {
        freshTime = (new Date()).addSeconds(-(seconds % cd2));
    }

    //计算可以加多少个

    //
    return [canNum, freshTime];
};

//掉落金币
var _calLootGold = function (myOutPkData, eUserData, mPkColor, ePkColor) {
    /**
     * PK获得的金币
     * @param a pk值
     * @param b 对方玩家等级
     * @param x 己方红黄名参数
     * @param y 敌方红黄名参数
     */
    var mGoldMult = pkOutUtils.calLootGoldMult(mPkColor);
    var eGoldMult = pkOutUtils.calLootGoldMult(ePkColor);
    var lootGold = formula.calPkOutGold(myOutPkData.pkValue, eUserData.lvl, mGoldMult, eGoldMult);
    lootGold = parseInt(lootGold);
    lootGold = Math.abs(lootGold);
    if (eUserData.robotId == 0 && ePkColor == c_prop.pkNameColorKey.red) {
        if (lootGold > eUserData.gold) lootGold = eUserData.gold;
    }

    return lootGold;
};

//荣誉计算
var _calLootHonor = function (isWin, highPkValue) {
    /**
     * PK获得荣誉
     * @param a 胜负参数
     * @param x 历史pk值
     */
    //calPkOutHonor
    var honorMult = pkOutUtils.calLootHonorMult(isWin);
    var lootHonor = formula.calPkOutHonor(honorMult, highPkValue);
    lootHonor = parseInt(lootHonor);
    lootHonor = Math.abs(lootHonor);
    return lootHonor;
};

//掉落经验
var _calLootExpc = function (myOutPkData, mUserData, eUserData, mPkColor, ePkColor) {
    //如果次数达到某个数字，则不得经验
    var limitNum = c_game.pkCfg1[0] || 0;
    if (myOutPkData.todayRefreshNum >= limitNum) return 0;
    /**
     * pk获得的经验
     * @param a pk值
     * @param b 对方玩家等级
     * @param c pk差异值(升级表)
     * @param x 己方红黄名参数
     * @param y 敌方红黄名参数
     */
    var mExpcMult = pkOutUtils.calLootExpcMult(mPkColor);
    var eExpcMult = pkOutUtils.calLootExpcMult(ePkColor);
    var pkExpcMult = c_lvl[mUserData.lvl].pkExpcMult;
    var lootExpc = formula.calPkOutExpc(myOutPkData.pkValue, eUserData.lvl, pkExpcMult, mExpcMult, eExpcMult);
    lootExpc = Math.abs(lootExpc);
    lootExpc = parseInt(lootExpc);
    return lootExpc;
};

var _calLootItems = function (isWin, mUserData, eUserData, mPkColor, ePkColor, fightType, mOutPkData, eOutPkData) {
    var lootItems = {};
    if (!isWin) return lootItems;
    //掠夺令牌
    var isLootBoss = _isLootBoss(eUserData,ePkColor,mPkColor, mOutPkData, eOutPkData,fightType);

    //计算拥有的可以掉落的物品
    if (ePkColor == c_prop.pkNameColorKey.yellow) {
        //pkOutYellowLoot
        lootItems = _calRandomLootItems(eUserData, c_game.pkOutYellowLoot,[]);
    } else if (ePkColor == c_prop.pkNameColorKey.red) {
        //pkOutRedLoot
        //BOSS替代令被爆出来，将不再随机获得橙色物品。
        var ignoreItemColors = [];
        if(isLootBoss) ignoreItemColors.push(c_prop.equipColorKey.orange);
        lootItems = _calRandomLootItems(eUserData, c_game.pkOutRedLoot,ignoreItemColors);
    }

    //额外系统boss令牌
    //PK每次战胜对手，都有几率获得系统奖励的BOSS替代令。根据对手的红黄白名，几率分别读取【c_game(游戏配置)】【60】参数1-3    己方加成  参数6-8    概率等于两个相加。
    var isLootExBoss = _isLootExBoss(mPkColor,ePkColor,fightType);



    //掉落1个
    var bossNum = lootItems[c_prop.spItemIdKey.bossTesseraReplace]||0;

    //额外另外
    if (isLootBoss) {
        bossNum++;
        chatBiz.addSysData(30, [mUserData.nickName, eUserData.nickName, ePkColor]);
    }
    if (isLootExBoss) {
        bossNum++;
        chatBiz.addSysData(31, [mUserData.nickName,eUserData.nickName]);
    }

    if(bossNum>0){
        lootItems[c_prop.spItemIdKey.bossTesseraReplace] = bossNum;
    }

    //宝箱掉落
    var isLootBox = _isLootBox(fightType);

    if(isLootBox){
        var pkLootCfg = c_game.pkLoot[0];
        pkLootCfg = pkLootCfg.split(",");
        var exLootItemId = parseInt(pkLootCfg[0]);
        var exLootItemNum = parseInt(pkLootCfg[1]);
        var locNum = lootItems[exLootItemId]||0;
        lootItems[exLootItemId]  = locNum+exLootItemNum;
    }

    return lootItems;
};

var _isLootBox = function(fightType){
    if(fightType==c_prop.fightTypeKey.rankPk){
        return false;
    }
    //额外宝箱掉落
    var pkLootCfg = c_game.pkLoot[0];
    pkLootCfg = pkLootCfg.split(",");
    var exLootItemId = parseInt(pkLootCfg[0]);
    var exLootItemRate = parseInt(pkLootCfg[2]);

    if(Math.random()*10000<=exLootItemRate){
        if(g_lootConfig.isLoot(exLootItemId)){
           return true;
        }
    }
    return false;
}

var _isLootBoss = function(eUserData,ePkColor,mPkColor, mOutPkData, eOutPkData,fightType){
    //PK战胜红名，几率掠夺对方背包内的BOSS替代令，此物品走单独几率，并优先于其他物品先随机，当此物品被爆出来，将不再随机获得橙色物品。几率读取【c_game(游戏配置)】【60】参数4  己方加成：参数5    概率等于两个相加
    var bossRate = 0;
    var bossNum = eUserData.bag[c_prop.spItemIdKey.bossTesseraReplace]||0;
    if(bossNum<=0) return 0;
    if (ePkColor == c_prop.pkNameColorKey.red) {
        bossRate = formula.calBossRate(mOutPkData.pkValue);
    }
    if(fightType==c_prop.fightTypeKey.rankPk){
        bossRate = 0;
    }
    if (Math.random() * 10000 <= bossRate) {
        return true;
    }
    return false;
};

var _isLootExBoss = function(mPkColor,ePkColor,fightType){
    //bossLootRate
    /*
     参数1：挑战白名玩家掉落概率（万分比）
     参数2：挑战黄名玩家掉落概率（万分比）
     参数3：挑战红名玩家掉落概率（万分比）
     参数4：红名玩家被掠夺几率（万分比）
     参数5：已方红名玩家掠夺加强（万分比）
     参数7：已方白名玩家掉落概率加成（万分比）
     参数8：已方黄名玩家掉落概率加成（万分比）
     参数9：己方红名玩家掉落概率加成（万分比）
     */
    var exBossRate = 0;
    if (ePkColor == c_prop.pkNameColorKey.white) {
        exBossRate+=c_game.bossLootRate[0];
    }else  if (ePkColor == c_prop.pkNameColorKey.yellow) {
        exBossRate+=c_game.bossLootRate[1];
    } else if (ePkColor == c_prop.pkNameColorKey.red) {
        exBossRate+=c_game.bossLootRate[2];
    }

    if (mPkColor == c_prop.pkNameColorKey.white) {
        exBossRate+=c_game.bossLootRate[5];
    }else  if (mPkColor == c_prop.pkNameColorKey.yellow) {
        exBossRate+=c_game.bossLootRate[6];
    } else if (mPkColor == c_prop.pkNameColorKey.red) {
        exBossRate+=c_game.bossLootRate[7];
    }

    if(fightType==c_prop.fightTypeKey.rankPk){
        exBossRate = 0;
    }

    if (Math.random() * 10000 <= exBossRate) {
        return true;
    }
    return false;
};

var _calCanLootItems = function (eUserData) {
    var canLootColorItems = {};
    //假如是机器人
    if (eUserData.robotId > 0) {
        var t_robotData = t_robot[eUserData.robotId];
        for (var i = 0; i < t_robotData.equipBag.length; i++) {
            var locTempId = t_robotData.equipBag[i];
            var locItemData = t_item[locTempId];
            if (!locItemData) continue;
            var locColorItems = canLootColorItems[locItemData.color] || [];
            locColorItems.push([locTempId, 1]);
            canLootColorItems[locItemData.color] = locColorItems;
        }
        return canLootColorItems;
    }
    for (var key in eUserData.equipBag) {
        var locData = eUserData.equipBag[key] || [];
        var locTempId = locData[0];
        var locIsUp = locData[3];
        if (locIsUp) continue;
        if (!locTempId) continue;
        var locItemData = t_item[locTempId];
        if (!locItemData) continue;
        if (locItemData.isLoot) {
            var locColorItems = canLootColorItems[locItemData.color] || [];
            locColorItems.push([locTempId, 1]);
            canLootColorItems[locItemData.color] = locColorItems;
        }
    }
    for (var key in eUserData.bag) {
        var locTempId = key;
        var locNum = eUserData.bag[key] || 0;
        var locItemData = t_item[locTempId];
        if (!locItemData) continue;
        if (locItemData.isLoot) {
            var locColorItems = canLootColorItems[locItemData.color] || [];
            locColorItems.push([locTempId, locNum]);
            canLootColorItems[locItemData.color] = locColorItems;
        }
    }
    return canLootColorItems;
};

var _getOneTypeItem = function (canLootColorItems, color, num) {
    var colorItems = canLootColorItems[color] || [];
    var itemData = commonUtils.getRandomOne(colorItems);
    if (!itemData) return [null, null];
    var itemId = itemData[0] || 0, itemNum = itemData[1] || 0;

    if (num > itemNum) num = itemNum;
    return [itemId, num];
};

var _calRandomLootItems = function (eUserData, colorRandomArr,ignoreItemColors) {
    ignoreItemColors = ignoreItemColors||[];
    var lootItems = {};
    var canLootItems = _calCanLootItems(eUserData);
    //pkOutLootLimit 掉落限制
    var limitCount = c_game.pkOutLootLimit[0];
    var tempCount = 0;
    //白,绿,蓝,紫,橙,红
    var minNumData = c_game.pkOutLootLimit[1];
    var maxNumData = c_game.pkOutLootLimit[2];
    minNumData = minNumData.split(",");
    maxNumData = maxNumData.split(",");

    /*1,白色
     2,绿色
     3,蓝色
     4,紫色
     5,橙色
     6,红色*/
    for (var i = 1; i <= 6; i++) {
        var locColor = i;
        if(ignoreItemColors.indexOf(locColor)>-1) continue;
        var locRandom = colorRandomArr[i - 1];
        if (Math.random() * 10000 > locRandom) continue;
        var locMinNum = parseInt(minNumData[i-1])  || 0;
        var locMaxNum = parseInt(maxNumData[i-1]) || 0;
        var locAddNum = commonUtils.getRandomNum(locMinNum, locMaxNum);

        var locTypeItem = _getOneTypeItem(canLootItems, locColor, locAddNum);
        var locItemId = locTypeItem[0], locAddNum = locTypeItem[1];

        if (locItemId&&locAddNum) {
            var locNum = lootItems[locItemId] || 0;
            lootItems[locItemId] = locNum + locAddNum;
            tempCount += locAddNum;
        }

        if (tempCount >= limitCount) break;
    }

    return lootItems;
};


var _calEnemyDataList = function (client,mOutPkData, mUserData, dataList,cb) {
    var reList = [];
    var userIds = [];
    for (var i = 0; i < dataList.length; i++) {
        var locData = dataList[i];
        _calPkValue(locData);
        var locPkOutUserData = new ds.PkOutUserData();
        locPkOutUserData.userId = locData.userId;
        locPkOutUserData.name = locData.nickName;//名字
        locPkOutUserData.iconId = locData.iconId;//头像
        locPkOutUserData.lvl = locData.lvl;//头像
        locPkOutUserData.killValue = locData.killValue;//杀戮值
        locPkOutUserData.pkValue = locData.pkValue;//杀戮值
        locPkOutUserData.vip = locData.vip;//vip
        locPkOutUserData.combat = locData.combat;//战斗力

        var mPkColor = pkOutUtils.calNameColor(mOutPkData.pkValue);
        var ePkColor = pkOutUtils.calNameColor(locData.pkValue);
        locPkOutUserData.gold = _calLootGold(mOutPkData, locData, mPkColor, ePkColor);//金币
        locPkOutUserData.expc = _calLootExpc(mOutPkData, mUserData, locData, mPkColor, ePkColor);//可掠夺经验
        locPkOutUserData.isTreasure = g_incognito.getLootId(locData.userId);

        reList.push(locPkOutUserData);
        userIds.push(locData.userId);
    }

    guildPersonalBiz.getGuildNameByUserIds(client,userIds,function(err,guildNameData){
        if(err) return cb(err);
        for (var i = 0; i < reList.length; i++) {
            var locData = reList[i];
            locData.guildName = guildNameData[locData.userId];
        }
        cb(null,reList);
    });

};


var _setTodayRank = function(userData,eid){
    var winData = _getTodayRankWinData(userData);
    var time = winData[0];
    var eids = winData[1]||[];
    if(eids.indexOf(eid)<=-1){
        eids.push(eid);
    }
    winData = [time,eids];
    userData.exData[c_prop.userExDataKey.todayRankWin] = winData;
};

var _getTodayRankWinData = function(userData){
    var winData = userData.exData[c_prop.userExDataKey.todayRankWin] || [];
    var time = winData[0];
    if(!time) time = new Date();
    var timeDate = new Date(time);
    var eids = winData[1]||[];
    if(!(new Date()).equalsDay(timeDate)){
        time =  new Date();
        eids = [];
    }
    winData = [time,eids];
    return winData;
};