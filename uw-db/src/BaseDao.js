/**
 * Desc: dao基类。
 * @author zheng.xiaojun
 * @constructor
 */
function BaseDao(){
    this.Entity = null;
    this.castCols = {};

    this.insert = function(client, args, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.splice(0, 1, this.Entity);
        var data = arr[1];
        var castCols = this.castCols;
        if(castCols){
            var tempData = arr[1] = {};
            for (var key in data) {
                tempData[key] = data[key];
            }
            for (var key in castCols) {
                var value = tempData[key];
                if(value && typeof value != "string"){
                    tempData[key] = JSON.stringify(value);
                }
            }
        }
        client.insert.apply(client, arr);
    };

    this.insertList = function(client, args, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.splice(0, 1, this.Entity);
        client.insertList.apply(client, arr);
    };

    this.update = function(client, values, cnd, args, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.splice(0, 1, this.Entity);
        var data = arr[1];
        var castCols = this.castCols;
        if(typeof values == "object" && castCols){
            var tempData = arr[1] = {};
            for (var key in data) {
                tempData[key] = data[key];
            }
            for (var key in castCols) {
                var value = tempData[key];
                if(value && typeof value != "string"){
                    tempData[key] = JSON.stringify(value);
                }
            }
        }
        client.update.apply(client, arr);
    };
    this.select = function(client, cnd, args, cb){
        var self = this;
        var arr = Array.prototype.slice.apply(arguments);
        var cb = arr[arr.length -1];
        arr[arr.length -1] = function(err, data){
            if(err) return cb(err);
            var castCols = self.castCols;
            if(data && castCols){
                for (var key in castCols) {
                    var value = data[key];
                    if(value){
                        //todo oldma 遇到单倍数正斜线会报错,所以double一下
                        value = value.replace(/\\/g,'\\\\');
                        data[key] = JSON.parse(value);
                    }else{
                        var castType = castCols[key];
                        if(castType == BaseDao.CAST_ARRAY) value = [];
                        else if(castType == BaseDao.CAST_OBJECT) value = {};
                        data[key] = value;
                    }
                }
            }
            cb(null, data);
        }
        arr.splice(0, 1, this.Entity);
        client.select.apply(client, arr);
    };
    this.count = function(client, cnd, args, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.splice(0, 1, this.Entity);
        client.count.apply(client, arr);
    };

    this.query = function(client, cnd, args, cb){
        var self = this;
        var arr = Array.prototype.slice.apply(arguments);
        var cb = arr[arr.length -1];
        arr[arr.length -1] = function(err, dataList){
            if(err) return cb(err);
            var castCols = self.castCols;
            if(castCols){
                for (var i = 0, li = dataList.length; i < li; i++) {
                    var data = dataList[i];
                    for (var key in castCols) {
                        var value = data[key];
                        if(value){
                            //todo oldma 遇到单倍数正斜线会报错,所以double一下
                            value = value.replace(/\\/g,'\\\\');
                            data[key] = JSON.parse(value);
                        }else{
                            var castType = castCols[key];
                            if(castType == BaseDao.CAST_ARRAY) value = [];
                            else if(castType == BaseDao.CAST_OBJECT) value = {};
                            data[key] = value;
                        }
                    }
                }
            }
            cb(null, dataList);
        }
        arr.splice(0, 1);
        client.query.apply(client, arr);
    };

    this.list = function(client, cnd, args, cb){
        var self = this;
        var arr = Array.prototype.slice.apply(arguments);
        var cb = arr[arr.length -1];
        arr[arr.length -1] = function(err, dataList){
            if(err) return cb(err);
            var castCols = self.castCols;
            if(castCols){
                for (var i = 0, li = dataList.length; i < li; i++) {
                    var data = dataList[i];
                    for (var key in castCols) {
                        var value = data[key];
                        if(value){
                            //todo oldma 遇到单倍数正斜线会报错,所以double一下
                            value = value.replace(/\\/g,'\\\\');
                            data[key] = JSON.parse(value);
                        }else{
                            var castType = castCols[key];
                            if(castType == BaseDao.CAST_ARRAY) value = [];
                            else if(castType == BaseDao.CAST_OBJECT) value = {};
                            data[key] = value;
                        }
                    }
                }
            }
            cb(null, dataList);
        }
        arr.splice(0, 1, this.Entity);
        client.list.apply(client, arr);
    };
    this.del = function(client, cnd, args, cb){
        var arr = Array.prototype.slice.apply(arguments);
        arr.splice(0, 1, this.Entity);
        client.del.apply(client, arr);
    };


    this.selectCols = function(client,cols, cnd, args, cb){
        var self = this;
        var arr = Array.prototype.slice.apply(arguments);
        var cb = arr[arr.length -1];
        arr[arr.length -1] = function(err, data){
            if(err) return cb(err);
            var castCols = self.castCols;
            if(data && castCols){
                for (var key in castCols) {
                    var value = data[key];
                    if(value){
                        //todo oldma 遇到单倍数正斜线会报错,所以double一下
                        value = value.replace(/\\/g,'\\\\');
                        data[key] = JSON.parse(value);
                    }else{
                        var castType = castCols[key];
                        if(castType == BaseDao.CAST_ARRAY) value = [];
                        else if(castType == BaseDao.CAST_OBJECT) value = {};
                        data[key] = value;
                    }
                }
            }
            cb(null, data);
        }
        arr.splice(0, 1, this.Entity);
        client.selectCols.apply(client, arr);
    };
    this.listCols = function(client,cols, cnd, args, cb){
        var self = this;
        var arr = Array.prototype.slice.apply(arguments);
        var cb = arr[arr.length -1];
        arr[arr.length -1] = function(err, dataList){
            if(err) return cb(err);
            var castCols = self.castCols;
            if(castCols){
                for (var i = 0, li = dataList.length; i < li; i++) {
                    var data = dataList[i];
                    for (var key in castCols) {
                        var value = data[key];
                        if(value){
                            //todo oldma 遇到单倍数正斜线会报错,所以double一下
                            value = value.replace(/\\/g,'\\\\');
                            data[key] = JSON.parse(value);
                        }else{
                            var castType = castCols[key];
                            if(castType == BaseDao.CAST_ARRAY) value = [];
                            else if(castType == BaseDao.CAST_OBJECT) value = {};
                            data[key] = value;
                        }
                    }
                }
            }
            cb(null, dataList);
        }
        arr.splice(0, 1, this.Entity);
        client.listCols.apply(client, arr);
    };
}
BaseDao.CAST_ARRAY = "1";
BaseDao.CAST_OBJECT = "2";

module.exports = BaseDao;