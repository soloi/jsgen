/*
    convertID(id); 
    getMessagesNum(callback); 
    getLatestId(callback); 
    getMessagesList(_idArray, callback); 
    getMessage(_id, callback); 
    setMessage(messageObj);  
    setNewMessage(messageObj, callback); 
    delMessage(_idArray, callback);     
 */
var mongo = require('./mongoDao.js'),
    merge = require('../lib/tools.js').merge,
    intersect = require('../lib/tools.js').intersect,
    converter = require('../lib/nodeAnyBaseConverter.js'),
    IDString = require('./json.js').IDString,
    defautMessage = require('./json.js').Message,
    db = mongo.db;

var that = db.bind('messages', {

    convertID: function(id) {
        switch(typeof id) {
        case 'string':
            id = id.substring(1);
            id = converter(id, 62, IDString);
            return id;
        case 'number':
            id = converter(id, 62, IDString);
            while(id.length < 5) {
                id = '0' + id;
            }
            id = 'M' + id;
            return id;
        default:
            return null;
        }
    },

    getMessagesNum: function(callback) {
        that.count({}, function(err, count) {
            db.close();
            return callback(err, count);
        });
    },

    getLatestId: function(callback) {
        that.findOne({}, {
            sort: {
                _id: -1
            },
            hint: {
                _id: 1
            },
            fields: {
                _id: 1
            }
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });
    },

    getMessagesList: function(_idArray, callback) {
        if(!Array.isArray(_idArray)) _idArray = [_idArray];
        that.find({
            _id: {
                $in: _idArray
            }
        }, {
            fields: {
                author: 1,
                date: 1,
                title: 1,
                content: 1
            }
        }).toArray(function(err, doc) {
            db.close();
            return callback(err, doc);
        });
    },

    getMessage: function(_id, callback) {
        that.findOne({
            _id: _id
        }, {
            sort: {
                _id: -1
            },
            fields: {
                author: 1,
                receiver: 1,
                date: 1,
                title: 1,
                content: 1
            }
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });
    },

    setMessage: function(messageObj) {
        var query = {},
            setObj = {},
            newObj = {
                receiver: {
                    _id: 0,
                    read: false
                }
            };

        newObj = intersect(newObj, messageObj);

        that.update({
            {
                _id: messageObj._id
            }, {
                'receiver._id': newObj.receiver._id
            }
        }, {
            $set: {
                'receiver.$.read': true
            }
        });
        db.close();
    },

    setNewMessage: function(messageObj, callback) {
        var message = {},
            newMessage = {};

        message = merge(message, defautMessage);
        newMessage = merge(newMessage, defautMessage);
        newMessage = intersect(newMessage, messageObj);
        newMessage = merge(message, newMessage);

        if(!newMessage._id) {
            that.getLatestId(function(err, doc) {
                if(err) {
                    db.close();
                    return callback(err, null);
                }
                newMessage._id = doc._id + 1;
                that.insert(
                newMessage, {
                    w: 1
                }, function(err, doc) {
                    db.close();
                    return callback(err, doc);
                });
            });
        } else {
            that.insert(
            newMessage, {
                w: 1
            }, function(err, doc) {
                db.close();
                return callback(err, doc);
            });
        }
    }

    delMessage: function(_id, callback) {
        that.remove({
            _id: _id
        }, {
            w: 1
        }, function(err, doc) {
            db.close();
            return callback(err, doc);
        });
    },
});

module.exports = {
    convertID: that.convertID,
    getMessagesNum: that.getMessagesNum,
    getLatestId: that.getLatestId,
    getMessagesList: that.getMessagesList,
    getMessage: that.getMessage,
    setMessage: that.setMessage,
    setNewMessage: that.setNewMessage,
    delMessage: that.delMessage
};