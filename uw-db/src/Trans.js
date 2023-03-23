var dbUtils = require("./dbUtils");
var domain = require("domain");
/**
 * Desc: 事务操作类。
 * @param pool
 * @constructor
 */
function Trans(pool){
    var _pool = pool

    this._isTest = false;//是否为测试用例所用
    /**
     * Desc: 数据库事务的执行路口。
     * @param func
     * @param args
     * @param target
     */
    this.exec = function(func, args, target){
        if(!args || args.length == 0) throw "args can not be empty for exec of Trans!";
        var isTest = this._isTest;
        //先确保传参args转为数组。
        var arr = [];
        if(args instanceof Array){
            for (var i = 0, li = args.length; i < li; i++) {
                arr.push(args[i]);
            }
        }else{
            arr = Array.apply(null, args);
        }
        var cb = arr.pop();
        _pool.acquire(function(err, client){
            if(err) return cb(err);
            var ts = null;
            try{
                ts = client.startTransaction();
                dbUtils.initDbOper(ts);
                arr.splice(0, 0, ts);

                //对callback进行额外改造。
                function tempCb(err){
                    if(err) {
                        ts.rollback && ts.rollback();
                        _pool.release(client);
                        return cb(err);
                    }
                    isTest ? ts.rollback() : ts.commit();
                    _pool.release(client);
                    cb.apply(null, arguments);
                }
                arr.push(tempCb);
                func.apply(target || null, arr);

                //异常处理
                var d = domain.create();
                d.on("error", function(err){
                    ts && ts.rollback && ts.rollback();
                    _pool.release(client);
                    cb(err);
                });
                d.add(ts);
                d.add(client);
                d.run(function(){
                    ts.execute();
                });
            }catch(e){
                ts && ts.rollback && ts.rollback();
                _pool.release(client);
                return cb(e);
            }
        });
    };
}

module.exports = Trans;