/**
 * Created by Administrator on 14-1-5.
 */
var core4Test = require("uw-test").core4Test;
var dao = require("../../src/dao/equipDao");
var cb = core4Test.cb4Test;
var trans = core4Test.trans;
var uwClient = core4Test.uwClient;

function insertByValues(){
    dao.insertByValues(uwClient,  [[1,2],[1,1]], cb);
};
//++++++++++++++++++++++++Run Test+++++++++++++++++++++++

insertByValues();
