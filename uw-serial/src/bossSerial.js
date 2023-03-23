/**
 * Created by Administrator on 2015/8/22.
 */

var util = require("util");
var BaseSerial = require("./BaseSerial.js");

function BossSerial(){
    BaseSerial.call(this);
    this.timeout = 5000;
    this.uKey = "bossSerialSerial-";
};

util.inherits(BossSerial,BaseSerial);
module.exports = new BossSerial();