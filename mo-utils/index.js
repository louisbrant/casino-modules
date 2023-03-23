/**
 * Created with JetBrains WebStorm.
 * User: SmallAiTT
 * Date: 13-10-13
 * Time: 下午8:06
 * To change this template use File | Settings | File Templates.
 */

var fs = require("fs");
var path = require("path");
var crypto = require('crypto');
var exec = require("child_process").exec;
var async = require("async");

exports.NUM_EXP = /(^([\-]?[\d]+)$)|(^([\-]?[\d]+\.[\d]+)$)/

exports.getMd5 = function(filePath){
    var str = fs.readFileSync(filePath, 'utf-8');
    var md5um = crypto.createHash('md5');
    md5um.update(str);
    return md5um.digest('hex');
}

/**
 * dESC:根据文件名称将其转换为相应的key名称。
 * @param name
 * @returns {String}
 */
exports.getFileKey = function(name){
    var key = name.replace(/[.]/g, "_");
    key = key.replace(/[\-]/g, "_");
    var r = key.match(/^[0-9]/);
    if(r != null) key = "_" + key;
    return key;
};

exports.getBlank = function(num){
    var result = "";
    for(var i = 0; i < num; ++i){
        result += '    ';
    }
    return result;
};
exports.getCommonSplit = function(num){
    return '\r\n' + exports.getBlank(num) + ',';
};

exports.wrapObj = function(arr, num){
    return '{\r\n' + exports.getBlank(num) + arr.join(exports.getCommonSplit(num)) + '\r\n' + exports.getBlank(num - 1) + '}';
};
/**
 * 格式化json或者js对象的输出。
 * @param obj
 * @param isJs
 * @param blankIndex
 * @returns {*}
 */
exports.stringify = function(obj, isJs, blankIndex){
    var maxLength = 110;
    isJs = isJs == null ? true : isJs;
    blankIndex = blankIndex || 0;
    if(obj == null) return "null";
    if(typeof obj == "number") return obj;
    if(typeof obj == "string") return '"' + obj + '"';
    if(typeof obj == "boolean") return obj;
    var result1 = "";
    var result2 = "";
    if(obj instanceof Array){
        result1 += "[";
        result2 += "[\r\n";
        for (var i = 0, li = obj.length; i < li; i++) {
            var str = this.stringify(obj[i], isJs, blankIndex + 1);
            result1 += str;
            result2 += this.getBlank(blankIndex + 1) + str;
            if(i < li - 1) {
                result1 += ", "
                result2 += ",\r\n";
            }else{
                result2 += "\r\n"
            }
        }
        result1 += "]"
        result2 += this.getBlank(blankIndex) + "]";
        if(result1.length + blankIndex * 4 <= maxLength) return result1;
        return result2;
    }else{
        var keys = Object.keys(obj);
        result1 += "{";
        result2 += "{\r\n";
        for (var i = 0, li = keys.length; i < li; i++) {
            var key = keys[i];
            var str = this.stringify(obj[key], isJs, blankIndex + 1);
            var keyStr = isJs ? key + ' : ' : '"' + key + '" : ';
            result1 += keyStr + str;
            result2 += this.getBlank(blankIndex + 1) + keyStr + str;
            if(i < li - 1) {
                result1 += ", "
                result2 += ",\r\n";
            }else{
                result2 += "\r\n"
            }
        }
        result1 += "}"
        result2 += this.getBlank(blankIndex) + "}";
        if(result1.length + blankIndex * 4 <= maxLength) return result1;
        return result2;
    }
};
/**
 * 修改文件后缀名
 * @param pathStr
 * @param extname
 * @returns {string}
 */
exports.changeExtname = function(pathStr, extname){
    extname = extname || "";
    var index = pathStr.indexOf("?");
    var tempStr = "";
    if(index > 0) {
        tempStr = pathStr.substring(index);
        pathStr = pathStr.substring(0, index);
    };
    index = pathStr.lastIndexOf(".");
    if(index < 0) return pathStr + extname + tempStr;
    return pathStr.substring(0, index) + extname + tempStr;
}
/**
 * 修改文件名
 * @param pathStr
 * @param basename
 * @param isSameExt
 * @returns {*}
 */
