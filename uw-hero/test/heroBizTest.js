/**
 * Created by Administrator on 2015/10/26.
 */

var heroBiz = require("../src/biz/heroBiz");
var uwClient = require("uw-db").uwClient;
var calPropAndCombat = function(){
    heroBiz.calPropAndCombat(uwClient,19,function(err,dataList){
        //console.log(err,dataList);
    });
};

/*
11344 0 488
11344 0 528
11344 0 408
*/

/*
34027 232122 4872
26884 232122 624
26301 232122 2984
*/

/*****************************************************************************/
calPropAndCombat();