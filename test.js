var myPromise = require("./index.js");
myPromise.defer = myPromise.deferred = function () {
    var dfd = {};
    dfd.promise = new myPromise(function (resolve, reject) {
        dfd.resolve = resolve;
        dfd.reject = reject;
    });
    return dfd;
};
module.exports = myPromise;
