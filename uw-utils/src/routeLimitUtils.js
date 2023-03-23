/**
 * Created by windows on 2015/4/20.
 */

var exports = module.exports;

var g_singleList = {};

/**
 * 判断单独限制请求时间
 * @param route
 * @param id
 * @param limitSeconds
 */
exports.limitSingleTime = function(route,id,limitSeconds){
    var key = route + id;
    var data = g_singleList[key];
    console.error(data);
    if (!data) {
        g_singleList[key] = {id: id, route: route, limitSeconds: limitSeconds, time: new Date()};
        return false;
    }
    console.log((new Date()).addSeconds(-data.limitSeconds));
    console.log(data.time);
    if ((new Date()).addSeconds(-data.limitSeconds).isAfter(data.time) ) {
        delete g_singleList[key];
        return false;
    }
    return true;
};

/**
 * 清除限制
 * @param route
 * @param id
 */
exports.clearLimitSingleTime = function(route,id){
    var key = route + id;
    console.error(g_singleList)
    delete g_singleList[key];
};