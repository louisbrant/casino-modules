/**
 * Created by SmallAiTT on 2015/4/27.
 */
var fs = require("fs");
var path = require("path2");
var crypto = require('crypto');
var async = require("async2");

var exports = module.exports = fs;
exports.rmdirSync2 = function(filePath, ignores) {
    if( fs.existsSync(filePath) ) {
        if(ignores && ignores.length > 0 && ignores.indexOf(filePath) >= 0) return;
        if(!fs.statSync(filePath).isDirectory()) return fs.unlinkSync(filePath);
        var files = fs.readdirSync(filePath);
        for(var i = 0, li = files.length; i < li; i++){
            var curPath = path.join(filePath, files[i]);
            exports.rmdirSync2(curPath, ignores); // recurse
        }
        files = fs.readdirSync(filePath);//read again
        if(files.length == 0) fs.rmdirSync(filePath);
    }
};

/**
 * Desc: Create dir recursively.
 * @param arr
 * @param index
 * @param cb
 * @returns {*}
 */
exports.mkdir2 = function(arr, index, cb){
    arr = arr || [];
    if(index >= arr.length) cb();
    var dir = path.join(process.cwd(), arr.slice(0, index +1).join(path.sep));
    if(fs.existsSync(dir)) return exports.mkdir2(arr, index+1, cb);
    fs.mkdir(dir, function(){
        exports.mkdir2(arr, index+1, cb);
    });
};
/**
 * Desc: create dir sync recursively.
 * @param dirPath
 */
exports.mkdirSync2 = function(dirPath){
    if(dirPath == null || dirPath == "") return;
    dirPath = path.isAbsolute(dirPath) ? path.normalize(dirPath) : path.join(process.cwd(), dirPath);
    if(fs.existsSync(dirPath)) return;

    var arr = dirPath.split("/") || [];
    var index = arr.length - 1;
    var tempStr = arr[index];
    while(tempStr == "" && arr.length > 0){
        index--;
        tempStr = arr[index];
    }
    if(tempStr == "") return;
    var newPath = dirPath.substring(0, dirPath.length - tempStr.length - 1);
    if(!fs.existsSync(newPath)) exports.mkdirSync2(newPath);
    fs.mkdirSync(dirPath);
};


/**
 * 复制文件到指定路径
 * @param srcPath
 * @param dstPath    目标文件路径（不是目录）
 */
exports.copyFileSync = function(srcPath, dstPath){
    dstPath = path.changeExtname(dstPath, path.extname(dstPath));//注意，自动将所有的文件名后缀转换为小写。
    var dir = path.dirname(dstPath);
    exports.mkdirSync2(dir);
    fs.writeFileSync(dstPath, fs.readFileSync(srcPath));
};
/**
 * Desc: Copy files in srcPath to targetPath, then replace info by config.
 * @param srcPath
 * @param dstPath
 * @param handlerMap
 * @private
 */
exports.copySync = function(srcPath, dstPath, handlerMap){
    handlerMap = handlerMap || {};
    if(fs.statSync(srcPath).isDirectory()){
        if(!fs.existsSync(dstPath)) exports.mkdirSync2(dstPath);//先创建目录
        var files = fs.readdirSync(srcPath);
        for(var i = 0, li = files.length; i < li; i++){
            var file = files[i];
            exports.copySync(path.join(srcPath, file), path.join(dstPath, file), handlerMap);
        }
    }else{
        var extname = path.extname(srcPath) || "";
        extname = extname.toLowerCase();
        var handler = handlerMap[extname];
        if(handler){
            handler(srcPath, dstPath);
        }else{
            var dirname = path.dirname(dstPath);
            if(!fs.existsSync(dstPath)) exports.mkdirSync2(dirname);//创建目录
            fs.writeFileSync(dstPath, fs.readFileSync(srcPath));//copy if it`s a file
        }
    }
};
exports.copyFilesToDstAsync = function(files, srcDir, dstDir, toRoot){
    files = typeof files == "string" ? [files] : files;
    srcDir = srcDir || "";
    for(var i = 0, li = files.length; i < li; i++){
        var file = files[i];
        var filePath = path.join(dstDir, (toRoot ? path.basename(file) : file));
        exports.copyFileSync(path.join(srcDir, file), filePath);
    }
};