exports.changeBasename = function(pathStr, basename, isSameExt){
    if(basename.indexOf(".") == 0) return this.changeExtname(pathStr, basename);
    var index = pathStr.indexOf("?");
    var tempStr = "";
    var ext = isSameExt ? this.extname(pathStr) : "";
    if(index > 0) {
        tempStr = pathStr.substring(index);
        pathStr = pathStr.substring(0, index);
    };
    index = pathStr.lastIndexOf("/");
    index = index <= 0 ? 0 : index+1;
    return pathStr.substring(0, index) + basename + ext + tempStr;
};
/**
 * 将文件后缀名改为小写。
 * @param pathStr
 * @returns {*}
 */
exports.changeExtnameToLowerCase = function(pathStr){
    var extname = path.extname(pathStr);
    if(!extname) {
        return pathStr;
    }
    return pathStr.substring(0, pathStr.length - extname.length) + extname.toLowerCase();
};
/**
 * 判断是否是该后缀名称的文件。
 * @param {String} pathStr
 * @param {String|Array} extname       可以为一个数组
 * @returns {boolean}
 */
exports.isExtname = function(pathStr, extname){
    var extnames = extname instanceof Array ? extname : [extname];
    var extname1 = path.extname(pathStr);
    if(!extname1){
        return false;
    }
    for(var i = 0; i < extnames.length; ++i){
        var e = extnames[i];
        if(e.substring(0, 1) != "."){
            e = "." + e;
        }
        extnames[i] = e.toLowerCase();
    }
    return extnames.indexOf(extname1.toLowerCase()) >= 0;
}

/**
 * Desc: Remove dir recursively.
 * @param filePath
 * @param ignores
 */
