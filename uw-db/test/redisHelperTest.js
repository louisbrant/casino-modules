/**
 * Created by Administrator on 2016/5/3.
 */

var redisHelper = require("../redis/helper");
var cfg = {
    name :"server1",
    host:"101.227.80.111",
    port:33333
};
//"121.43.191.194",10.0.0.6
var client = redisHelper.getClient(cfg);

/*

 client.set("k1","bbbbb",function(err,data){
 console.log(err,data);
 });


 client.del("k1",function(err,data){
 console.log(err,data);
 });

 client.get("k1",function(err,data){
 console.log(err,data);
 });


 client.exec("set","k2","bbbbb222",function(err,data){
 console.log(err,data);
 });

 client.exec("get","k2",function(err,data){
 console.log(err,data);
 });

 client.mget(["k1","k2"],function(err,data){
 console.log("mget",data);
 });


 var obj1 = {
 "a":"111111111",
 "b":"asdasd"
 }
 client.hmset("o1",obj1,function(err,data){
 console.log(err,data);
 });

 client.hset("o1",["c","eeeee"],function(err,data){
 console.log(err,data);
 });

 client.hset("o2",["c","eeeee"],function(err,data){
 console.log(err,data);
 });


 client.hset("o2",["d","gggggg"],function(err,data){
 console.log(err,data);
 });

 client.hgetall("o2",function(err,data){
 console.log(err,data);
 });


 client.hgetall("o1",function(err,data){
 console.log(err,data);
 });

 client.hmget("o1","a","b",function(err,data){
 console.log(err,data);
 });

 client.hmget("o3333","a","b",function(err,data){
 console.log("o3333",data);
 });

 client.strlen("o3333ggg",function(err,data){
 console.log("o3333ggg",data);
 });



 client.lpush("arrTest",[1,2,3,3,5],function(err,data){
 console.log("arrTest",data);
 });

 client.del("arrTest",function(err,data){
 console.log("arrTest",data);
 });


 client.lrange("arrTest",0,-1,function(err,data){
 console.log("arrTest",data);
 });


 client.mget(["k2","k1"],function(err,data){
 console.log("mget arrTest",data);
 });

 client.del("guildWar-guild-dynamic",function(err,data){
 console.log("guildWar-guild-dynamic",data);
 });
 client.del("guildWar-guild-static",function(err,data){
 console.log("guildWar-guild-static",data);
 });

 */

/*
 client.lpush("arrTest",[1,2,3,4,5],function(err,data){
 console.log("arrTest",data);
 });
 */



/*

 client.hgetall("guildWar-guild-dynamic",function(err,data){
 console.log("arrTest",data);
 });


 client.hgetall("guildWar-user-dynamic",function(err,data){
 console.log("arrTest",data);
 });

 */



/*

 //[104044,500,1462442048638,"10"]
 client.hgetall("guildWar-user-dynamic",function(err,data){
 console.log("guildWar-user-dynamic",data);
 });

 */

client.hgetall("guildWar-attackRecord-dynamic",function(err,data){
    console.log("guildWar-attackRecord-dynamic",data);
});

client.hgetall("guildWar-guild-dynamic",function(err,data){
 console.log("guildWar-guild-dynamic",data);
});


client.hgetall("guildWar-user-dynamic",function(err,data){
 console.log("guildWar-user-dynamic",data);
});
