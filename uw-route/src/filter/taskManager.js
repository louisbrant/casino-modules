var sequeue = require('seq-queue');

var manager = module.exports;

var queues = {};

manager.timeout = 10000;
manager.maxRequest = 50;

/**
 * Add tasks into task group. Create the task group if it dose not exist.
 *
 * @param {String}   key       task key
 * @param {Function} fn        task callback
 * @param {Function} ontimeout task timeout callback
 */
manager.addTask = function(key, fn, ontimeout) {
  var queue = queues[key];
  //限制请求
  //todo 临时放开
  if(queue&&queue.queue.length>manager.maxRequest){
    ontimeout();
    return false;
  }
  if(!queue) {
    queue = sequeue.createQueue(manager.timeout);
    queues[key] = queue;
  }
  return queue.push(fn, ontimeout);
};

/**
 * Destroy task group
 *
 * @param  {String} key   task key
 * @param  {Boolean} force whether close task group directly
 */
manager.closeQueue = function(key, force) {
  if(!queues[key]) {
    // ignore illeagle key
    return;
  }

  queues[key].close(force);
  delete queues[key];
};
