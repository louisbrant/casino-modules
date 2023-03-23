/**
 * Created by Administrator on 2014/5/6.
 */

var core4Test = require("uw-test").core4Test;
var dao = require("../../src/dao/serverInfoDao");
var cb = core4Test.cb4Test;
var trans = core4Test.trans;
var mainClient = core4Test.mainClient;

function insert(cb){
    dao.insert(mainClient,  {name:"黑夜传说",area:"1区",host:"127.0.0.1",port:"3014",isNew:0,status:3}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"2区",host:"127.0.0.1",port:"3014",isNew:0,status:2}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"3区",host:"127.0.0.1",port:"3014",isNew:0,status:1}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"4区",host:"127.0.0.1",port:"3014",isNew:0,status:0}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"5区",host:"127.0.0.1",port:"3014",isNew:0,status:3}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"6区",host:"127.0.0.1",port:"3014",isNew:0,status:3}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"7区",host:"127.0.0.1",port:"3014",isNew:0,status:0}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"8区",host:"127.0.0.1",port:"3014",isNew:0,status:3}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"9区",host:"127.0.0.1",port:"3014",isNew:0,status:3}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"10区",host:"127.0.0.1",port:"3014",isNew:0,status:2}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"11区",host:"127.0.0.1",port:"3014",isNew:0,status:3}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"12区",host:"127.0.0.1",port:"3014",isNew:0,status:3}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"13区",host:"127.0.0.1",port:"3014",isNew:0,status:1}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"14区",host:"127.0.0.1",port:"3014",isNew:0,status:3}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"15区",host:"127.0.0.1",port:"3014",isNew:0,status:1}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"16区",host:"127.0.0.1",port:"3014",isNew:0,status:3}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"17区",host:"127.0.0.1",port:"3014",isNew:0,status:3}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"18区",host:"127.0.0.1",port:"3014",isNew:0,status:2}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"19区",host:"127.0.0.1",port:"3014",isNew:0,status:3}, cb);
    dao.insert(mainClient,  {name:"黑夜传说",area:"20区",host:"127.0.0.1",port:"3014",isNew:0,status:0}, cb);
};
//++++++++++++++++++++++++Run Test+++++++++++++++++++++++

insert(cb);
