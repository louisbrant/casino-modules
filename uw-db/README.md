************************************************************************************
dao共包含以下接口：
insert  插入一条数据
insertList  批量插入
update  更新
del   删除
select  查询一条数据
selectCols  自定义列查询一条数据
list    查询一组数据
listCols 自定义列查询一组数据
count   查询数据总数记录
************************************************************************************
具体用法：
------------------------------------------------
insert   插入一条数据：
var testEntity = require('uw-test').TestEntity;
var testEntity = new TestEntity();
testDao.insert(client, testEntity, function(err, data){
    //data返回插入数据的id
    var id = data.insertId;
});

insertList  批量插入
var testEntity1 = new TestEntity();
var testEntity2 = new TestEntity();
testDao.insertList(client, [testEntity1,testEntity2], function(err, data){
    //data返回空值
});
------------------------------------------------
update  更新：
两种使用方式
一、
testDao.update(client, {name:"aaa",lvl:2}, {id:1},function(err, data){
    //data返回空值
});
二、
testDao.update(client, {name:"aaa",lvl:2}, " id = ? and name = ? and name is not null ",[1,"xxx"],function(err, data){
    //data返回空值
});
------------------------------------------------
del   删除：
两种使用方式
一、
testDao.del(client,{id:1},function(err, data){
    //data返回空值
});
二、
testDao.del(client,  " id = ? and name = ? and name is not null ",[1,"xxx"],function(err, data){
    //data返回空值
});

------------------------------------------------
select  查询一条数据：
两种使用方式
一、
testDao.select(client,{id:1},function(err, data){
    //data返回object
});
二、
testDao.select(client,  " id = ? and name = ? and name is not null ",[1,"xxx"],function(err, data){
    //data返回object
});

select  自定义列查询一条数据：
两种使用方式
一、
testDao.selectCols(client," name,lvl ",{id:1},function(err, data){
    //data返回object，只包含name,lvl
});
二、
testDao.selectCols(client, " name,lvl ", " id = ? and name = ? and name is not null ",[1,"xxx"],function(err, data){
    //data返回object，只包含name,lvl
});

------------------------------------------------
list  查询一组数据：
两种使用方式
一、
testDao.list(client,{lvl:10},function(err, data){
    //data返回数组[object,...]
});
二、
testDao.list(client,  " id = ? and name = ? and name is not null ",[1,"xxx"],function(err, data){
    //data返回[object,...]
});

listCols  自定义列查询一组数据：
两种使用方式
一、
testDao.listCols(client," name,lvl ",{lvl:10},function(err, data){
    //data返回[object,...]，object只包含name,lvl
});
二、
testDao.listCols(client, " name,lvl ", " lvl = ? and name is not null ",[10,"xxx"],function(err, data){
    //data返回[object,...]，object只包含name,lvl
});

------------------------------------------------
count   查询数据总数记录：
两种使用方式
一、
testDao.count(client, {lvl:10}, function(err, data){
    //data返回记录总数
});
二、
testDao.count(client, " lvl = ?  name is not null ",[10,"xxx"],function(err, data){
    //data返回记录总数
});