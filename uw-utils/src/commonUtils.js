/**
 * Created by Administrator on 2014/4/24.
 */
 var c_game = require("uw-data").c_game;
var commonUtils = module.exports;

var qualityColorMap = {
    1 : 0xffffff, //白色
    2 : 0x00ff00, //绿色
    3 : 0x0000ff, //蓝色
    4 : 0xff00ff, //紫色
    5 : 0xff8000, //橙色
    6 : 0xff0000 //红色
};

/**
 * 根据品质获取颜色
 * @param q
 * @returns {*|number}
 */
commonUtils.getColorByQuality = function(q){
    return qualityColorMap[q] || 0xffffff;
};


/**
 * 获取字符串长度，中文为2
 * @param str
 */
commonUtils.getStringLength = function(str){
    var strArr = str.split("");
    var length = 0;
    for (var i = 0; i < strArr.length; i++) {
        var s = strArr[i];
        if(commonUtils.isChinese(s)){
            length+=2;
        }else{
            length+=1;
        }
    }
    return length;
};

/**
 * 判断是否中文
 * @param str
 * @returns {boolean}
 */
commonUtils.isChinese = function(str){
    var reg = /^[u4E00-u9FA5]+$/;
    if(!reg.test(str)){
        return true;
    }
    return false;
};

/**
 * 从一个给定的数组arr中,随机返回num个不重复项
 * @param arr
 * @param num
 * @returns {Array}
 */
commonUtils.getRandomArray = function(arr, num) {
    var temp_array = [].concat(arr);
    var return_array = [];
    for (var i = 0; i < num; i++) {
        if (temp_array.length > 0) {
            var arrIndex = Math.floor(Math.random() * temp_array.length);
            return_array[i] = temp_array[arrIndex];
            temp_array.splice(arrIndex, 1);
        } else {
            break;
        }
    }
    return return_array;
};

//打乱数组
commonUtils.breakArray = function(arr){
    arr.sort(function(){ return 0.5 - Math.random() });
};

/**
 * 随机区间数字
 * @param start
 * @param end
 */
commonUtils.getRandomNum = function (start, end) {
    var l = end - start + 1;
    return ((0 | Math.random() * l) + start);
};

/**
 * 获取权重下标
 * @param weightArr [权重,权重]
 * @returns {number}
 */
commonUtils.getWeightRandom = function(weightArr){
    var totalWeight = 0;
    for(var i = 0 ;i <weightArr.length;i++){
        var locWeight = weightArr[i];
        totalWeight+=locWeight;
    }
    var random = Math.random()*totalWeight;
    var tempCount = 0;
    var reIndex = 0;
    for(var i = 0 ;i <weightArr.length;i++){
        var locWeight = weightArr[i];
        tempCount+=locWeight;
        if(random<=tempCount){
            reIndex = i;
            break;
        }
    }

    return reIndex;
};

/**
 * 获取权重随即值
 * @param valueWeightArr  [[值，权重],[值，权重]]
 * @returns {*}
 */
commonUtils.getWeightRandomValue = function(valueWeightArr){
    var weightArr = [];
    for(var i = 0;i<valueWeightArr.length;i++){
        var locWeigh = valueWeightArr[i][1];
        weightArr.push(locWeigh);
    }

    var index = commonUtils.getWeightRandom(weightArr);
    var value = valueWeightArr[index][0];
    return value;
};

/**
 * 获取左到右的随即值
 * @param valueWeightArr  [[值，概率],[值，概率]]
 * @returns {*}
 */
commonUtils.getLeft2RightRandomValue = function(valueWeightArr){
    var value = 0;
    for(var i = 0;i<valueWeightArr.length;i++){
        var locValue = valueWeightArr[i][0];
        var locRate = valueWeightArr[i][1];
        if(Math.random()*10000<=locRate){
            value = locValue;
            break
        }
    }
    return value;
};

/**
 * 获取随机一个
 * @param arr
 */
commonUtils.getRandomOne = function(arr){
    var arrIndex = Math.floor(Math.random() * arr.length);
    return arr[arrIndex];
};

//数组移除几个对象
commonUtils.arrayRemoveArray = function (arr, minusArr) {
      for (var i = 0, l = minusArr.length; i < l; i++) {
          commonUtils.arrayRemoveObject(arr, minusArr[i]);
      }
};

//数组移除对象
commonUtils.arrayRemoveObject = function (arr, delObj) {
    for (var i = 0, l = arr.length; i < l; i++) {
        if (arr[i] == delObj) {
            arr.splice(i, 1);
            break;
        }
    }
};

/**
 * 获取几个随机的字母
 * @param num
 * @returns {string}
 */
commonUtils.getRandomLetter = function(num){
    var letters = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
    var ret = "";
    for(var i =0;i<num;i++){
       ret+=letters[0|(Math.random()*letters.length)];
    }
    return ret;
};

/**
 * 数字变为属性，例如   [[1,2],[3,4]] => {1:2,3:4}
 * @param arr
 * @returns {{}}
 */
commonUtils.arrayToProp = function(arr){
    var ret ={};
    for (var i = 0, l = arr.length; i < l; i++) {
        var obj = arr[i];
        ret[obj[0]] = obj[1];
    }
    return ret;
};

var FUCK_WORDS = c_game.fuckWord[0].split(",");
/**
 * 检验非法字符
 * @param str
 * @returns {boolean}
 */
commonUtils.checkFuckWord = function(str){
    if(!str) return false;
    var strList = str.split("");
    for(var i=0;i<strList.length;i++){
        var locStr = strList[0];
        if(FUCK_WORDS.indexOf(locStr)>-1)
            return true;
    }
    return false;
};

