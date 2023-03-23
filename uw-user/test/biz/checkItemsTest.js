/**
 * Created by Administrator on 2015/6/29.
 */

var c_prop = require("uw-data").c_prop;
var uwClient = require("uw-db").uwClient;
var activityDao = require("uw-activity").activityDao;
var mailDao = require("uw-mail").mailDao;
var couponDao = require("uw-coupon").couponDao;
var async = require("async");

var checkItem = function(){
    /*3，活动
    4，邮件
    5，兑换码*/
    async.parallel([
        function(cb1){
            _checkActivity(cb1)
        },
        function(cb1){
            _checkMail(cb1)
        },
        function(cb1){
            cb1();
            //_checkCoupon(cb1)
        }
    ],function(err,data){
        if(err) console.log(err);
        console.log("check item finish!");
    });

};

var _checkActivity = function(cb){
    activityDao.list(uwClient," 1=1 ",[],function(err,datalist){
        if(err) return cb(err);
        async.map(datalist,function(locData,cb1){
            var itemsArr = locData.items;
            var newArr = [];
            for(var i = 0;i<itemsArr.length;i++){
                var locItems = itemsArr[i];
                locItems = _calOldItems(locItems);
                newArr.push(locItems);
            }

            activityDao.update(uwClient,{items:newArr},{id:locData.id},cb1);
        },cb);

    });
};

var _checkMail = function(cb){
    mailDao.list(uwClient," 1=1 ",[],function(err,datalist){
        if(err) return cb(err);
        async.map(datalist,function(locData,cb1){
            locData.items = _calOldItems(locData.items);
            mailDao.update(uwClient,{items:locData.items},{id:locData.id},cb1);
        },cb);

    });
};

var _checkCoupon = function(cb){
    couponDao.list(uwClient," 1=1 ",[],function(err,datalist){
        if(err) return cb(err);
        async.map(datalist,function(locData,cb1){
            locData.items = _calOldItems(locData.items);
            couponDao.update(uwClient,{items:locData.items},{id:locData.id},cb1);
        },cb);

    });
};

//校验旧数据
var _calOldItems = function(oldItems){
    if(!oldItems) return {};
    //{hero:{"id":num,..},diamond:100,wipeItem:100}
    if(oldItems.hero){
        for(var key in oldItems.hero){
            var locId = parseInt(key);
            var locNum = parseInt(oldItems.hero[key]) ;
            oldItems[locId] = locNum;
        }
    }
    if(oldItems.diamond){
        oldItems[c_prop.spItemIdKey.diamond] = oldItems.diamond;
    }
    if(oldItems.wipeItem){
        //得到扫荡券
        oldItems[c_prop.spItemIdKey.wipeItem] = oldItems.wipeItem;
    }
    delete oldItems.hero;
    delete oldItems.diamond;
    delete oldItems.wipeItem;
    return oldItems;
};

/*************************************************************/
checkItem();

//console.log(_calOldItems({"hero":{"1":100,"3":50,"9":200,"13":5},"diamond":100,"wipeItem":100}));