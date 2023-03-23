/**
 * Created by Administrator on 2015/8/22.
 */

var util = require("util");
var BaseSerial = require("./BaseSerial.js");

function TaskSerial(){
    BaseSerial.call(this);
    this.timeout = 5000;
    this.uKey = "taskSerial-";
};

util.inherits(TaskSerial,BaseSerial);
module.exports = new TaskSerial();