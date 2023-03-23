/**
 * Created by Administrator on 2015/8/22.
 */

var gameRecordSerial = require("../src/gameRecordSerial.js");

gameRecordSerial.add("a",function(cb1){
    console.log("a1");
    setTimeout(function(){
        cb1();
    },1000);
});

gameRecordSerial.add("a",function(cb1){
    console.log("a2");
    cb1();
});

gameRecordSerial.add("b",function(cb1){
    console.log("b1");
    cb1();
});

gameRecordSerial.add("a",function(cb1){
    console.log("a3");
    cb1();
});

gameRecordSerial.add("b",function(cb1){
    setTimeout(function(){
        console.log("b2");
        cb1();
    },1000);
});

gameRecordSerial.add("a",function(cb1){
    console.log("a4");
    cb1();
});