var _ = require('underscore');
var request = require('request');
var errors = require('./errors');

// var BASE_URL = 'https://www.websitename.com/api';
var ERROR_CODES = [400, 401, 403, 404, 500, 504];

exports = module.exports = {};

var handleHttpResponse = function (err, res, body, cb) {
    if (err) return cb(err);

    if (ERROR_CODES.indexOf(res.statusCode) > -1) {
        var message = body
        if (body.messages) message = JSON.stringify(body.messages);
        if (body.message && body.error === true) message = body.message;

        return cb(errors.http(res.statusCode, message));
    }

    return cb(err, res, body);
}