/**
 * Created by SmallAiTT on 2015/4/30.
 */
var clazz = require("clazz");
var strUtils = require("str-utils");
var fs = require("fs2");
var path = require("path2");

/**
 * 赋值属性。
 * @param old
 * @returns {*}
 */
function copyProp(old){
    if(!old) return old;
    var type = typeof old;
    if(type == "string" || type == "number" || type == "boolean") return old;
    if(old instanceof Array){
        var result = [];
        for (var i = 0, l_i = old.length; i < l_i; i++) {
            result[i] = copyProp(old[i]);
        }
    }else{
        var result = {};
        for (var key in old) {
            result[key] = copyProp(old[key]);
        }
    }
    return result;
}
/**
 * 将key转换为小写。
 * @param option
 * @param num
 * @returns {*}
 */
function changeKeyToLowerCase(option, num){
    if(num == 0) return option;
    if(option == null) return option;
    var type = typeof option;
    if(type == "string" || type == "number" || type == "boolean" || option instanceof Array) return option;
    num--;
    for (var key in option) {
        var value = option[key];
        delete option[key];
        option[key.toLowerCase()] = changeKeyToLowerCase(value, num);
    }
    return option;
}
module.exports = clazz.extends({
    config : null,
    name : null,

    ctor : function(){
        var self = this;
        self._super.apply(self, arguments);
        self.config = self.genConfig();
        //先初始化默认的plugin，目前就是默认提供了help。
        self.setPluginDir(path.join(__dirname, "../../plugin"));
    },

    /**
     * 获取到全局参数。
     * @param configPath
     * @param isToGlobal
     * @returns {*|boolean}
     */
    getGlobalConfig : function(configPath, isToGlobal){
        var cfg = this.config.global;
        if(!isToGlobal){
            cfg = copyProp(cfg);
        }
        if(fs.existsSync(configPath)){
            var content = fs.readFileSync(configPath).toString();
            content = JSON.parse(content);
            for (var key in content) {
                var opt = content[key];
                var type = typeof opt;
                if(type == "string" || type == "number" || type == "boolean" || opt instanceof Array || opt === null){
                    cfg[key] = opt;
                }else{
                    var oldOpt = cfg[key];
                    if(!oldOpt){
                        oldOpt = cfg[key] = {};
                    }
                    for (var key2 in opt) {
                        oldOpt[key2] = opt[key2];
                    }
                }
            }
        }
        cfg = changeKeyToLowerCase(cfg, 2);
        return cfg;
    },

    /**
     * 添加option配置。
     * @param configPath
     */
    addOptionConfig : function(configPath){
        var cfg = this.config.option;
        if(fs.existsSync(configPath)){
            var content = fs.readFileSync(configPath).toString();
            content = JSON.parse(content);
            for (var key in content) {
                var opt = content[key];
                var oldOpt = cfg[key];
                if(!oldOpt){
                    oldOpt = cfg[key] = {};
                }
                for (var key2 in opt) {
                    oldOpt[key2] = opt[key2];
                }
            }
            changeKeyToLowerCase(cfg, 1);
        }
    },

    /**
     * 添加plugin配置。
     * @param configPath
     */
    addPluginConfig : function(configPath){
        var config = this.config, cfg = config.plugin;
        if(fs.existsSync(configPath)){
            var content = fs.readFileSync(configPath).toString();
            content = JSON.parse(content);
            for (var key in content) {
                var opt = content[key];
                var oldOpt = cfg[key];
                if(!oldOpt){
                    oldOpt = cfg[key] = {};
                }
                for (var key2 in opt) {
                    oldOpt[key2] = opt[key2];
                }
            }
            changeKeyToLowerCase(cfg, 1);//只转换plugin name成小写
        }
        for (var key in cfg) {
            var pc = cfg[key];
            if(!pc) continue;
            if(pc.option) changeKeyToLowerCase(pc.option, 1);//只转换option name成小写
            if(pc.short) config.shortPluginNameMap[pc.short] = key;
        }
    },

    /**
     * 添加msg配置。
     * @param configPath
     */
    addMsgConfig : function(configPath){
        var msgConfig = this.config.msg;
        if(fs.existsSync(configPath)){
            var content = fs.readFileSync(configPath).toString();
            content = JSON.parse(content);
            for (var key in content) {
                msgConfig[key] = content[key];
            }
        }
    },

    /**
     * 生成配置信息。
     * @returns {{global: exports, msg: exports, plugin: exports, option: exports, pluginNameMap: {}}}
     */
    genConfig : function(){
        var config = {
            global : require("../../config/global"),
            msg : require("../../config/msg"),
            plugin : require("../../config/plugin"),
            option : require("../../config/option"),
            pluginNameMap : {},
            shortPluginNameMap : {}
        };
        changeKeyToLowerCase(config.global, 2);
        changeKeyToLowerCase(config.plugin, 2);
        changeKeyToLowerCase(config.option, 1);
        return config;
    },

    /**
     * 设置config目录。
     * @param configDir
     */
    setConfigDir : function(configDir){
        var self = this;
        if(configDir) {
            self.addPluginConfig(path.join(configDir, "plugin.json"));
            self.addOptionConfig(path.join(configDir, "option.json"));
            self.addMsgConfig(path.join(configDir, "msg.json"));
        }
    },

    /**
     * 通过路径添加一个插件。
     * @param filePath
     */
    addPluginByPath : function(filePath){
        if(path.isExtname(filePath, ".js")){
            this.config.pluginNameMap[path.basename(filePath, ".js").toLowerCase()] = filePath;
        }
    },
    /**
     * 设置插件目录。
     * @param pluginDir
     */
    setPluginDir : function(pluginDir){
        var files = fs.readdirSync(pluginDir);
        for (var i = 0, l_i = files.length; i < l_i; i++) {
            this.addPluginByPath(path.join(pluginDir, files[i]));
        }
    },

    /**
     * 根据消息码获取消息。
     * @param code
     * @param args
     * @returns {*}
     */
    getMsg : function(code){
        var self = this, msgConfig = self.config.msg;
        var msg = code;
        var tempMsg = msgConfig[code];
        if(tempMsg) {
            var arr = Array.prototype.slice.call(arguments, 1);
            arr.splice(0, 0, tempMsg);
            msg = strUtils.format.apply(strUtils, arr);
        }
        msg = msg.replace(/\\033/g, "\033");
        return msg;
    },

    getPluginName : function(name){
        name = name.toLowerCase();
        var pluginPath = this.config.pluginNameMap[name];
        if(!pluginPath){//找不到全名的命令
            name = this.config.shortPluginNameMap[name];
        }
        return name;
    },
    /**
     * 获取一个插件。
     * @param name
     * @returns {*}
     */
    getPlugin : function(name){
        try{
            var self = this;
            name = self.getPluginName(name);
            var pluginPath = self.config.pluginNameMap[name];
            if(!pluginPath) return null;
            var Plugin = require(pluginPath);
            var plugin = new Plugin();
            plugin.name = name;
            plugin.cmd = self;
            return plugin;
        }catch(e){
            console.trace(e);
            return null;
        }
    },

    /**
     * 执行插件。
     * @param cmdName
     * @param plugin
     * @param valueArr
     * @param option
     * @param onEnd
     * @returns {*}
     */
    execPlugin : function(cmdName, plugin, valueArr, option, onEnd){
        var self = this;
        try{
            var pluginName = plugin.name;
            if(typeof plugin == "string"){
                pluginName = plugin;
                plugin = self.getPlugin(plugin);
            }
            if(!plugin) return onEnd(self.getMsg("err.pluginNotFound", pluginName));
            plugin.exec(cmdName, valueArr, option, onEnd);
        }catch(e){
            onEnd(e);
        }
    }
});