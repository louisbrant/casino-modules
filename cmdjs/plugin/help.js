/**
 * Created by SmallAiTT on 2015/4/27.
 */
var cmdJs = require("../index");

module.exports = cmdJs.CmdPlugin.extends({
    run : function(value, option, onEnd){
        var self = this;
        var index = value.indexOf("help");
        if(index >= 0) value.splice(index, 1);

        var pluginConfig = self.cmd.config.plugin;

        if(value.length > 0){
            for (var i = 0, l_i = value.length; i < l_i; i++) {
                self.log(value[i]);
            }
        }else{
            for (var key in pluginConfig) {
                self.log(key);
            }
        }
        onEnd();
    },

    log : function(pluginName){
        pluginName = pluginName.toLowerCase();
        var self = this, cmd = self.cmd, config = cmd.config,
            optionConfig = config.option, pluginConfig = config.plugin, pluginNameMap = config.pluginNameMap;
        var pc = pluginConfig[pluginName];
        if(pluginNameMap[pluginName]){
            var desc = pc.desc || cmd.getMsg("info.noPluginDesc");
            var pluginStr = pluginName;
            if(pc.short) pluginStr += "(" + pc.short + ")";
            cmdJs.log4Helper(pluginStr, null, desc);
            var optCfg = pc.option;
            if(optCfg){
                console.log();//让输出多一行
                for (var optionName in optCfg) {
                    var cfg = optCfg[optionName];
                    if(!cfg) continue;
                    var ref = cfg.ref;
                    if(ref){
                        ref = ref.toLowerCase();
                        cfg = optionConfig[ref];
                    }
                    desc = cfg.desc || cmd.getMsg("info.noOptionDesc");

                    var optionNameStr = "--" + optionName;
                    if(cfg.short) optionNameStr += "(-" + cfg.short + ")";
                    cmdJs.log4Helper("", optionNameStr, desc);
                    console.log();//让输出多一行
                }
            }
            console.log("----------------------------\n");
        }
    }

});
