import Logger from './logger';

interface ErrorLog {
  name: string;
  message: string;
}

export default class ErrorCollector {
  private _name: string;
  private _runCount: number = 0;
  private _errorLogs: Array<ErrorLog> = [];
  private _hasReported: boolean = false;

  public constructor(name: string) {
    this._name = name;
  }

  public run<T>(name: string, cb: () => T): T | null {
    if (this._hasReported) {
      throw new Error('Has already reported');
    }
    this._runCount++;
    try {
      return cb();
    } catch (e) {
      this._errorLogs.push({
        name,
        message: e.message
      });
      return null;
    }
  }

  public report(errorDataCb: () => any) {
    if (this._hasReported) {
      throw new Error('Has already reported');
    }
    this._hasReported = true;
    if (this._errorLogs.length) {
      Logger.error(new Error(`Error Collector: ${this._name}`), {
        errorLogs: this._errorLogs,
        extra: errorDataCb()
      });
    }
  }

  public getErrorLogs(): ReadonlyArray<ErrorLog> {
    return this._errorLogs;
  }

  public runCount(): number {
    return this._runCount;
  }

  public errorCount(): number {
    return this._errorLogs.length;
  }
}
