/**
 * Created by SmallAiTT on 2015/4/29.
 */

function clazz(){
}
var _p_ = clazz.prototype;
_p_._initProp = function(){};
_p_._init = function(){};

clazz.extends = function (proto){
    var Super = this;
    var allProto = {};
    for (var i = 0, l_i = arguments.length; i < l_i; i++) {
        var proto = arguments[i];
        for (var k in proto) {
            allProto[k] = proto[k];
        }
    }
    var ctor = allProto.ctor || Super.ctor || function(){};
    function clazz(){
        var self = this;
        ctor.apply(self, arguments);
    }
    var _p_ = clazz.prototype;
    var _sp_ = Super.prototype;
    _p_._super = Super;


    for (var key in _sp_)
        if (_sp_.hasOwnProperty(key))
            _p_[key] = _sp_[key];

    for (var key in allProto) {
        _p_[key] = allProto[key];
    }

    for (var key in Super) {
        clazz[key] = Super[key];
    }
    _p_ = null;
    _sp_ = null;

    return clazz;
};

module.exports = clazz;
