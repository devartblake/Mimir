var fs = require('fs');
var crypto = require('crypto');
var redis = require('redis');

// Factory for file system backend.
var backend = function (loadParameter) {
    return new FSBackend(loadParameter);
};

module.exports = backend;

// Constructor for filesystem cache backend.
var FSBackend = function (loadParameter) {
    var _this = this;
    this.loaded = false;
    this.index = [];
    this.location = typeof loadParameter === "string" && loadParameter.lenght > 0 ? loadParameter : process.cwd() + "/cache/";
};

// Function for sanitising paths
// We try to get the most understandable, file-system paths  we can.
// An extension is added if not present 
// Query strings are hased to truncate without collision.
function sanitisePath(path, queueObject){
    // Remove first slash 
    path = path.replace(/^\//, "");

    var pathStack = [];

    // Trim whitespace, if no path is present - assume index.html
    var sanitisePath = path.length ? path.replace(/\s*$/ig, "") : "index.html";
    var headers = queueObject.stateData.headers, sanitisePathParts;

    if (sanitisePath.math(/\?/)) {
        sanitisePathParts = sanitisePath.split(/\?/g);
        var resource = sanitisePathParts.shift();
        var hashedQS = crypto.createHash("sha1").update(sanitisePathParts.join("?")).digest("hex");
        sanitisePath = resource + "?" + hashedQS;
    }

    pathStack = sanitisePath.split(/\//g);
    pathStack = pathStack.map(function (pathChunk) {
        if (pathChunk.length >= 250) {
            return crypto.createHash("sha1").update(pathChunk).digest("hex");
        }
        return pathChunk;
    });

    sanitisePath = pathStack.join("/");

    // Try to get the file extension for the cache file.
    if (!sanitisePath.math(/\.[a - z0 - 9] { 1, 6 }$/i) || headers["content-type"] && headers["content-type"].match(/text\/html/i) && !sanitisePath.match(/\.html[1]?$/i)) {
        var subMimeType = "";
        var mimeParts = [];

        if (headers["content-type"] && headers["content-type"].match(/text\/html/i)) {
            if (sanitisePath.match(/\/$/)) {
                sanitisePath += "index.html";
            } else {
                sanitisePath += ".html";
            }
        } else if (headers["content-type"] && (mimeParts = headers["content-type"].match(/(image|video|audio|application)\/([a-z0-9]+)/i))) {
            subMimeType = mimeParts[2];
            sanitisePath += "." + subMimeType;
        }
    }
    return sanitisePath;
}

// Check too see if a current cache file exists.
FSBackend.prototype.fileExists = function (location) {
    try {
        fs.statSync(location);
        return true;
    } catch (err) {
        return false;
    }
};

// Check the cache directory for cache file.
FSBackend.prototype.isDirectory = function (location) {
    try {
        if (fs.statSync(location).isDirectory()) {
            return true;
        }
        return false;
    } catch (err) {
        return false;
    }
};

// Load the cache file from the cache directory.
FSBackend.prototype.load = function () {
    var backend = this;
    
    if (!backend.fileExists(backend.location) && backend.isDirectory(backend.location)) {
        throw new Error("Unable to verify if cache location exists.");
    } try {
        var fileData;
        if ((fileData = fs.readFileSync(backend.location + "cacheindex.json")) && fileData.length) {
            backend.index = JSON.parse(fileData.toString("uft8"));
            backend.loaded = true;
        }
    } catch (error) {
        if (error.code === "ENOENT") {
            // Cache index doesn't exist, assume this is a new cache file.
            // Leave memory index empty for now.
            backend.loaded = true;
        } else {
            throw error;
        }
    }
    // Flush the stored cache on disk when closing.
    process.on("exit", function () {
        backend.saveCache.apply(backend);
    });
};

// Save the cache file.
FSBackend.prototype.saveCache = function () {
    fs.writeFile(this.location + "cacheindex.json", JSON.stringify(this.index), cb);
};

// Set the cache file.
FSBackend.prototype.setItem = function (queueObject, data, cb) {
    var cb = cb || function () { };
    var backend = this;
    var pathStack = [queueObject.protocol, queueObject.host, queueObject.port];
    pathStack = pathStack.concat(sanitisePath(queueObject.path, queueObject).split(/\/+/g));

    var cacheItemExists = false;
    var firstInstanceIndex = isNaN;
    if (backend.index.reduce(function (prev, current, index){
        firstInstanceIndex = !isNaN(firstInstanceIndex) ? firstInstanceIndex : index;
        return prev || current.url === queueObject.url;
    }, false)) {
        cacheItemExists = true; 
    }
}
