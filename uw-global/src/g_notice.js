/**
 * Created by Administrator on 14-9-25.
 */
var async = require('async');
var logger = require('uw-log').getLogger("uw-logger", __filename);

//公告缓存
var __noticeList = [];
var __lastVisitTime = null;
var expireDate = 10;//10秒

//是否重新获取数据
exports.isInit = function(){
    if(!__lastVisitTime) return true;
    //超过10秒则重新获取
    if((new Date()).addSeconds(expireDate*-1).isAfter(__lastVisitTime) ) return true;
    return false;
};

//设置公告
exports.setNoticeList = function(noticeList){
    __noticeList = noticeList;
    __lastVisitTime = new Date();
};

//获得公告
exports.getNoticeList = function(serverId){
    var noticeList = [].concat(__noticeList);
    for (var i = 0; i < noticeList.length; i++) {
        var locNoticeData = noticeList[i];
        var serverIdArr = locNoticeData.serverIdArr||[];
        if(serverIdArr.length > 0 && serverIdArr.indexOf(serverId)<0){
            noticeList.splice(i, 1);
            i--;
        }
    }
    return noticeList;
};

/****************************************************************/
