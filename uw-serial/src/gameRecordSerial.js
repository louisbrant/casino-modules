/**
 * Created by Administrator on 2015/8/22.
 */

var util = require("util");
var BaseSerial = require("./BaseSerial.js");

function GameRecordSerial(){
    BaseSerial.call(this);
    this.timeout = 5000;
    this.uKey = "GameRecord-";
};

util.inherits(GameRecordSerial,BaseSerial);
module.exports = new GameRecordSerial();