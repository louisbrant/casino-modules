/**
 * Created by SmallAiTT on 2015/4/29.
 */
var cmdJs = require("../index.js");
cmdJs.init({});
cmdJs.execPlugin("test", "help", [], {}, function(err){
    if(err) {
        console.log(err);
    }
});