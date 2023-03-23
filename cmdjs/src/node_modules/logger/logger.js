/**
 * Created by SmallAiTT on 2015/4/27.
 */

var _map = {};

exports.initLogger = function(loggerName, lvl){
    var logger = {};
    _map[loggerName] = logger;
    logger.log = console.log.bind(console);
    logger.debug = console.log.bind(console);
    logger.info = console.info.bind(console);
    logger.warn = console.warn.bind(console);
    logger.error = console.error.bind(console);
    exports.setLvl(loggerName, lvl);
    return logger;
};
exports.setLvl = function(loggerName, lvl){
    for (var key in _map) {
        if(key == "default") continue;
        var logger = _map[key];
        if(!logger) continue;
        //exports.initLogger(logger, key);
        if(lvl > 1){
            logger.log = function(){};
            logger.debug = function(){};
        }
        if(lvl > 2) logger.info = function(){};
        if(lvl > 3) logger.warn = function(){};
        if(lvl > 4) logger.error = function(){};
    }
};