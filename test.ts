const myPromise = require("./index.js");

myPromise.defer = myPromise.deferred = function () {
  let dfd: any = {};
  dfd.promise = new myPromise((resolve: any, reject: any) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};

module.exports = myPromise;
