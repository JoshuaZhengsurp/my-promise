/**
 * Promise
 * tsc --watch ./index.ts
 * */
enum PromiseState {
  PENDING = "pending",
  FULFILLED = "fulfilled",
  REJECTED = "rejected",
}
type Executor<T = any> = (resolve: any, reject: any) => T;

function isFunction(fn: unknown) {
  return fn && typeof fn === "function";
}
// 把 promise.value 放入 valueArr中，且改变需返回 promise 的状态
function isPromise(promise: any) {
  if (
    (typeof promise === "object" && promise !== null) ||
    typeof promise === "function"
  ) {
    return typeof promise.then === "function";
  }
  return false;
}
// 判断value有没有迭代器
function isIterable(value: any) {
  if (
    value !== null &&
    value !== undefined &&
    typeof value[Symbol.iterator] === "function"
  ) {
    return true;
  }
  return false;
}
class MyPromise {
  state: PromiseState;
  value: any;
  reason: any;
  onFulfilledCallbacks: any[];
  onRejectedCallbacks: any[];

  constructor(executor: Executor) {
    this.state = PromiseState.PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    let resolve: Function = (value: any) => {
      if (this.state === PromiseState.PENDING) {
        this.state = PromiseState.FULFILLED;
        this.value = value;
        this.onFulfilledCallbacks.forEach((fn: Function) => fn());
      }
    };
    let reject: Function = (reason: any) => {
      if (this.state === PromiseState.PENDING) {
        this.state = PromiseState.REJECTED;
        this.reason = reason;
        this.onRejectedCallbacks.forEach((fn: Function) => fn());
      }
    };

    try {
      executor(resolve, reject);
    } catch (err: any) {
      reject(err);
    }
  }

  then(onFulfilled?: any, onRejected?: any) {
    // 链式操作核心

    onFulfilled = isFunction(onFulfilled) ? onFulfilled : (data: any) => data;
    onRejected = isFunction(onRejected)
      ? onRejected
      : (err: any) => {
          throw err;
        };

    const promiseInst = new MyPromise((resolve: any, reject: any) => {
      let res: any;
      if (this.state === "fulfilled") {
        queueMicrotask(() => {
          try {
            res = onFulfilled(this.value);
            resolvePromise(promiseInst, res, resolve, reject);
          } catch (err) {
            reject(err);
          }
        });
      }

      if (this.state === "rejected") {
        queueMicrotask(() => {
          try {
            res = onRejected(this.reason);
            resolvePromise(promiseInst, res, resolve, reject);
          } catch (err) {
            reject(err);
          }
        });
      }

      if (this.state === "pending") {
        // 处理异步回调
        // 代理/修饰器思想
        this.onFulfilledCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              res = onFulfilled(this.value);
              resolvePromise(promiseInst, res, resolve, reject);
            } catch (err) {
              reject(err);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              res = onRejected(this.reason);
              resolvePromise(promiseInst, res, resolve, reject);
            } catch (err) {
              reject(err);
            }
          });
        });
      }
    });

    return promiseInst;
  }

  /* then的语法糖 */
  catch(errCallBack: Function) {
    return this.then(null, errCallBack);
  }

  /**
   * 在 promise 结束时，无论结果是 fulfilled 或者是 rejected，都会执行指定的回调函数。
   * 这为在 Promise是否成功完成后都需要执行的代码提供了一种方式。
   * finally 不会获取前一个promise的状态或值，而是将promise传给下个then,
   * finally 没有返回值
   */

  finally(finallyCB: any) {
    return this.then(
      (value: any) => {
        return MyPromise.resolve(finallyCB()).then(() => value);
      },
      (reason: any) => {
        return MyPromise.resolve(finallyCB()).then(() => {
          throw reason;
        });
      }
    );
  }

  static resolve(value: any) {
    return new MyPromise((resolve: any) => {
      resolve(value);
    });
  }
  static reject(reason: any) {
    return new MyPromise((_: any, reject: any) => {
      reject(reason);
    });
  }

  static all(promiseArr: MyPromise[]) {
    if (!isIterable(promiseArr)) {
      // 传入的promiseArr有没有迭代器
      throw new TypeError(
        `object ${promiseArr} is not iterable (cannot read property Symbol(Symbol.iterator))`
      );
    }

    let valueArr: any[] = [];
    let len = promiseArr.length;
    let storedValueNum = 0;

    if (len === 0) {
      return MyPromise.resolve([]);
    }
    return new MyPromise((resolve, reject) => {
      promiseArr.forEach((promise, idx) => {
        if (isPromise(promise)) {
          promise.then((val: any) => {
            putInValueArr(val, idx, resolve);
          }, reject /* reject直接转成失败态 */);
        } else {
          putInValueArr(promise, idx, resolve);
        }
      });

      function putInValueArr(val: any, idx: number, resolve: any) {
        valueArr[idx] = val;
        if (++storedValueNum === len) {
          resolve(valueArr);
        }
      }
    });
  }
  static allSettled(promiseArr: MyPromise[]) {
    if (!isIterable(promiseArr)) {
      throw new TypeError(
        `object ${promiseArr} is not iterable (cannot read property Symbol(Symbol.iterator))`
      );
    }

    let valueArr: any[] = [];
    let len = promiseArr.length;
    let storedValueNum = 0;

    if (len === 0) {
      return MyPromise.resolve([]);
    }

    return new MyPromise((resolve) => {
      promiseArr.forEach((promise, idx) => {
        if (isPromise(promise)) {
          promise.then(
            (value: any) => {
              putInValueArr(PromiseState.FULFILLED, value, idx, resolve);
            },
            (reason: any) => {
              putInValueArr(PromiseState.REJECTED, reason, idx, resolve);
            }
          );
        } else {
          putInValueArr(PromiseState.FULFILLED, promise, idx, resolve);
        }
      });
    });

    function putInValueArr(
      status: PromiseState,
      value: any,
      idx: number,
      resolve: any
    ) {
      switch (status) {
        case PromiseState.FULFILLED: {
          valueArr[idx] = {
            status,
            value,
          };
        }
        case PromiseState.REJECTED:
          {
            valueArr[idx] = {
              status,
              reason: value,
            };
          }
          break;
      }
      if (++storedValueNum === len) {
        resolve(valueArr);
      }
    }
  }
  static race(promiseArr: MyPromise[]) {
    if (!isIterable(promiseArr)) {
      // 判断是否可迭代
      throw new TypeError(
        `object ${promiseArr} is not iterable (cannot read property Symbol(Symbol.iterator))`
      );
    }
    if (promiseArr.length === 0) {
      // 当参数为空数组时
      return MyPromise.resolve([]);
    }

    return new MyPromise((resolve, reject) => {
      promiseArr.forEach((promise) => {
        if (isPromise(promise)) {
          promise.then(
            (value: any) => {
              resolve(value);
            },
            (reason: any) => {
              reject(reason);
            }
          );
        } else {
          resolve(promise);
        }
      });
    });
  }
}

