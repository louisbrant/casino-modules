
/*!
 * Connect - session - Session
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Expose Session.
 */

module.exports = Session;

function Session(id) {
  this.id = id;
  this.uid = null;
  this.req = null;
  this.expireTime = null;
  this.isKick = null;
  this.loggedInOtherDevice = null;
  this.serverIndex = null;
}

Session.prototype.get = function(key){
  return this[key];
};

Session.prototype.set = function(key,value){
  this[key] = value;
};

Session.copy = function(session){
  var reSession = new Session();
  for(var key in session){
     reSession.set(key,session[key]);
  }
  return reSession
};

Session.prototype.pushAll = function(cb){
  if(cb) cb();
};
