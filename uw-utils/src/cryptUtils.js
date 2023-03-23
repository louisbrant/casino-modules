/*
 *   A   JavaScript   implementation   of   the   Secure   Hash   Algorithm,   SHA-1,   as   defined
 *   in   FIPS   PUB   180-1
 *   Version   2.1-BETA   Copyright   Paul   Johnston   2000   -   2002.
 *   Other   contributors:   Greg   Holt,   Andrew   Kepert,   Ydnar,   Lostinet
 *   Distributed   under   the   BSD   License
 *   See   http://pajhome.org.uk/crypt/md5   for   details.
 */

var exports = module.exports;
(function(mExport) {
    var enCharCode = function(mKey,strText){
        var reData = "";
        for(var i=0;i<strText.length;i++){
            var locT = strText.charCodeAt(i);
            var locStr = String.fromCharCode(_enCharCode(mKey,locT));
            reData+=locStr;
        }

        return   _strToCharCode(reData);
    };

    var deCharCode = function(mKey,strText){
        var reStr = "";
        strText =  _charCodeToStr(strText);
        for(var i=0;i<strText.length;i++){
            var locT = strText.charCodeAt(i);
            var locStr = String.fromCharCode(_deCharCode(mKey,locT));
            reStr+=locStr;
        }
        return reStr;
    };

    var _enCharCode = function(mKey,charT){
        for(var j=0;j<mKey.length;j++){
            var keyM = mKey.charCodeAt(j);
            charT =  charT^keyM;
        }
        return charT;
    };

    var _deCharCode = function(mKey,charT){
        for (var j = mKey.length - 1; j >= 0; j--) {
            var keyM = mKey.charCodeAt(j);
            charT =  charT^keyM;
        }
        return charT;
    };

    var _strToCharCode = function(text){
        var tempArr = [];
        for(var j=0;j<text.length;j++){
            var locCode = text.charCodeAt(j);
            tempArr.push(locCode);
        }
        return JSON.stringify(tempArr);
    };

    var _charCodeToStr = function(text){
        var tempStr = "";
        var tempArr = JSON.parse(text);
        for(var j=0;j<tempArr.length;j++){
            var locStr = String.fromCharCode(tempArr[j]);;
            tempStr+=locStr;
        }
        return tempStr;
    };

    mExport.enCharCode = enCharCode;
    mExport.deCharCode = deCharCode;
})(exports);
