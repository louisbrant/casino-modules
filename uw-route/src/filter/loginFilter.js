/**
 * Created by Administrator on 2015/5/23.
 */


var c_msgCode = require("uw-data").c_msgCode;
var consts = require("uw-data").consts;
var wrapResult = require('uw-utils').wrapResultFunc(__filename);
var getMsg = require("uw-utils").msgFunc(__filename);

module.exports = function(option){
    var routeList = option.routeList||[];

    return function(req, res, next){
        var arrRoute = req.uwRoute.route.split(".");
        if(routeList.indexOf(arrRoute[0])==-1) return next(null);

        //没登陆
        if(!req.uwRoute.session[consts.session.userId]){
            res.send(wrapResult(getMsg(c_msgCode.connectFail)));
            return ;
        }

        //判断重复登录
        if(req.uwRoute.session.loggedInOtherDevice){
            res.send(wrapResult(getMsg(c_msgCode.loggedInOtherDevice)));
            return ;
        }

        //判断踢出
        if(req.uwRoute.session.isKick){
            res.send(wrapResult(getMsg(c_msgCode.outGame)));
            return ;
        }
        next(null);
    }
};