/**
 * 遍历目录
 * @param dir
 * @param extnames
 * @param ignores
 * @param onIterator
 * @param onEnd
 * @returns {*}
 */
exports.walkDir = function(dir, extnames, ignores, onIterator, onEnd){
    if(arguments.length == 4){
        onEnd = onIterator;
        onIterator = ignores;
        ignores = null;
    }

    if(ignores && ignores.indexOf(path.basename(dir).toLowerCase()) >= 0) return onEnd();//忽略

    if(typeof extnames == "string") extnames = [extnames];
    extnames = extnames || [];
    if(fs.statSync(dir).isDirectory()){
        var files = fs.readdirSync(dir);
        async.mapLimit(files, 1, function(file, index, cb1){
            exports.walkDir(path.join(dir, file), extnames, ignores, onIterator, cb1);
        }, onEnd);
    }else{
        var extname = path.extname(dir);
        if(!extname) return onEnd();
        for (var i = 0, l_i = extnames.length; i < l_i; i++) {
            var en = extnames[i];
            if(!en) continue;
            en = en.toLowerCase();
            if(en == "*" || en == extname){
                return onIterator(dir, onEnd);
            }
        }
        onEnd();
    }
};
/**
 * 遍历目录
 * @param dir
 * @param extnames
 * @param ignores
 * @param onIterator
 * @param onEnd
 * @returns {*}
 */
exports.walkDirOneByOne = function(dir, extnames, ignores, onIterator, onEnd){
    if(arguments.length == 4){
        onEnd = onIterator;
        onIterator = ignores;
        ignores = null;
    }

    if(ignores && ignores.indexOf(path.basename(dir).toLowerCase()) >= 0) return onEnd();//忽略

    if(typeof extnames == "string") extnames = [extnames];
    extnames = extnames || [];
    if(fs.statSync(dir).isDirectory()){
        var files = fs.readdirSync(dir);
        async.mapLimit(files, 1, function(file, index, cb1){
            exports.walkDirOneByOne(path.join(dir, file), extnames, ignores, onIterator, cb1);
        }, onEnd);
    }else{
        var extname = path.extname(dir);
        if(!extname) return onEnd();
        for (var i = 0, l_i = extnames.length; i < l_i; i++) {
            var en = extnames[i];
            if(!en) continue;
            en = en.toLowerCase();
            if(en == "*" || en == extname){
                return onIterator(dir, onEnd);
            }
        }
        onEnd();
    }
};
/**
 * 遍历目录
 * @param dir
 * @param extnames
 * @param ignores
 * @param onIterator
 */
exports.walkDirSync = function(dir, extnames, ignores, onIterator){
    if(arguments.length == 3){
        onIterator = ignores;
        ignores = null;
    }

    if(ignores && ignores.indexOf(path.basename(dir).toLowerCase()) >= 0) return;//忽略

    if(typeof extnames == "string") extnames = [extnames];
    extnames = extnames || [];
    if(fs.statSync(dir).isDirectory()){
        var files = fs.readdirSync(dir);
        for(var i = 0, li = files.length; i < li; i++){
            exports.walkDirSync(path.join(dir, files[i]), extnames, ignores, onIterator);
        }
    }else{
        var extname = path.extname(dir);
        if(!extname) return;
        for (var i = 0, l_i = extnames.length; i < l_i; i++) {
            var en = extnames[i];
            if(!en) continue;
            en = en.toLowerCase();
            if(en == "*" || en == extname){
                onIterator(dir);
            }
        }
    }
};

exports.getMd5 = function(filePath){
    var str = fs.readFileSync(filePath, 'utf-8');
    var md5um = crypto.createHash('md5');
    md5um.update(str);
    return md5um.digest('hex');
};