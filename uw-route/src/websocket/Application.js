/**
 * Created by Administrator on 2015/10/14.
 */
var async = require('async');
var http = require('http');
var WebSocketServer = require('websocket').server;
var logger = require('uw-log').getLogger("uw-route", __filename);

var middleFuns = [];

var Application = function(){
    this.httpServer = _createHttp();
    this.wsServer = _createWebsocket(this.httpServer);
    this.wsServer.on('request',this.onRequest.bind(this));
};

Application.prototype.use = function(cb){
    middleFuns.push(cb);
};

Application.prototype.handle = function(){

};

Application.prototype.listen = function(port){
    this.httpServer.listen(port, function () {
        console.log((new Date()) + ' Server is listening on port:'+port);
    });
};

Application.prototype.onRequest = function(request){
    var self = this;
    if (!this.originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    var connection = request.accept('echo-protocol', request.origin);
    connection.on('message', function (message) {
        var msgData = "";
        if (message.type === 'utf8') {
            msgData =  message.utf8Data;
        }else if (message.type === 'binary') {
            msgData =  message.binaryData;
        }

        self.onMessage(request,connection,msgData);
    });
    connection.on('close', function (reasonCode, description) {
        self.onClose(request,connection,reasonCode, description);
    });
};

Application.prototype.onMessage = function(request,connection,msgData){
    var midleFuns = this._getMiddleFuns(request,connection,msgData);
    async.series(midleFuns,function(err,data){
        if(err) logger.error("middle err:",err);
    });
};

Application.prototype.onClose = function(request,connection,reasonCode, description){
    console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
};

Application.prototype.originIsAllowed = function(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
};

Application.prototype._getMiddleFuns = function(request,connection,msgData){
    var req = {};
    req.connection = connection;
    req.request = request;
    req.isSocket = 1;
    if(msgData){
        try{
            req.query = JSON.parse(msgData);
        }catch(err){
            req.query = {};
        }
    }else{
        req.query = {};
    }
    var funs = [];
    for(var i = 0;i<middleFuns.length;i++){
        var locFun = middleFuns[i];
        if(!locFun) continue;
        funs.push(function(cb1){
            this(req,null,cb1);
        }.bind(locFun));
    }
    return funs;
};

var _createHttp = function(){
    var server = http.createServer(function (request, response) {
        console.log((new Date()) + ' Received request for ' + request.url);
        response.writeHead(404);
        response.end();
    });
    return server;
};

var _createWebsocket = function(server){
    var wsServer = new WebSocketServer({
        httpServer: server,
        // You should not use autoAcceptConnections for production
        // applications, as it defeats all standard cross-origin protection
        // facilities built into the protocol and the browser.  You should
        // *always* verify the connection's origin and decide whether or not
        // to accept it.
        autoAcceptConnections: false
    });
    return wsServer;
};

module.exports = Application;