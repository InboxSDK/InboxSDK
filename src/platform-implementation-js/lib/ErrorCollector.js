/* @flow */

import Logger from './logger';

export default class ErrorCollector {
  _name: string;
  _runCount: number = 0;
  _errorLogs: Array<{
    name: string;
    message: string;
  }> = [];
  _hasReported: boolean = false;

  constructor(name: string) {
    this._name = name;
  }

  run<T>(name: string, cb: () => T): ?T {
    if (this._hasReported) {
      throw new Error("Has already reported");
    }
    this._runCount++;
    try {
      return cb();
    } catch(e) {
      this._errorLogs.push({
        name, message: e.message
      });
      return null;
    }
  }

  report(errorDataCb: () => any) {
    if (this._hasReported) {
      throw new Error("Has already reported");
    }
    this._hasReported = true;
    if (this._errorLogs.length) {
      Logger.error(new Error(`Error Collector: ${this._name}`), {
        errorLogs: this._errorLogs,
        extra: errorDataCb()
      });
    }
  }

  getErrorLogs() {
    return this._errorLogs;
  }

  runCount(): number {
    return this._runCount;
  }

  errorCount(): number {
    return this._errorLogs.length;
  }
}
