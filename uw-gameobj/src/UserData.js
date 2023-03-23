/**
 * Created by Administrator on 2014/5/14.
 */

var UserData = function(){
    this.id = null;
    this.sid = null;//
    this.aid = null;//账号id
    this.areaId = null;//逻辑服务器id
    this.loginTime = Date.now();
    this.channelId = null;
    this.channel = null;
    this.sub_channel = null;
    this.plat = null;
    this.deviceId = null;//    设备唯一号
    this.ip = null;//逻辑服务器id
    this.serverId = null;//
};


module.exports = UserData;