exports.rmdirSync = function(filePath, ignores) {
    if( fs.existsSync(filePath) ) {
        if(ignores && ignores.length > 0 && ignores.indexOf(filePath) >= 0) return;
        if(!fs.statSync(filePath).isDirectory()) return fs.unlinkSync(filePath);
        var files = fs.readdirSync(filePath);
        for(var i = 0, li = files.length; i < li; i++){
            var curPath = path.join(filePath, files[i]);
            exports.rmdirSync(curPath, ignores); // recurse
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
exports.mkdir = function(arr, index, cb){
    if(index >= arr.length) cb();
    var dir = path.join(process.cwd(), arr.slice(0, index +1).join(path.sep));
    if(fs.existsSync(dir)) return exports.mkdir(arr, index+1, cb);
    fs.mkdir(dir, function(){
        exports.mkdir(arr, index+1, cb);
    });
}
/**
 * Desc: create dir sync recursively.
 * @param dirPath
 */
exports.mkdirSync = function(dirPath){
    if(dirPath == null || dirPath == "") return;
    dirPath = exports.isAbsolute(dirPath) ? path.normalize(dirPath) : path.join(process.cwd(), dirPath);
    if(fs.existsSync(dirPath)) return;

    var arr = dirPath.split(path.sep);
    var index = arr.length - 1;
    var tempStr = arr[index];
    while(tempStr == "" && arr.length > 0){
        index--;
        tempStr = arr[index];
    }
    if(tempStr == "") return;
    var newPath = dirPath.substring(0, dirPath.length - tempStr.length - 1);
    if(!fs.existsSync(newPath)) exports.mkdirSync(newPath);
    fs.mkdirSync(dirPath);
}
/**
 * Desc: Returns true if the filePath is absolute.
 * @param filePath
 * @returns {boolean}
 */
exports.isAbsolute = function(filePath){
    filePath = path.normalize(filePath);
    if(filePath.substring(0, 1) == "/") return true;
    if(filePath.search(/[\w]+:/) == 0) return true;
    return false;
};
/**
 * 复制文件到指定路径
 * @param srcPath
 * @param dstPath    目标文件路径（不是目录）
 */
exports.copyFileSync = function(srcPath, dstPath){
    dstPath = exports.changeExtnameToLowerCase(dstPath);//注意，自动将所有的文件名后缀转换为小写。
    var dir = path.dirname(dstPath);
    exports.mkdirSync(dir);
    fs.writeFileSync(dstPath, fs.readFileSync(srcPath));
}
/**
 * Desc: Copy files in srcPath to targetPath, then replace info by config.
 * @param srcPath
 * @param targetPath
 * @param handler
 * @private
 */
exports.copyFilesSync = function(srcPath, targetPath, handler){
    if(!fs.statSync(srcPath).isDirectory()) return fs.writeFileSync(targetPath, fs.readFileSync(srcPath));//copy if it`s a file

    var files = fs.readdirSync(srcPath);
    for(var i = 0, li = files.length; i < li; i++){
        var file = files[i];
        if(fs.statSync(path.join(srcPath, file)).isDirectory()){//make dir if it`s a dir
            var dir = path.join(targetPath, file, "./");
            if(!fs.existsSync(dir)) fs.mkdirSync(dir);
            exports.copyFilesSync(path.join(srcPath, file + "/"), dir, handler);//goes on
        }else{
            var filePath = path.join(targetPath, file);
            filePath = exports.changeExtnameToLowerCase(filePath);//注意，自动将所有的文件名后缀转换为小写。
            fs.writeFileSync(filePath, fs.readFileSync(path.join(srcPath, file)));//copy if it`s a file
            if(handler) {
                handler.fmt(filePath);
            }
        }
    }
}
exports.copyFilesToDstAsync = function(files, srcDir, dstDir, toRoot){
    files = typeof files == "string" ? [files] : files;
    srcDir = srcDir || "";
    for(var i = 0, li = files.length; i < li; i++){
        var file = files[i];
        var filePath = path.join(dstDir, (toRoot ? path.basename(file) : file));
        exports.copyFileSync(path.join(srcDir, file), filePath);
    }
}
/**
 * 压缩js。
 * @param dir
 * @param jsList
 * @param outputJsPath
 */
exports.uglifyJs = function(dir, jsList, outputJsPath){
    jsList = typeof jsList == "string" ? [jsList] : jsList;
//    var content = "";
//    for(var i = 0, li = jsList.length; i < li; i++){
//        var itemi = jsList[i];
//        content += fs.readFileSync(path.join(dir, itemi)).toString() + "\r\n\r\n";
//    }
//    fs.writeFileSync(outputJsPath, content);
//
//    return;

    var jsArr = [];
    var uglifyJs = require("uglify-js");
    for(var i = 0, li = jsList.length; i < li; i++){
        var itemi = jsList[i];
        jsArr.push(path.join(dir, itemi));
    }
    var result = uglifyJs.minify(jsArr);
    fs.writeFileSync(outputJsPath, result.code);
};
/**
 * 压缩json。
 * @param json
 * @param {{JSON_KEY:Object, JSON_DEFAULT_VALUE:Object}} opt
 * @param key
 * @returns {*}
 */
exports.uglifyJson = function(json, opt, key){
    if(json == null) return null;
    var JSON_KEY = opt.JSON_KEY;//key map
    var JSON_DEFAULT_VALUE = opt.JSON_DEFAULT_VALUE;//default value map
    var defaultValue = key != null ? JSON_DEFAULT_VALUE[key] : null;//default value
    if(typeof json == "string") return defaultValue == json ? null : json;
    if(typeof json == "number") {
        if(defaultValue == json) return null;
        var numStr = json+"";
        //保留四位小数操作
        var index = numStr.indexOf(".");
        if(index>=0 && numStr.length - index > 4){
            var num1 = Math.round(json*10000)/10000;
            var num2 = Math.round(json);
            if(num1 == num2){
                json = num2;
            }else{
                json = num1;
            }
        }
        return json;
    }
    if(typeof json == "boolean") return defaultValue == json ? null : (json ? 1 : 0);
    if(json instanceof Array){
        var tempArr = [];
        for(var i = 0, li = json.length; i < li; ++i){
            var value = json[i];
            var newValue = exports.uglifyJson(value, opt);
            if(newValue != null) tempArr[i] = newValue;
        }
        return tempArr;
    }else if(typeof json == "object"){
        var tempObj = {};
        for (var key in json) {
            var miniKey = JSON_KEY[key];
            if(miniKey == null) continue;//需要删除该key
            var value = json[key];
            if(value == null) continue;
            var newValue = exports.uglifyJson(value, opt, miniKey);
            if(newValue != null) tempObj[miniKey] = newValue;
        }
        return tempObj;
    }
    return value;
};
/**
 * 遍历目录
 * @param dir
 * @param extnames
 * @param ignores
 * @param func
 * @param cb
 * @returns {*}
 */
exports.walkDir = function(dir, extnames, ignores, func, cb){
    if(arguments.length == 4){
        cb = func;
        func = ignores;
        ignores = null;
    }

    if(ignores && ignores.indexOf(path.basename(dir).toLowerCase()) >= 0) return cb();//忽略

    if(typeof extnames == "string") extnames = [extnames];
    if(fs.statSync(dir).isDirectory()){
        var files = fs.readdirSync(dir);
        async.mapLimit(files, 1, function(file, cb1){
            exports.walkDir(path.join(dir, file), extnames, ignores, func, cb1);
        }, cb);
    }else{
        var extname = path.extname(dir);
        if(!extname) return cb();
        extname = extname.toLowerCase();
        if(extnames.indexOf("*") >= 0 || extnames.indexOf(extname) >= 0){
            return func(dir, cb);
        }
        cb();
    }
}
/**
 * 遍历目录
 * @param dir
 * @param extnames
 * @param ignores
 * @param func
 * @param cb
 * @returns {*}
 */
exports.walkDirOneByOne = function(dir, extnames, ignores, func, cb){
    if(arguments.length == 4){
        cb = func;
        func = ignores;
        ignores = null;
    }

    if(ignores && ignores.indexOf(path.basename(dir).toLowerCase()) >= 0) return cb();//忽略

    if(typeof extnames == "string") extnames = [extnames];
    if(fs.statSync(dir).isDirectory()){
        var files = fs.readdirSync(dir);
        async.mapLimit(files, 1, function(file, cb1){
            exports.walkDirOneByOne(path.join(dir, file), extnames, ignores, func, cb1);
        }, cb);
    }else{
        var extname = path.extname(dir);
        if(!extname) return cb();
        extname = extname.toLowerCase();
        if(extnames.indexOf("*") >= 0 || extnames.indexOf(extname) >= 0){
            return func(dir, cb);
        }
        cb();
    }
}
/**
 * 遍历目录
 * @param dir
 * @param extnames
 * @param ignores
 * @param func
 */
exports.walkDirSync = function(dir, extnames, ignores, func){
    if(arguments.length == 3){
        func = ignores;
        ignores = null;
    }

    if(ignores && ignores.indexOf(path.basename(dir).toLowerCase()) >= 0) return;//忽略

    if(typeof extnames == "string") extnames = [extnames];
    if(fs.statSync(dir).isDirectory()){
        var files = fs.readdirSync(dir);
        for(var i = 0, li = files.length; i < li; i++){
            exports.walkDirSync(path.join(dir, files[i]), extnames, ignores, func);
        }
    }else{
        var extname = path.extname(dir);
        if(!extname) return;
        extname = extname.toLowerCase();
        if(extnames.indexOf("*") >= 0 || extnames.indexOf(extname) >= 0){
            func(dir);
        }
    }
}
/**
 * 执行cmd命令的封装。
 * @param commond
 * @param options
 * @param cb
 */
exports.cmd = function(commond, options, cb){
    var args = Array.apply(null, arguments);
    args.splice(0, 1);
    var cbFunc = args[args.length - 1];
    if(typeof cbFunc == "function"){
        args.pop();
    }else{
        cbFunc = function(err){
            if(err){
                console.error(err);
            }
        }
    }
    function getOptStr(opt){
        var str = " ";
        if(opt instanceof Array){
            for(var i = 0, li = opt.length; i < li; i++){
                str += getOptStr(opt[i]);
            }
        }else if(typeof opt == "object"){
            for (var key in opt) {
                var value = opt[key];
                str += '"' + key + '" '
                if(value instanceof Array){
                    for(var i = 0, li = value.length; i < li; i++){
                        var itemi = value[i];
                        if(typeof itemi == "number"){
                            str += itemi + " ";
                        }else{
                            str += '"' + itemi + '" ';
                        }
                    }
                }else if(typeof value == "number"){
                    str += value + ' ';
                }else{
                    str += '"' + value + '" ';
                }
            }
        }else if(typeof opt == "number"){
            str += opt + ' ';
        }else{
            str += '"' + opt + '" ';
        }
        return str;
    }
    var cmdStr = commond + getOptStr(args);
//    console.log("executing cmd:")
//    console.log(cmdStr);
    exec(cmdStr, cbFunc)
};
/**
 * 调用py脚本
 * @param py
 * @param options
 * @param cb
 * @returns {*}
 */
exports.py = function(py, options, cb){
    var args = Array.prototype.slice.call(arguments);
    var extname = path.extname(py);
    if(!extname) args[0] = py + ".py";
    args.splice(0, 0, "python");
    return exports.cmd.apply(exports, args);
};
/**
 * 格式化参数成String。
 * 参数和h5的console.log保持一致。
 * @returns {*}
 */
exports.formatStr = function(){
    var args = arguments;
    var l = args.length;
    if(l < 1){
        return "";
    }
    var str = args[0];
    var needToFormat = true;
    if(typeof str == "object"){
        str = JSON.stringify(str);
        needToFormat = false;
    }
    for(var i = 1; i < l; ++i){
        var arg = args[i];
        arg = typeof arg == "object" ? JSON.stringify(arg) : arg;
        if(needToFormat){
            while(true){
                var result = null;
                if(typeof arg == "number"){
                    result = str.match(/(%d)|(%s)/);
                    if(result){
                        str = str.replace(/(%d)|(%s)/, arg);
                        break;
                    }
                }
                result = str.match(/%s/);
                if(result){
                    str = str.replace(/%s/, arg);
                }else{
                    str += "    " + arg;
                }
                break;
            }
        }else{
            str += "    " + arg;
        }
    }
    return str;
};
var reqExp4Placeholder = /\$\{[^\s\{\}]*\}/g;
/**
 * 格式化占位符字符串
 * @param tempStr
 * @param map
 * @returns {XML|string|void}
 */
exports.formatPlaceholder = function(tempStr, map){
    function change(word){
        var key = word.substring(2, word.length - 1)
        var value = map[key];
        if(value == null) {
            console.error("formatPlaceholder时，map中缺少变量【%s】的设置，请检查！", key);
            return word;
        }
        return value;
    }
    return tempStr.replace(reqExp4Placeholder, change);
};

//console.log(exports.formatPlaceholder("fff${a}ddd${b}ccc", {"a" : "FFFF"}));

//是否含有中文（也包含日文和韩文）
exports.isChinese = function(str){
    var reg = /[\u4E00-\u9FA5\uF900-\uFA2D]/;
    return reg.test(str);
};
//同理，是否含有全角符号的函数
exports.isFullWidth = function(str){
    var reg = /[\uFF00-\uFFEF]/;
    return reg.test(str);
};

//生成index文件
exports.genIndexFile = function(basePath, opt){
    var searchDirs = opt.searchDirs || [];
    var content = "";
    for(var i = 0, li = searchDirs.length; i < li; i++){
        var dirPath = path.join(basePath, searchDirs[i]);
        var files = fs.readdirSync(dirPath);
        for(var j = 0, lj = files.length; j < lj; j++){
            var fileName = files[j];
            var filePath = path.join(dirPath, fileName);
            if(fs.statSync(filePath).isDirectory()){
                continue;
            }else{
                if(exports.isExtname(fileName, ".js") || exports.isExtname(".json")){
                    var basename = path.basename(fileName, path.extname(fileName));
                    content += "exports." + basename + " = require('./" + path.relative(basePath, filePath) + "');\r\n";
                }
            }
        }
    }
    exports.mkdirSync(basePath);
    content = content.replace(/\\/g, "/");
    fs.writeFileSync(path.join(basePath, "index.js"), content);
}
