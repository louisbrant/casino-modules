/**
 * Created by SmallAiTT on 2015/4/27.
 */
var cmdJs = require("../../index");

module.exports = cmdJs.CmdPlugin.extends({
    run : function(value, option, onEnd){
        console.log("testPlugin--value--->", value);
        console.log("testPlugin--option--->");
        console.log(option);
        console.log("config for cmd--->");
        console.log(this.cmd.config);
        onEnd();
    }

});
