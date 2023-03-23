/**
 * Created by Administrator on 2016/1/5.
 */
var logger = require('uw-log').getLogger("uw-logger",__filename);
var BaseDao = require("uw-db").BaseDao;
var util = require("util");
function Dao() {
    BaseDao.call(this);
    this.Entity = require('uw-entity').ChallengeCupRankEntity;
    //++++++++++++++++++begin++++++++++++++++++++++

    this.clean = function(client, cb) {
        client.query("TRUNCATE TABLE uw_challengeCup_rank", function(err, data){
            if (err) return cb(err);
            return cb(null);
        });
    }
};

util.inherits(Dao, BaseDao);
module.exports = new Dao();