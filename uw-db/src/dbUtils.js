var fs = require("fs");
var mysql = require('mysql');

/**
 * Desc: 条件获取的方法。
 * @author zheng.xiaojun
 *
 * @param cnd
 * @param args
 * @param cb
 * @returns {*}
 */
function getCnd(cnd, args, cb){
    if(arguments.length > 3) return null;
    if(arguments.length == 1){
        return {where : " where 1 = 1 ", args : [], cb : arguments[0]}
    }else if(arguments.length == 2){
        var info = {args : [], cb : args};
        args = cnd;
        cnd = " where 1 = 1 ";
        if(args){
            for (var key in args) {
                if(!key || key == "_orderBy" || typeof args[key] == "function") continue;
                cnd += " and " + key + " = ? ";
                info.args.push(args[key]);
            }
            var orderByArr = args._orderBy;
            if(orderByArr && orderByArr.length > 0){
                cnd += " order by "
                for (var i = 0, li = orderByArr.length; i < li; i++) {
                    cnd += " " + orderByArr[i] + " ";
                    if(i < li -1) cnd += ","
                }
            }
        }
        info.where = cnd;
        return info;
    }
    cnd = cnd || "";
    if(cnd.trim() != "" && cnd.search(/^[\s]*where[\s]/) != 0){
        cnd = " where " + cnd
    }
    return {where : cnd, args : args, cb : cb};
};
/**
 * Desc: 插入操作。
 * @author zheng.xiaojun
 *
 * @param poClass
 * @param args
 * @param cb
 */
function insert(poClass, args, cb){
    var tableName = typeof poClass == "string" ? poClass : poClass.tableName;
    var sqlStr = "insert into " + tableName + " set ? ";
    this.query(sqlStr, args, cb);
};

/**
 * 批量插入
 * @param poClass
 * @param entityList
 * @param cb
 * @returns {*}
 */
function insertList (poClass,entityList,cb){
    if(entityList.length<=0) return cb(null);
    var Entity = poClass;
    var strCols = "";
    var entity = new Entity();
    for (var key in entity) {
        if (key.toString() == "id") continue;
        strCols += "" + key + ",";
    }
    strCols = strCols.substr(0,strCols.length-1);
    var values = "";
    for (var i = 0; i < entityList.length; i++) {
        var locEntity = entityList[i];
        values+="(";
        for (var key in locEntity) {
            if (key.toString() == "id") continue;
            var locValue = locEntity[key];
            if(locValue==null){
                values += "NULL,";
            }else{
                if(locValue  instanceof Date){
                    locValue = locValue.toFormat("YYYY-MM-DD HH24:MI:SS");
                }
                if(typeof locValue == "object"){
                    locValue = JSON.stringify(locValue);
                }
                values += "" + mysql.escape(locValue)  + ",";
            }

        }
        values = values.substr(0,values.length-1);
        values+="),";
    }
    values = values.substr(0,values.length-1);
    var sqlStr = "insert into "+Entity.tableName+" ("+strCols+") values "+values+" ";
    this.query(sqlStr, [],  cb);
};

/**
 * Desc: 更新操作。
 * @author zheng.xiaojun
 *
 * @param poClass
 * @param values
 * @param cnd
 * @param args
 * @param cb
 */
function update(poClass, values, cnd, args, cb){
    var tableName = typeof poClass == "string" ? poClass : poClass.tableName;
    var cnd = getCnd.apply(this, Array.prototype.slice.call(arguments, 2));
    var cols = "";
    var tempArr = [];
    if(typeof values == "string"){
        cols = values;
    }else{
        for (var key in values) {
            if(!key || typeof values[key] == "function") continue;
            cols += key + " = ?,"
            tempArr.push(values[key]);
        }
        cols = cols.substring(0, cols.length - 1);//去除最有一个逗号
    }

    var sqlStr = "update " + tableName + " set " + cols + cnd.where;
    this.query(sqlStr, tempArr.concat(cnd.args), cnd.cb);
};
/**
 * Desc: 获取单条数据操作。
 * @author zheng.xiaojun
 *
 * @param poClass
 * @param cnd
 * @param args
 * @param cb
 */
function select(poClass, cnd, args, cb){
    var tableName = typeof poClass == "string" ? poClass : poClass.tableName;
    var cnd = getCnd.apply(this, Array.prototype.slice.call(arguments, 1));
    var strSql = "select * from " + tableName + cnd.where +" limit 1";
    this.query(strSql, cnd.args, function (err, result) {
        err ? cnd.cb(err, null) : cnd.cb(null, result.length > 0 ? result[0] : null);
    });
};

/**
 * 根据条件计算数量
 * @param poClass
 * @param cnd
 * @param args
 * @param cb
 */
