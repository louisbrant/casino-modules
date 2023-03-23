/**
 * Created by SmallAiTT on 2015/4/29.
 */

var fs = require("fs");
var path = require("path");

exports.NUM_EXP = /(^([\-]?[\d]+)$)|(^([\-]?[\d]+\.[\d]+)$)/

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
 * 格式化参数成String。
 * 参数和h5的console.log保持一致。
 * @returns {*}
 */
exports.format = function(){
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
    if(str == null) str = "null";
    str += "";
    var count = 1;
    if(needToFormat){
        var content = str.replace(/(%d)|(%i)|(%s)|(%f)|(%o)/g, function(world){
            if(args.length <= count) return world;
            var value = args[count++];
            if(world == "%d" || world == "%i"){
                return parseInt(value);
            }else{
                return value;
            }
        });
        for (var l_i = args.length; count < l_i; count++) {
            content += "    " + args[count];
        }
        return content;
    }else{
        for(var i = 1; i < l; ++i){
            var arg = args[i];
            arg = typeof arg == "object" ? JSON.stringify(arg) : arg;
            str += "    " + arg;
        }
        return str;
    }
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
};

exports.joinBlank = function(str, num){
    var l = str.length;
    if(l >= num) return str;
    for(var i = 0; i < num - l; ++i){
        str += " ";
    }
    return str;
};
