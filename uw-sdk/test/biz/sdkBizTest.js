var core4Test = require("uw-test").core4Test;
var sdkBiz = require("../../src/biz/sdkBiz");
var sdkUtils = require("../../src/biz/sdkUtils");
var c_payInfo = require("uw-data").c_payInfo;
var cb = core4Test.cb4Test;
var trans = core4Test.trans;
var client = core4Test.uwClient;

function checkPay(){
   /* var payData = c_payInfo[7];
    var goodsId = payData[10002][0];*/
    var orderData = {"orderId":"4233644858784664464568486331704D45773D3D","id":"679677add560e02faa9a91ced279e62a","money":"6","ext":"140","time":"1432218257","serverId":"1","goodsId":"1","goodsNumber":"1","sign":"414ef7ea218fe8e3db59f32f792f7218"};
    sdkBiz.checkPay(orderData,function(err,data){
        console.log(err,data);
    });
 }

function testSha1(){
    //http://zzxy.modo7game.com/xhb.html?game_key=d2c8e78dea15dbaf&timestamp=1437720255&nonce=sUPAcxy0XNthDaOT&login_type=1&ticket=v2KNj6AUV8pJSrPt&game_url=http%3A%2F%2Fgc.hgame.com%2Fhome%2Fgame%2Fappid%2F100021%2Fgameid%2F100130%3Fbar%3D%26from%3D&signature=64e8c6410322a28c40fac4a12b47856973cc3976
    var params = {
        game_key:"50f9bc36643e738e",
        game_url:"http%3A%2F%2Fgc.hgame.com%2Fhome%2Fgame%2Fappid%2F100021%2Fgameid%2F100130%3Fbar%3D%26from%3D",
        login_type:"1",
        nonce:"sUPAcxy0XNthDaOT",
        ticket:"v2KNj6AUV8pJSrPt",
        timestamp:"1437720255"
    }
    //signature:"64e8c6410322a28c40fac4a12b47856973cc3976"
   var params = sdkUtils.getSha1Params("9fb00d4662c841cbc214f3f0d460a130",params);
    console.log(params);
/*
    game_area=10004001&game_key=d2c8e78dea15dbaf&game_level=2&game_orderno=19&nonce=oczycp&notify_url=http://112.124.106.143:15801/pay/hgame.html&open_id=606305789&subject=200钻石&timestamp=1437740334833&total_fee=2.00&signature=37de75361a16d572ec82c564b61c26a5021848e6
*/

    var body ={"description":"","game_key":"d2c8e78dea15dbaf","game_orderno":"25","orderno":"20150724205509225b757e0901101059","signature":"a1c014c35699ad3ff497074f463b907076b6e1fe","subject":"200钻石","total_fee":"2.00"}
}
/**********************************************************/

testSha1();