/**
 * 字符串转为对象   "1:2,2:3" => {"1":2,"2":3}
 * @param str
 * @return {Object}
 */
commonUtils.strToObj = function(str){
    str = (str+"").replace(/，/g, ",").replace(/：/g, ":");//为了防止策划误填，先进行转换
    var tempArr0 = str.split(",");
    var obj = {};
    for (var i = 0; i < tempArr0.length; i++) {
        var locTemp = tempArr0[i];
        if(!locTemp) continue;
        var tempArr1 = locTemp.split(":");
        obj[tempArr1[0]] = parseInt(tempArr1[1]);
    }
    return obj;
};


/**
 * 字符串变为数组  "1,2;3,4"  => [[1,2],[3,4]]
 * @param value
 * @returns {Array}
 */
commonUtils.strToArrInArr = function(value){
    value = (value+"").replace(/，/g, ",").replace(/；/g, ";");//为了防止策划误填，先进行转换
    var arr = [];
    var tempArr0 = value.split(";");
    for(var i = 0, li = tempArr0.length; i < li; ++i){
        var strI = tempArr0[i].trim();
        if(strI == ""){
            continue;
        }
        var tempArr1 = strI.split(",");
        var arr1 = [];
        for (var j = 0, lj = tempArr1.length; j < lj; j++) {
            var v = tempArr1[j].trim();
            if((v+"").search(/(^([\d]+)$)|(^([\d]+\.[\d]+)$)/) == 0){
                v = v.indexOf(".") > 0 ? parseFloat(v) : parseInt(v);
            }
            arr1.push(v);
        }
        arr.push(arr1);
    }
    return arr;
};

/**
 * 对象的值转为字符串
 * @param obj
 * @returns {*}
 */
commonUtils.objValueToStr = function(obj){
    if(obj instanceof Array){
        var arr = obj;
        for (var i = 0; i < arr.length; i++) {
            var locObj = arr[i];
            for(var key in locObj){
                var locValue = locObj[key];
                if(locValue instanceof Date){
                    locObj[key] = locValue.toFormat("YYYY-MM-DD HH24:MI:SS");
                }else if(typeof(locValue)=="object")
                    locObj[key] = JSON.stringify(locValue);
            }

        }
    }else{
        for(var key in obj){
            var locValue = obj[key];
            if(locValue instanceof Date){
                obj[key] = locValue.toFormat("YYYY-MM-DD HH24:MI:SS");
            }else if(typeof(locValue)=="object")
                obj[key] = JSON.stringify(locValue);
        }
    }
    return obj;
};

/**
 * 格式化参数成String。
 * 参数和h5的console.log保持一致。
 * @returns {*}
 */
commonUtils.formatStr = function(){
    var args = arguments;
    var l = args.length;
    if(l < 1){
        return "";
    }
    var str = args[0];
    var needToFormat = true;
    if(typeof str == "object"){
        str = JSON.stringify(str);
        needToFormat = false;
    }
    for(var i = 1; i < l; ++i){
        var arg = args[i];
        arg = typeof arg == "object" ? JSON.stringify(arg) : arg;
        if(needToFormat){
            while(true){
                var result = null;
                if(typeof arg == "number"){
                    result = str.match(/(%d)|(%s)/);
                    if(result){
                        str = str.replace(/(%d)|(%s)/, arg);
                        break;
                    }
                }
                result = str.match(/%s/);
                if(result){
                    str = str.replace(/%s/, arg);
                }else{
                    str += "    " + arg;
                }
                break;
            }
        }else{
            str += "    " + arg;
        }
    }
    return str;
};

/**
 * 把秒转化为天，小时，分钟，秒
 * @param seconds
 * @returns {*[]}
 */
commonUtils.secondsToDHMS = function(seconds){
    var days = parseInt(seconds/(24*60*60));
    seconds -= (days*24*60*60);
    var hours = parseInt(seconds/(60*60));
    seconds -= (hours*60*60);
    var minutes =parseInt(seconds/60);
    seconds -= (minutes*60);
    return [days,hours,minutes,seconds];
};

/**
 * 数据变object
 * @param data
 */
commonUtils.dataToObj = function(data){
    try{
        if(typeof data =="object") return data;
        return JSON.parse(data);
    }catch (e){
        return {};
    }
};

/**
 * 获取最后一个key值
 * @param obj
 * @returns {*}
 */
commonUtils.getLastKey = function(obj){
    if(!obj) return null;
    var keys = Object.keys(obj);
    return keys[keys.length-1];
};

/**
 * 获取最后一次的刷新具体时间,默认4点
 * @param hours
 * @returns {Date}
 */
commonUtils.getCurLastRefreshTime = function(hours) {
    hours = hours || 4;
    var curHour = (new Date).getHours();
    var reTime = null;
    if (curHour < hours) {
        reTime = (new Date).addDays(-1).clearTime().addHours(hours);
    } else {
        reTime = (new Date).clearTime().addHours(hours);
    }
    return reTime;
};

/**
 * 计算每日刷新次数
 * @param reNum
 * @param lastReplayTime
 * @param maxNum
 * @returns {any[]} [最终次数,最终时间]
 */
commonUtils.calRefreshData = function(reNum,lastReplayTime,maxNum){
    //计算每日购买次数
    var curLastTime = commonUtils.getCurLastRefreshTime();
    if (!lastReplayTime||!curLastTime.equals(new Date(lastReplayTime))) {
        reNum = maxNum;            //参数2：竞技场每天挑战次数
        lastReplayTime = curLastTime;
    }
    return [reNum,lastReplayTime];
};

/*
console.log(commonUtils.secondsToDHMS(3600));
*/
