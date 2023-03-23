var ttDb = require("../index");


var trans = ttDb.uwTrans;
trans._isTest = true;

function myDao1(ts, a, b, cb){
    console.log("myDao1->" + a + "  " + b);
    ts.query("update uw_user set name = ? where id = ?", ["N1", 1], function(err, results){
        err ? cb(err) : cb(null, results);
    });
}
function myDao2(ts, a, b, cb){
    console.log("myDao2->" + a + "  " + b);
    ts.update("uw_user1", {name : "N2"}, {id : 2}, function(err, results){
        err ? cb(err) : cb(null, results);
    });
}

function myBiz(ts, a, b, cb){
    console.log("myBiz");
    myDao1(ts, a, b, function(err, results){
        if(err) return cb(err);
        myDao2(ts, a, b, cb);
    });
};

function callBiz(a, b, cb){
    trans.exec(myBiz, arguments);
};

callBiz("a", 1, function(err, t1, a, b){
    err ? console.error(err) : console.log("Success!");
});