function count(poClass, cnd, args, cb){
    var tableName = typeof poClass == "string" ? poClass : poClass.tableName;
    var cnd = getCnd.apply(this, Array.prototype.slice.call(arguments, 1));
    var strSql = "select count(1) as count from " + tableName + cnd.where +" limit 1";
    this.query(strSql, cnd.args, function (err, result) {
        err ? cnd.cb(err, null) : cnd.cb(null, result.length > 0 ? result[0].count : 0);
    });
};

/**
 * Desc: 获取单条某些列数据操作。
 * @author mxs
 * @param poClass
 * @param cols
 * @param cnd
 * @param args
 * @param cb
 */
function selectCols(poClass,cols, cnd, args, cb){
    var tableName = typeof poClass == "string" ? poClass : poClass.tableName;
    var cnd = getCnd.apply(this, Array.prototype.slice.call(arguments, 2));
    var strCols = cols instanceof Array ? cols.join(",") : cols;
    var strSql = "select "+strCols+" from " + tableName + cnd.where +" limit 1";
    this.query(strSql, cnd.args, function (err, result) {
        err ? cnd.cb(err, null) : cnd.cb(null, result.length > 0 ? result[0] : null);
    });
};
/**
 * Desc: 删除操作。
 * @author zheng.xiaojun
 *
 * @param poClass
 * @param cnd
 * @param args
 * @param cb
 */
function del(poClass, cnd, args, cb){
    var tableName = typeof poClass == "string" ? poClass : poClass.tableName;
    var cnd = getCnd.apply(this, Array.prototype.slice.call(arguments, 1));
    var sql = "delete from " + tableName + cnd.where;
    this.query(sql, cnd.args || [], cnd.cb);
};
/**
 * Desc: 获取列表操作。
 * @author zheng.xiaojun
 *
 * @param poClass
 * @param cnd
 * @param args
 * @param cb
 */
function list(poClass, cnd, args, cb){
    var tableName = typeof poClass == "string" ? poClass : poClass.tableName;
    var cnd = getCnd.apply(this, Array.prototype.slice.call(arguments, 1));
    var strSql = "select * from	" + tableName + cnd.where;
    this.query(strSql, cnd.args, cnd.cb);
};

/**
 * Desc: 获取列表操作。
 * @author mxs
 * @param cols
 * @param poClass
 * @param cnd
 * @param args
 * @param cb
 */
function listCols(poClass,cols, cnd, args, cb){
    var tableName = typeof poClass == "string" ? poClass : poClass.tableName;
    var cnd = getCnd.apply(this, Array.prototype.slice.call(arguments, 2));
    var strCols = cols instanceof Array ? cols.join(",") : cols;
    var strSql = "select "+strCols+" from " + tableName + cnd.where;
    this.query(strSql, cnd.args, cnd.cb);
};

var sqlPool = {};
var REG_SUB = /@SUB_START(([\s][\w\W]*[\s])|([\s]))@SUB_END/gi;
function getSql(filePath){
    var sql = sqlPool[filePath];
    if(sql) return sql;
    var sql = fs.readFileSync(filePath).toString();
    var subContent = REG_SUB.exec(sql);
    if(subContent){
        subContent = subContent[0].substring(10, subContent[0].length - 8).trim();
        sql = sql.replace(REG_SUB, "");
        var arr = subContent.split("\n");
        for (var i = 0, li = arr.length; i < li; i++) {
            var itemi = arr[i].trim();
            if(itemi == "") continue;
            var index = itemi.indexOf("=");
            if(index < 0) throw "SUB for sql error!";
            var key = itemi.substring(0, index).trim();
            var value = itemi.substring(index + 1).trim();
            var regExp = new RegExp("\\[\\%" + key + "\\%\\]", "gi");
            sql = sql.replace(regExp, value);
        }
    }
    sqlPool[filePath] = sql;
    return sql;
};
/**
 * Desc: 通过sqlCode进行操作。
 * @param code
 * @param args
 * @param cb
 */
function queryByCode(code, args, cb){
    var sql = getSql(code);
    this.query(sql, args, cb);
}

/**
 * Desc: 为对象初始化基础的数据库操作功能。
 * @author zheng.xiaojun
 *
 * @param target
 */
function initDbOper(target){
    target.insert = target.insert ? target.insert : insert;
    target.insertList = target.insertList ? target.insertList : insertList;
    target.update = target.update ? target.update : update;
    target.select = target.select ? target.select : select;
    target.del = target.del ? target.del : del;
    target.list = target.list ? target.list : list;
    target.count = target.count ? target.count : count;

    target.selectCols = target.selectCols ? target.selectCols : selectCols;
    target.listCols = target.listCols ? target.listCols : listCols;
    target.queryByCode = target.queryByCode ? target.queryByCode : queryByCode;
}

exports.getCnd = getCnd;
exports.initDbOper = initDbOper;