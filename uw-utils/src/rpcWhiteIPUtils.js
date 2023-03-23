/**
 * Created by Administrator on 14-3-28.
 */

var gWhiteList = ['127.0.0.1'];
module.exports.whiteListFunc = function(cb) {
    cb(null, gWhiteList);
};
