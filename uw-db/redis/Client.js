/**
 * Created by Administrator on 2016/5/3.
 */

module.exports = function(pool){
    this.exec = function(funcKey,args,cb){
        var arr = Array.prototype.slice.apply(arguments);
        var funcKey = arr.shift();
        var cb = arr.pop();
        pool.acquire(function(err, client) {
            arr.push(function(err, data){
                pool.release(client);
                err ? cb(err) : cb(null, data);
            });
            var func = client[funcKey];
            if(func){
                func.apply(client, arr);
            }else{
                cb("木有"+funcKey+"这个方法");
            }
        });
    };

    this.set = function(key,value, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("set");
        this.exec.apply(this,arr);
    };

    this.mset = function(key, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("mset");
        this.exec.apply(this,arr);
    };

    this.get = function(key, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("get");
        this.exec.apply(this,arr);
    };

    this.mget = function(key, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("mget");
        this.exec.apply(this,arr);
    };

    this.strlen = function(key, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("strlen");
        this.exec.apply(this,arr);
    };

    this.del = function(key, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("del");
        this.exec.apply(this,arr);
    };

    this.hexists = function(key,value, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("hexists");
        this.exec.apply(this,arr);
    };

    this.hmset = function(key,value, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("hmset");
        this.exec.apply(this,arr);
    };

    this.hset = function(key,value, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("hset");
        this.exec.apply(this,arr);
    };

    this.hget = function(key,value, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("hget");
        this.exec.apply(this,arr);
    };

    this.hgetall = function(key, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("hgetall");
        this.exec.apply(this,arr);
    };

    this.hdel = function(key, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("hdel");
        this.exec.apply(this,arr);
    };

    this.hmget = function(key, args,cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("hmget");
        this.exec.apply(this,arr);
    };

    this.hkeys = function(key, args,cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("hkeys");
        this.exec.apply(this,arr);
    };

    this.lpush = function(key, args,cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("lpush");
        this.exec.apply(this,arr);
    };

    this.lrange = function(key, start,end, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("lrange");
        this.exec.apply(this,arr);
    };

    this.lset = function(key, args,cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("lset");
        this.exec.apply(this,arr);
    };

    this.llen = function(key, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.unshift("llen");
        this.exec.apply(this,arr);
    };
};
