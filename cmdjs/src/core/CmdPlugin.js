/**
 * Created by SmallAiTT on 2015/4/27.
 */
var clazz = require("clazz");
var strUtils = require("str-utils");

var Plugin = clazz.extends({
    name : null,
    cmd : null,
    pluginConfig: null,
    optionConfig:null,
    exec : function(cmdName, valueArr, option, onEnd){
        var self = this;
        var value = self.getValue(valueArr);
        var opt = self.getOption(option);
        self.run(value, opt, onEnd);
    },
    getValue : function(valueArr){
        var self = this, cmd = self.cmd, name = self.name,
            config = cmd.config, pluginConfig = config.plugin;
        var pc = pluginConfig[self.name];
        var cfg = pc.value;
        if(!cfg){
            if(valueArr.length > 0) throw cmd.getMsg("err.pluginValue", name);
            return null;
        }
        var type = cfg.type;
        var l = valueArr.length;
        if(type == "none" && l > 0) throw cmd.getMsg("err.pluginValue", name);
        if(
            (l != 1 && (cfg["default"] == null) && (type == "*" || type == "string" || type == "number"))
            || (l != 0 && type == "none")
            || (type == "array" && cfg.length != null && cfg.length != l)
        ){
            throw cmd.getMsg("err.pluginValueCount", name);
        }
        var value;
        switch (type){
            case "*":
                if(l == 1){
                    var v = value = valueArr[0];
                    if(v && v.match(strUtils.NUM_EXP)){
                        if(v.indexOf(".") >= 0) value = parseFloat(v);
                        else value = parseInt(v);
                    }else if(v == null){
                        value = cfg["default"];
                    }
                }
                break;
            case "string":
                if(l == 1){
                    value = valueArr[0];
                }
                if(value == null) value = cfg["default"];
                break;
            case "number":
                if(l == 1){
                    var v = valueArr[0];
                    if(v && v.match(strUtils.NUM_EXP)){
                        if(v.indexOf(".") >= 0) value = parseFloat(v);
                        else value = parseInt(v);
                    }else if(v == null){
                        value = cfg["default"];
                    }else{
                        throw cmd.getMsg("err.pluginValueType", name, type);
                    }
                }
                break;
            case "array":
                value = valueArr;
                value = value || cfg["default"] || [];
                break;
        }
        return value;
    },
    getOption : function(option){
        var self = this, cmd = self.cmd, name = self.name,
            config = cmd.config, pluginConfig = config.plugin, optionConfig = config.option;
        var opt = {};
        var pc = pluginConfig[this.name];
        var oc = pc.option || {};
        for (var key in option) {
            var valueArr = option[key] || [];
            var cfg = oc[key];
            if(!cfg){
                throw cmd.getMsg("err.optionNotFound", name, key);
            }
            var ref = cfg.ref;
            if(ref){
                ref = ref.toLowerCase();
                cfg = optionConfig[ref];
                if(!cfg){
                    throw cmd.getMsg("err.optionNotFound", name, key + "->globalOption." + ref);
                }
            }
            var type = cfg.type || "*";
            var l = valueArr.length;
            if(
                (l != 1 && (cfg["default"] == null) && (type == "*" || type == "string" || type == "number"))
                || (l != 0 && type == "none")
                || (type == "array" && cfg.length != null && cfg.length != l)
            ){
                throw cmd.getMsg("err.optionCount", name, key);
            }
            switch (type){
                case "*":
                    if(l == 1){
                        var v = opt[key] = valueArr[0];
                        if(v && v.match(strUtils.NUM_EXP)){
                            if(v.indexOf(".") >= 0) opt[key] = parseFloat(v);
                            else opt[key] = parseInt(v);
                        }
                    }
                    break;
                case "string":
                    if(l == 1){
                        opt[key] = valueArr[0];
                    }
                    break;
                case "number":
                    if(l == 1){
                        var v = valueArr[0];
                        if(v && v.match(strUtils.NUM_EXP)){
                            if(v.indexOf(".") >= 0) opt[key] = parseFloat(v);
                            else opt[key] = parseInt(v);
                        }else{
                            throw cmd.getMsg("err.optionType", name, key, type);
                        }
                    }
                    break;
                case "array":
                    opt[key] = valueArr;
                    break;
                case "none":
                    opt[key] = true;
                    break;
            }
        }

        for (var key in oc) {
            var cfg = oc[key];
            if(!cfg) continue;
            if(opt[key] == null){
                var ref = cfg.ref;
                if(ref){
                    ref = ref.toLowerCase();
                    cfg = optionConfig[ref];
                    if(!cfg){
                        throw cmd.getMsg("err.optionNotFound", name, key + "->globalOption." + ref);
                    }
                }
                var defaultValue = cfg["default"];
                var required = cfg["required"];
                if(required && defaultValue == null){
                    throw cmd.getMsg("err.optionRequired", name, key);
                }
                opt[key] = defaultValue;
            }
        }
        return opt;
    },

    run : function(value, option, onEnd){
        //TODO 具体的实现
    }
});

var exports = module.exports = Plugin;