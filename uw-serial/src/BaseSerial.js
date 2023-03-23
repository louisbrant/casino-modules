/**
 * Created by Administrator on 2015/8/22.
 */
var sequeue = require('seq-queue');
var logger = require('uw-log').getLogger("uw-sys-error", __filename);


var BaseSerial = function(){
    this.queues = {};
    this.timeout = 10000;
    this.uKey = "";

    /**
     * 添加
     * @param key
     * @param cb
     */
    this.add = function(key, cb){
        var self = this;
        var curKey = this.uKey+key;
        this.before(curKey, function(task){
            cb(function(){
                self.after(task);
            });
        });
    };

    /**
     * 调用开始
     * @param curKey
     * @param fun
     */
    this.before = function(curKey, fun){
        this._addTask(curKey,function(task){
            fun(task);
        },function(){
            logger.error("序列超时1,curKey:%s",curKey);
        });
    };

    /**
     * 调用结束
     * @param task
     */
    this.after = function(task){
        if(task) {
            if(!task.done()) {
                logger.error("序列超时2");
            }
        }
    };

    /**
     * 关闭移除序列
     * @param key
     * @param force
     */
    this.closeQueue = function(key){
        var curKey = this.uKey+key;
        if(!this.queues[curKey]) {
            // ignore illeagle key
            return;
        }

        this.queues[curKey].close(true);
        delete this.queues[curKey];
    };

    this._addTask = function(key, fn, ontimeout){
        var queue = this.queues[key];
        if(!queue) {
            queue = sequeue.createQueue(this.timeout);
            this.queues[key] = queue;
        }
        return queue.push(fn, ontimeout);
    };


};

module.exports = BaseSerial;