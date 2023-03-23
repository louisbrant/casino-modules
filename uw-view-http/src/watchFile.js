/**
 * Created by Administrator on 2015/4/11.
 */
var fs = require("fs");
var path = require("path");
var fileHelper = require("../src/fileHelper");

fs.watch(path.join(__dirname, '../config/') , function (event, filename) {
    if(event=="change"){
        fileHelper.resetData(filename);
    }
});