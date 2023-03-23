/**
 * Created by SmallAiTT on 2015/4/27.
 */
var path = require("path");

function formatPathStr(func, args){
    var result = func.apply(path, args);
    if(!result) return result;
    result = result.replace(/\\/g, "/");
    //TODO 进行extname小写操作
    return result;
}

exports.normalize = function(p){
    return formatPathStr(path.normalize, arguments);
};

exports.join = function(p){
    return formatPathStr(path.join, arguments);
};

exports.resolve = function(p){
    return formatPathStr(path.resolve, arguments);
};

exports.isAbsolute = function(filePath){
    filePath = path.normalize(filePath);
    if(filePath.substring(0, 1) == "/") return true;
    if(filePath.search(/[\w]+:/) == 0) return true;
    return false;
};

exports.relative = function(p){
    return formatPathStr(path.relative, arguments);
};

exports.dirname = function(p){
    return formatPathStr(path.dirname, arguments);
};

exports.basename = function(p){
    return formatPathStr(path.basename, arguments);
};

exports.extname = function(p){
    var ext = formatPathStr(path.extname, arguments);
    if(ext) return ext.toLowerCase();
};

exports.sep = function(p){
    return path.sep.apply(path, arguments);
};

exports.delimiter = function(p){
    return formatPathStr(path.delimiter, arguments);
};

exports.parse = function(p){
    return formatPathStr(path.parse, arguments);
};

exports.format = function(p){
    return formatPathStr(path.format, arguments);
};


//+++++++++++++++++++自定义 开始++++++++++++++++++++++++++
exports.changeExtname = function(pathStr, extname){
    extname = extname || "";
    var index = pathStr.indexOf("?");
    var tempStr = "";
    if(index > 0) {
        tempStr = pathStr.substring(index);
        pathStr = pathStr.substring(0, index);
    }
    index = pathStr.lastIndexOf(".");
    extname = extname.toLowerCase();
    if(index < 0) return pathStr + extname + tempStr;
    return pathStr.substring(0, index) + extname + tempStr;
};

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
    }
    index = pathStr.lastIndexOf("/");
    index = index <= 0 ? 0 : index+1;
    return pathStr.substring(0, index) + basename + ext + tempStr;
};
/**
 * 判断是否是该后缀名称的文件。
 * @param {String} pathStr
 * @param {String|Array} extname       可以为一个数组
 * @returns {boolean}
 */
exports.isExtname = function(pathStr, extname){
    var extnames = extname instanceof Array ? extname : [extname];
    var extname1 = exports.extname(pathStr);
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
};

//+++++++++++++++++++自定义 结束++++++++++++++++++++++++++
