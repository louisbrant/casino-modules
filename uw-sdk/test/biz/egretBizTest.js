var core4Test = require("uw-test").core4Test;
var egretBiz = require("../../src/biz/egret/egretBiz");
var cb = core4Test.cb4Test;
var trans = core4Test.trans;
var client = core4Test.uwClient;

function login(){
    egretBiz.login({token: "5533354F43525252636B46464951684754304265654177454151494A4156554A565145464341494142464A7643514D4A416D397641483934426C466251515A434146526A6231646E5A57394B596E4E63586D4A4B61416C655A6D705852414D455857563556486F4163554258", serverId: 1},cb);
}

function getFriendList(){
    egretBiz.getFriendList({id: "161abfd40f44e4ca7a0df2a770fb8fd9"},cb);
}
/**********************************************************/
//login();
getFriendList();