/**
 * 解决promise返回值为Promise实例问题
 */
function resolvePromise(promiseInst: any, res: any, resolve: any, reject: any) {
  let called: boolean | undefined = false;
  if (promiseInst === res) {
    return reject(new TypeError("objectErr"));
  }
  if ((typeof res === "object" && res !== null) || typeof res === "function") {
    try {
      let then = res.then;
      if (typeof then === "function") {
        /* 判断是否为promise对象实例 */
        then.call(
          res,
          (val: any) => {
            if (called) {
              return;
            }
            called = true;
            // val 也有可能是promise
            resolvePromise(promiseInst, val, resolve, reject);
          },
          (err: any) => {
            if (called) {
              return;
            }
            called = true;
            reject(err);
          }
        );
      } else {
        if (called) {
          return;
        }
        called = true;
        resolve(res /* 普通对象 */);
      }
    } catch (err) {
      if (called) {
        return;
      }
      called = true;
      reject(err);
    }
  } else {
    resolve(res);
  }
}

/**
 * MyPromisetest
 */

const p1 = new MyPromise(() => {
  return 1;
});

p1.then(
  (res: any) => {
    console.log(res);
  },
  (err: any) => {
    console.log(err);
  }
);

const p2 = p1.then(
  (res: any) => {
    return new MyPromise((resolve: any, reject: any) => {
      resolve(
        new MyPromise((resolve: any) => {
          resolve(100);
        })
      );
    });
  },
  (err: any) => {
    console.log("err", err);
    return err + 2;
  }
);
p2.then(
  (res: any) => {
    console.log(res, "success");
  },
  (err: any) => {
    console.log(err, "err");
  }
);

const pp = new Promise((resolve) => {
  return resolve(1);
});

console.log(pp);

pp.then((res) => {
  console.log(res);
});

try {
  module.exports = MyPromise;
} catch {}
