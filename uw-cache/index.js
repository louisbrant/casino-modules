/**
 * Created by Administrator on 14-6-21.
 */
exports.userCache = require("./src/cache/userCache");
exports.taskCache = require("./src/cache/taskCache");

exports.remove = function(key){
    exports.userCache.remove(key);
    exports.taskCache.remove(key);
};