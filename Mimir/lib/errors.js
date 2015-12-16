module.exports.http = function (code, message) {
    return new Error('HTTP ' + code + ': ' + message);
};