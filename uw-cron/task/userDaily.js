var nodeXlsx = require('node-xlsx');
var fs = require('fs');
var async = require('async');
var uwData = require("uw-data");
var t_copy = uwData.t_copy;
var  userDao = require("uw-user").userDao;
var rechargeDao = require("uw-recharge").rechargeDao;

var getNewClient = function(host,port,user,password,database){
    var dbPool = require("uw-db").dbPool;
    var DbClient = require("uw-db").DbClient;
    var connCfg = {
        "name" : "uwCnn",
        "dbModule" : "mysql",
        "host" : host,
        "port" : port,
        "user" : user,
        "password" : password,
        "database" : database,
        "debug" : ["ComQueryPacket"]
    };
    var pool = dbPool.create(connCfg);
    var client = new DbClient(pool);
    return client;
};

//计算玩家每日数据
exports.calUserData = function(client,userId,cb){
    var newTime = new Date().toFormat("YYYY-MM-DD");
    async.parallel([
        function(cb1){
            userDao.select(client,{id:userId},function(err,userData) {
                if (err) return cb1(err);
                var countMap = "";
                var shopData = userData.shopData;
                var shop = "";
                for (var key in shopData) {
                    var shopTime = new Date(shopData[key][2]);
                    if (shopTime.toFormat("YYYY-MM-DD") == newTime) {
                        shop += shopData[key][0] + "(" + shopData[key][1] + ")、";
                    }
                }
                var copy = userData.copyData[0]||0;
                countMap = userData.id + "," +  userData.nickName + "," + userData.lvl + "," + copy + "," + shop + ",";
                cb1(null, countMap);
            });
        },
        function(cb1){
            var newTime1 = newTime.toString() + " 23:59:59";
            rechargeDao.list(client,  " userId = ? and rechargeTime between ? and ? ",[userId,newTime,newTime1],function(err,rechargeData) {
                if (err) return cb1(err);
                var cardTimeMap = "";
                var payCount = 0;
                var payNum = 0;
                var payObj = {};
                for (var i = 0; i < rechargeData.length; i++) {
                    payCount += 1;
                    payNum += rechargeData[i].payMoney;
                    if(!payObj[rechargeData[i].payMoney]){
                        payObj[rechargeData[i].payMoney] = 0;
                    }
                    payObj[rechargeData[i].payMoney] += 1;
                }
                var payData = "";
                for(var key in payObj){
                    payData += key + ":" + payObj[key] + "、";
                }
                if(payData == ""){
                    payData = 0;
                }
                cardTimeMap = payCount + "," +  payNum + "," + payData;
                cb1(null, cardTimeMap);
            });
        }
    ],function(err,results){
        if (err) return cb(err);
        var str = results[0] + results[1];
        var userdata = [];
        userdata = str.split(",");
        cb(null, userdata);
    });
};

exports.run = function(cfg){
    var client = getNewClient("10.137.209.254","3306","admin","UfwsG5Sada","war_school");
    var key = 1;
    var data = [["玩家ID","名字","等级","副本最终进度" ,"商店各个物品今日购买(总次数)","充值次数","充值总金额", "各充值档次数"]];
    userDao.listCols(client, "id",function(err,userList){
        if (err) return console.log(err);
        async.map(userList,function(userData,cb1){
            var userId = userData.id;
            exports.calUserData(client,userId,function(err,calUserData){
                data[key] = calUserData;
                key += 1;
                cb1();
            });
        },function(err,listColsData){
            if (err) return console.log(err);
            var newTime = new Date().toFormat("YYYY-MM-DD");
            var buffer = nodeXlsx.build([{name: "mySheetName", data: data}]);
            var resultFN = './logs/BILogs/' + newTime.toString() + '.xlsx';
            fs.writeFile(resultFN, buffer, 'binary', function (err) {
                if (!err) {
                    console.log('保存文件成功!');
                    console.log("一共[%s]条数据!",key);
                } else {
                    console.log(err);
                }
            });
        });
    });
};
//exports.run();
exports.runOnce = function(){
    exports.run();
};