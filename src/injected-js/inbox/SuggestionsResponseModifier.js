/* @flow */

import {defn} from 'ud';
import difference from 'lodash/difference';
import isEqual from 'lodash/isEqual';

class SuggestionsResponseModifier {
  _warnings: Array<any> = [];
  _parsed: Array<Object>;
  _mainPart: {'1'?: Array<Object>};

  constructor(responseText: string) {
    try {
      this._parsed = JSON.parse(responseText);
      if (!Array.isArray(this._parsed)) throw new Error('Expected array');

      if (this._parsed.length !== 2) {
        this._warnings.push({unexpectedLength: this._parsed.length});
      }

      const firstPart = this._parsed[0];
      if (!firstPart) {
        this._warnings.push('missing first part');
      } else {
        const firstKeys = Object.keys(firstPart);
        if (!isEqual(firstKeys, ['55684698'])) {
          this._warnings.push({unexpectedFirstKeys: firstKeys});
        }
        this._mainPart = firstPart['55684698'];
        if (this._mainPart) {
          const mainKeys = Object.keys(this._mainPart);
          if (!isEqual(mainKeys, ['2']) && !isEqual(mainKeys, ['1', '2'])) {
            this._warnings.push({unexpectedMainKeys: mainKeys});
          }
          const listPart = this._mainPart[1];
          // List part may be missing if there are no results
          if (listPart) {
            if (!Array.isArray(listPart)) {
              this._warnings.push('list part is not array');
            } else {
              listPart.forEach(contactPart => {
                const contactKeys = Object.keys(contactPart);
                if (
                  !contactPart['1'] || difference(contactKeys, ['1','2','3','4','6']).length
                ) {
                  this._warnings.push({unexpectedContactKeys: contactKeys});
                }
                contactKeys.forEach(key => {
                  if (typeof contactPart[key] !== (key === '4' ? 'number' : 'string')) {
                    this._warnings.push({wrongType: typeof contactPart[key], key});
                  }
                })
              });
            }
          }
        }
      }

      if (!this._mainPart) {
        throw new Error('Failed to find main part');
      }
    } catch (err) {
      throw Object.assign(err, {
        warnings: this._warnings,
        responseTextLength: responseText.length,
        response: this.getCensoredResponse()
      });
    }
  }

  getCensoredResponse(): ?string {
    if (this._parsed) {
      return JSON.stringify(this._parsed, (k,v) => {
        const t = typeof v;
        return (t === 'string' || t === 'number') ? t : v;
      });
    }
  }

  getWarningError(): ?Error {
    if (this._warnings.length) {
      return Object.assign((new Error('Suggestion Response Parse Warnings'):any), {
        warnings: this._warnings,
        response: this.getCensoredResponse()
      });
    }
  }

  addEntry() {
    // let listPart = this._mainPart['1'];
    // if (!listPart) {
    //   listPart = this._mainPart['1'] = [];
    // } else if (listPart.length > 2) {
    //   // listPart.length = 2;
    // }
    // listPart.push({
    //   '1': 'foo bar 123',
    //   '4': 1
    // });
  }

  serialize(): string {
    return JSON.stringify(this._parsed);
  }
}

export default defn(module, SuggestionsResponseModifier);
