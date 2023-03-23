/**
 * Created by Sara on 2016/6/24.
 */
var _Class = module.exports = function() {
    /** 服务器 **/
    this.serverId = "";
    /** 账号id **/
    this.accountId = "";
    /** 用户id **/
    this.userId = "";
    /** 昵称 **/
    this.nickName = "";
    /** 等级 **/
    this.lvl = "";
    /** 时间 **/
    this.happenTime = "";
    /** 消耗物品 **/
    this.costObj = "";

    /** 真气 **/
    this.oldGenuineQi = "";    /** 原本真气值 **/
    this.newGenuineQi = "";   /** 当前真气值 **/
    this.costGenuineQi = "";   /** 当前真气值 **/
    this.costType = "";   /** 培养类型 **/
    this.costOldLvl = "";   /** 培养前等级 **/
    this.costNewLvl = "";   /** 培养后等级 **/
};