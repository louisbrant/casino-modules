/**
 * Created by John on 2016/5/30.
 */
var uwData = require("uw-data");
var c_game = uwData.c_game;
var c_prop = uwData.c_prop;
var async = require("async");
var exports = module.exports;
var sysRedEnvelopeDao = null;
var redEnvelopBiz = null;
var checkRequire = function() {
    sysRedEnvelopeDao = require("../dao/sysRedEnvelopeDao.js");
    redEnvelopBiz = require("./redEnvelopeBiz.js");
}

exports.updateSysRedEnvelope = function(client, cb) {
    checkRequire();
    sysRedEnvelopeDao.list(client, {isDeal:0}, function(err, sysList) {
        if (err) return cb(err);
        async.mapLimit(sysList, 50, function (redData, cb1) {
            //function(client,userId,type,spItemId,amount,personNum,wish,cb)
            redEnvelopBiz.sendRedEnvelope(client, redData.userId, redData.redType, redData.spItemId, redData.amount, redData.limitZone, redData.wish, redData.sendName,redData.viewAmount,redData.guildId,function(err, data){
                if(err) console.log(err);
                //无论对错都状态
                var update = {
                    isDeal: 1
                };
                sysRedEnvelopeDao.update(client, update, {id:redData.id},cb1);
            })
        }, function (err, mapData) {
            if(err) return cb(err);
            cb(null);
        });
    });
};

/*if(require.main == module){
    checkRequire();
    var client = require("uw-db").uwClient;
    var redData = {
        userId:0,
        redType:3,
        spItemId:200,
        amount: 10000,
        limitZone:[1,4],
        wish:"dsfdsdf",
        sendName:"啦啦德玛西亚",
        viewAmount:89,
        guildId:0
    };
    redEnvelopBiz.sendRedEnvelope(client, redData.userId, redData.redType, redData.spItemId, redData.amount, redData.limitZone, redData.wish, redData.sendName,redData.viewAmount,redData.guildId,function(err, data){
        if(err) console.log(err);
        //无论对错都状态
        var update = {
            isDeal: 1
        };
    })
}*/
