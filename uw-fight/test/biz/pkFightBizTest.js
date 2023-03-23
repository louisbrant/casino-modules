/**
 * Created by Administrator on 2015/5/27.
 */

var pkFightBiz = require("../../src/biz/pkFightBiz.js");
var PKMember = require("../../src/obj/PKMember.js");

 var fight = function(){
     var selfMember =  PKMember.createByMonsterId(544,true);
     //var enemyMember = PKMember.createByUser(userData2,false);
     var enemyMember = PKMember.createByMonsterId(525,false);
     var result =  pkFightBiz.fight(selfMember,enemyMember);
     console.log(JSON.stringify(result) );
 };

/************************************************************************************/

fight();