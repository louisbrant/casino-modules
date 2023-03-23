/**
 * Created by Administrator on 14-6-23.
 */
var userCache = require("uw-cache").userCache;
var user = {id:50,name:"测试",bag:{1:2,3:5}};
userCache.set(50,user);
var cacheData = userCache.get(50);
console.log(cacheData);
console.log(userCache.cacheDic);
userCache.set(50,{bag:{1:5,5:2},name:"哈哈"});
cacheData = userCache.get(50);
console.log(cacheData);
console.log(userCache.cacheDic);
