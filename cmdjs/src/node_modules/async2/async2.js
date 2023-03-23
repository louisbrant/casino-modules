/**
 * Created by SmallAiTT on 2015/4/29.
 */

var clazz = require("clazz");

var AsyncPool = clazz.extends({
    _srcObj : null,
    _limit : 0,
    _pool : null,
    _iterator : null,
    _iteratorCtx : null,
    _onEnd : null,
    _onEndCtx : null,
    _results : null,
    _isErr: false,
    size : 0,
    finishedSize : 0,
    _workingSize : 0,

    ctor : function(srcObj, limit, iterator, onEnd, ctx){
        var self = this;
        self._pool = [];
        self._srcObj = srcObj;
        self._iterator = iterator;
        self._iteratorCtx = ctx;
        self._onEnd = onEnd;
        self._onEndCtx = ctx;
        self._results = srcObj instanceof Array ? [] : {};

        self._each(srcObj, function(value, index){
            self._pool.push({index : index, value : value});
        });

        self.size = self._pool.length;//总大小
        self._limit = limit || self.size;
    },

    _each : function(obj, iterator, context){
        if(!obj) return;
        if(obj instanceof Array){
            for(var i = 0, li = obj.length; i < li; i++){
                if(iterator.call(context, obj[i], i) === false) return;
            }
        }else{
            for (var key in obj) {
                if(iterator.call(context, obj[key], key) === false) return;
            }
        }
    },

    onIterator : function(iterator, ctx){
        this._iterator = iterator;
        this._iteratorCtx = ctx;
    },

    onEnd : function(endCb, ctx){
        this._onEnd = endCb;
        this._onEndCtx = ctx;
    },

    _handleItem : function(){
        var self = this;
        if(self._pool.length == 0) return;//数组长度为0直接返回不操作了
        if(self._workingSize >= self._limit) return;//正在工作的数量应达到限制上限则直接返回
        var item = self._pool.shift();
        var value = item.value;
        var index = item.index;
        self._workingSize++;//正在工作的大小+1
        self._iterator.call(self._iteratorCtx, value, index, function(err){
            if(self._isErr) return;//已经出错了，就直接返回了

            self.finishedSize++;//完成数量+1
            self._workingSize--;//正在工作的大小-1

            if(err) {
                self._isErr = true;//设置成已经出错了
                if(self._onEnd) self._onEnd.call(self._onEndCtx, err);//如果出错了
                return
            }

            var arr = Array.prototype.slice.call(arguments);
            arr.splice(0, 1);//去除第一个参数
            self._results[this.index] = arr[0];//保存迭代器返回结果
            if(self.finishedSize == self.size) {//已经结束
                if(self._onEnd) self._onEnd.call(self._onEndCtx, null, self._results);
                return
            }

            process.nextTick(function(){
                self._handleItem();
            });
        }.bind(item), self);
    },

    flow : function(){
        var self = this;
        var onFlow = function(){
            if(self._pool.length == 0) {
                if (self._onEnd) self._onEnd.call(self._onEndCtx, null, []);//数组长度为0，直接结束
            }else{
                for(var i = 0; i < self._limit; i++){
                    self._handleItem();
                }
            }
        };

        if(typeof process != "undefined" && process.nextTick){
            process.nextTick(onFlow, self);
        }else{
            //实在没有就用自带的（浏览器环境下才会进）
            setTimeout(function(){
                onFlow();
            }, 1);
        }
    }

});

exports.AsyncPool = AsyncPool;

exports.series = function(tasks, cb, ctx){
    var asyncPool = new AsyncPool(tasks, 1, function(func, index, cb1){
        func.call(ctx, cb1);
    }, cb, ctx);
    asyncPool.flow();
};

exports.parallel = function(tasks, cb, ctx){
    var asyncPool = new AsyncPool(tasks, 0, function(func, index, cb1){
        func.call(ctx, cb1);
    }, cb, ctx);
    asyncPool.flow();
};

exports.map = function(tasks, iterator, cb, ctx){
    var asyncPool = new AsyncPool(tasks, 0, iterator, cb, ctx);
    asyncPool.flow();
};

exports.mapLimit = function(tasks, limit, iterator, cb, ctx){
    var asyncPool = new AsyncPool(tasks, limit, iterator, cb, ctx);
    asyncPool.flow();
};