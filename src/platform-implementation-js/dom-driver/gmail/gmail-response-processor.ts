import flatten from 'lodash/flatten';
import last from 'lodash/last';
import t from 'transducers.js';
import mapIndexed from 'map-indexed-xf';
import assert from 'assert';
import htmlToText from '../../../common/html-to-text';

export function interpretSentEmailResponse(
  responseString: string
): { threadID: string; messageID: string } {
  const emailSentArray = deserialize(responseString).value;

  const gmailMessageId = extractGmailMessageIdFromSentEmail(emailSentArray);
  const gmailThreadId =
    extractGmailThreadIdFromSentEmail(emailSentArray) || gmailMessageId;
  if (!gmailMessageId || !gmailThreadId) {
    throw new Error('Failed to read email response');
  }
  return {
    threadID: gmailThreadId,
    messageID: gmailMessageId
  };
}

export function extractGmailMessageIdFromSentEmail(
  emailSentArray: any
): string | null {
  const messageIdArrayMarker = 'a';
  const messageIdArray = _searchArray(
    emailSentArray,
    messageIdArrayMarker,
    markerArray =>
      markerArray.length > 3 &&
      Array.isArray(markerArray[3]) &&
      markerArray[3].length > 0
  );

  if (!messageIdArray) {
    return null;
  }

  return messageIdArray[3][0];
}

export function extractGmailThreadIdFromSentEmail(
  emailSentArray: any
): string | null {
  const threadIdArrayMarker = 'csd';
  const threadIdArray = _searchArray(
    emailSentArray,
    threadIdArrayMarker,
    function(markerArray) {
      return (
        markerArray.length == 3 &&
        Array.isArray(markerArray[2]) &&
        markerArray[2].length > 5
      );
    }
  );

  if (!threadIdArray) {
    return null;
  }

  return threadIdArray[1];
}

export function extractGmailThreadIdFromMessageIdSearch(
  responseString: string
): string | null {
  const threadResponseArray = deserialize(responseString).value;
  const threadIdArrayMarker = 'cs';
  const threadIdArray = _searchArray(
    threadResponseArray,
    threadIdArrayMarker,
    markerArray => markerArray[0] === 'cs' && markerArray.length > 20
  );

  if (!threadIdArray) {
    return null;
  }

  return threadIdArray[1];
}

export function rewriteSingleQuotes(s: string): string {
  // The input string contains unquoted, double-quoted, and single-quoted
  // parts. Parse the string for these parts, and transform the single-
  // quoted part into a double-quoted part by swapping the quotes, and
  // escaping any double-quotes inside of it with backslashes.

  // i is our position in the input string. result is our result string that
  // we'll copy the parts of the input to as we interpret them.
  let i = 0;
  const resultParts = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Find the position of the next singly or doubly quoted part.
    // `i` is increasing monotonically every round of this loop, and the loop
    // ends as soon as no matches are found after the `i`th position in the
    // string, so this while loop can't be infinite.
    const nextQuoteIndex = findNextQuote(s, i);
    if (nextQuoteIndex < 0) {
      resultParts.push(s.substr(i));
      break;
    }
    // Copy the unquoted part preceding the quoted section we found into the
    // result, and put a double-quote into the result to begin the quoted
    // section we found.
    resultParts.push(s.substr(i, nextQuoteIndex - i));
    resultParts.push('"');
    i = nextQuoteIndex + 1;
    if (s[nextQuoteIndex] === '"') {
      // Find the next quotation mark not preceded by a backslash.
      const nextDoubleQuoteIndex = findNextUnescapedCharacter(s, i, '"');
      if (nextDoubleQuoteIndex < 0) {
        throw new Error('Unclosed double quote');
      }
      // Add that entire double-quoted part to the result.
      resultParts.push(s.slice(i, nextDoubleQuoteIndex + 1));
      i = nextDoubleQuoteIndex + 1;
    } else {
      // Same logic as above, but for a single-quoted part.
      const nextSingleQuoteIndex = findNextUnescapedCharacter(s, i, "'");
      if (nextSingleQuoteIndex < 0) {
        throw new Error('Unclosed single quote');
      }
      // Escape all double-quotes inside the part, un-escape all single-quotes
      // inside the part, and then write it out into the result with the ending
      // single-quote replaced with a double-quote.
      const part = s
        .slice(i, nextSingleQuoteIndex)
        .replace(/"/g, '\\"')
        .replace(/\\'/g, "'");
      resultParts.push(part);
      resultParts.push('"');
      i = nextSingleQuoteIndex + 1;
    }
  }
  return resultParts.join('');
}

function findNextQuote(s: string, start: number): number {
  for (let i = start, len = s.length; i < len; i++) {
    if (s[i] === '"' || s[i] === "'") {
      return i;
    }
  }
  return -1;
}

function findNextUnescapedCharacter(
  s: string,
  start: number,
  char: string
): number {
  for (let i = start, len = s.length; i < len; i++) {
    if (s[i] === '\\') {
      i++;
    } else if (s[i] === char) {
      return i;
    }
  }
  return -1;
}

export interface MessageOptions {
  includeLengths: boolean;
  suggestionMode: boolean;
  noArrayNewLines: boolean;
  includeExplicitNulls: boolean;
}

export function deserialize(
  threadResponseString: string
): { value: any[]; options: MessageOptions } {
  const options = {
    includeLengths: false,
    suggestionMode: /^5\n/.test(threadResponseString),
    noArrayNewLines: !/^[,\]]/m.test(threadResponseString),
    includeExplicitNulls: true
  };

  const value = [];

  let pos;
  if (options.suggestionMode) {
    pos = threadResponseString.indexOf("'\n");
    if (pos === -1) {
      throw new Error('Message was missing beginning header');
    }
    pos += 2;
  } else {
    pos = threadResponseString.indexOf('\n\n');
    if (pos === -1) {
      throw new Error('Message was missing beginning newlines');
    }
    pos += 2;
  }

  while (pos < threadResponseString.length) {
    let lineEnd = threadResponseString.indexOf('\n', pos + 1);
    if (lineEnd === -1) {
      lineEnd = threadResponseString.length;
    } else if (threadResponseString[lineEnd - 1] === '\r') {
      // seriously Gmail is crazy. The chunk length only sometimes includes the
      // newline after the chunk length.
      lineEnd += 1;
    }

    const line = threadResponseString.slice(pos, lineEnd);
    let dataLine;
    if (/^\d+\s*$/.test(line)) {
      options.includeLengths = true;
      const length = +line;
      dataLine = threadResponseString.slice(lineEnd, lineEnd + length);
      pos = lineEnd + length;
    } else {
      dataLine = threadResponseString.slice(pos);
      pos = threadResponseString.length;
    }

    value.push(deserializeArray(dataLine));
  }

  return { value, options };
}

function transformUnquotedSections(
  str: string,
  cb: (str: string) => string
): string {
  const parts = [];
  let nextQuote;
  let position = 0;
  let inString = false;
  while ((nextQuote = findNextUnescapedCharacter(str, position, '"')) !== -1) {
    if (inString) {
      parts.push(str.slice(position, nextQuote + 1));
    } else {
      parts.push(cb(str.slice(position, nextQuote + 1)));
    }
    position = nextQuote + 1;
    inString = !inString;
  }
  if (inString) {
    throw new Error('string ended inside quoted section');
  }
  parts.push(cb(str.slice(position)));
  return parts.join('');
}

export function deserializeArray(value: string): any[] {
  value = value.replace(/[\r\n\t]/g, '');

  // Change all the singly quoted parts to use double-quotes so that the
  // data can be JSON-decoded instead of eval'd. (Also necessary for the
  // next step.)
  value = rewriteSingleQuotes(value);

  // Fix some things with the data. (It's in a weird minified JSON-like
  // format). Make sure we don't modify any data inside of strings!
  value = transformUnquotedSections(
    value,
    match =>
      match
        .replace(/,\s*(?=,|\])/g, ',null') // fix implied nulls
        .replace(/\[\s*(?=,)/g, '[null') // "
  );

  try {
    return JSON.parse(value, (k, v) => (v == null ? undefined : v));
  } catch (err) {
    throw new Error('deserialization error');
  }
}

export function serialize(value: any[], options: MessageOptions): string {
  if (options.suggestionMode) {
    assert(options.includeLengths);
    return suggestionSerialize(value, options.includeExplicitNulls);
  }
  return threadListSerialize(value, options);
}

function threadListSerialize(
  threadResponseArray: any[],
  options: MessageOptions
): string {
  const { includeLengths, noArrayNewLines, includeExplicitNulls } = options;

  let response = ")]}'\n" + (noArrayNewLines && includeLengths ? '' : '\n');
  for (let ii = 0; ii < threadResponseArray.length; ii++) {
    const arraySection = threadResponseArray[ii];
    const arraySectionString = serializeArray(
      arraySection,
      noArrayNewLines,
      includeExplicitNulls
    );

    if (!includeLengths) {
      response += arraySectionString;
    } else {
      const length = arraySectionString.length + (noArrayNewLines ? 2 : 1);
      response +=
        (noArrayNewLines ? '\n' : '') + length + '\n' + arraySectionString;
    }
  }

  if (!includeLengths) {
    if (!noArrayNewLines) {
      const lines = response.split(/\r|\n/);
      const firstLines = lines.slice(0, -3);
      const lastLines = lines.slice(-3);
      response = firstLines.join('\n');
      response += '\n' + lastLines[0] + lastLines[1].replace(/"/g, "'");
    } else {
      // A 16-digit hexadecimal string is often at the end, but sometimes it
      // has fewer digits.
      response = response.replace(/"([0-9a-f]{8,16})"\]$/, "'$1']");
    }
  }

  return response + (noArrayNewLines && includeLengths ? '\n' : '');
}

function suggestionSerialize(
  suggestionsArray: any[],
  includeExplicitNulls: boolean
): string {
  let response = "5\n)]}'\n";
  for (let ii = 0; ii < suggestionsArray.length; ii++) {
    const arraySection = suggestionsArray[ii];
    const arraySectionString = serializeArray(
      arraySection,
      false,
      includeExplicitNulls
    );

    const length = arraySectionString.length;
    response += length + '\r\n' + arraySectionString;
  }

  return response;
}

function serializeArray(
  array: any[],
  noArrayNewLines: boolean,
  includeExplicitNulls: boolean
): string {
  let response = '[';
  for (let ii = 0; ii < array.length; ii++) {
    const item = array[ii];

    let addition;
    if (Array.isArray(item)) {
      addition = serializeArray(item, noArrayNewLines, includeExplicitNulls);
    } else if (item == null) {
      addition = includeExplicitNulls ? 'null' : '';
    } else {
      addition = JSON.stringify(item)
        .replace(/</gim, '\\u003c')
        .replace(/=/gim, '\\u003d')
        .replace(/>/gim, '\\u003e')
        .replace(/&/gim, '\\u0026');
    }

    if (ii > 0) {
      response += ',';
    }
    response += addition;
  }

  response += ']' + (noArrayNewLines ? '' : '\n');

  return response;
}

export interface Thread {
  subject: string;
  shortDate: string;
  timeString: string;
  peopleHtml: string;
  timestamp: number;
  isUnread: boolean;
  lastEmailAddress: string | null | undefined;
  bodyPreviewHtml: string;
  someGmailMessageIds: string[];
  gmailThreadId: string;
}

export function readDraftId(
  response: string,
  messageID: string
): string | null {
  const decoded = deserialize(response).value;

  const msgA = t.toArray(
    decoded,
    t.compose(
      t.cat,
      t.filter(Array.isArray),
      t.cat,
      t.filter((x: any) => x[0] === 'ms' && x[1] === messageID),
      t.take(1),
      t.map((x: any) => x[60])
    )
  )[0] as string | null | undefined;
  if (msgA) {
    const match = msgA.match(/^msg-[^:]:(\S+)$/i);
    return match && match[1];
  }
  return null;
}

export function replaceThreadsInResponse(
  response: string,
  replacementThreads: Thread[],
  { start, total }: { start: number; total?: number | 'MANY' }
): string {
  const { value, options } = deserialize(response);

  const actionResponseMode =
    value.length === 1 &&
    value[0].length === 2 &&
    typeof value[0][1] === 'string';
  const threadValue = actionResponseMode
    ? value[0][0].map((x: any) => [x])
    : value;

  /*
threadValue looks like this:
[
  [ // group
    ["blah", ...], // item
    ["blah", ...]  // item
  ],
  [ // group
    ["blah", ...],
    ["tb", [...]],
    ["tb", [...]]
  ],
  [
    ["tb", [...]],
    ["blah", ...]
  ],
  [
    ["blah", ...],
    ["blah", ...]
  ],
]

threadValue is an array of groups. Each group is an array of items. An item is
an array which has an identifier string as its first item. Each "tb" item
contains an array of up to 10 threads. All of the "tb" items will be sequential
but may overflow to other groups.

We want to replace all of the "tb" items, while trying to stick close to the
original structure. We prepare by creating an array of groups that come before
any groups containing a "tb" item, an array of groups that come after any
groups containing a "tb" item, an array of items that come before any "tb"
items in the first "tb" group, and an array of items that come after any "tb"
items in the last "tb" group. Then we generate the new "tb" items, and splice
it all back together.

*/

  const preTbGroups: any[] = [];
  const postTbGroups: any[] = [];
  let preTbItems: any[] = [];
  let postTbItems: any[] = [];

  let hasSeenTb = false;
  threadValue.forEach((group: any) => {
    let tbSeenInThisGroup = false;
    const preTbGroup: any[] = [];
    const postTbGroup: any[] = [];
    group.forEach((item: any) => {
      if (total && item[0] === 'ti') {
        if (typeof total === 'number') {
          // does not switch out of 'many'-total mode (we currently never need this).
          item[2] = item[10] = total;
        } else if (total === 'MANY') {
          // large total to ensure it is always larger than the actual
          // number of threads.
          item[2] = item[10] = 100 * 1000;
          // flip response from number-total mode into 'many'-total mode.
          item[3] = 1;

          const query = item[5];
          if (item[6]) {
            item[6][0] = [query, 1];
          } else {
            // eslint-disable-next-line no-console
            console.error('replaceThreadsInResponse(): Missing item[6]');
          }
        }
      }

      if (item[0] === 'tb') {
        hasSeenTb = tbSeenInThisGroup = true;
        if (preTbGroup.length) {
          preTbItems = preTbGroup;
        }
        postTbItems = postTbGroup;
      } else if (!hasSeenTb) {
        preTbGroup.push(item);
      } else {
        postTbGroup.push(item);
      }
    });
    if (!tbSeenInThisGroup) {
      if (!hasSeenTb) {
        preTbGroups.push(preTbGroup);
      } else {
        postTbGroups.push(postTbGroup);
      }
    }
  });

  const newTbs = _threadsToTbGroups(replacementThreads, start);
  if (preTbItems.length) {
    newTbs[0] = preTbItems.concat(newTbs[0] || []);
  }
  if (postTbItems.length) {
    if (newTbs.length) {
      newTbs[newTbs.length - 1] = newTbs[newTbs.length - 1].concat(postTbItems);
    } else {
      newTbs.push(postTbItems);
    }
  }
  const parsedNew = flatten([preTbGroups, newTbs, postTbGroups]);

  const allSections = flatten(parsedNew);
  const endSection = last(allSections);

  if (endSection[0] !== 'e') {
    throw new Error('Failed to find end section');
  }
  endSection[1] = allSections.length;

  const fullNew = actionResponseMode
    ? [[flatten(parsedNew), value[0][1]]]
    : parsedNew;
  return serialize(fullNew, options);
}

export function extractThreads(response: string): Thread[] {
  return extractThreadsFromDeserialized(deserialize(response).value);
}

export function extractThreadsFromDeserialized(value: any[]): Thread[] {
  if (
    value.length === 1 &&
    value[0].length === 2 &&
    typeof value[0][1] === 'string'
  ) {
    value = [value[0][0]];
  }
  return _extractThreadArraysFromResponseArray(value).map(thread =>
    Object.freeze(
      Object.defineProperty(
        {
          subject: htmlToText(thread[9]),
          shortDate: htmlToText(thread[14]),
          timeString: htmlToText(thread[15]),
          peopleHtml: cleanupPeopleLine(thread[7]),
          timestamp: thread[16] / 1000,
          isUnread: thread[9].indexOf('<b>') > -1,
          lastEmailAddress: thread[28],
          bodyPreviewHtml: thread[10],
          someGmailMessageIds: [thread[1], thread[2]],
          gmailThreadId: thread[0]
        },
        '_originalGmailFormat',
        { value: thread }
      )
    )
  );
}

const _extractMessageIdsFromThreadBatchRequestXf = t.compose(
  t.cat,
  t.cat,
  t.filter((item: any) => item[0] === 'cs'),
  t.map((item: any) => [item[1], item[2]])
);
export function extractMessageIdsFromThreadBatchRequest(
  response: string
): { [threadId: string]: string } {
  const { value } = deserialize(response);
  return t.toObj(value, _extractMessageIdsFromThreadBatchRequestXf);
}

export function cleanupPeopleLine(peopleHtml: string): string {
  // Removes possible headings like "To: " that get added on the Sent page, and
  // removes a class that's specific to the current preview pane setting.
  return peopleHtml
    .replace(/^[^<]*/, '')
    .replace(/(<span[^>]*) class="[^"]*"/g, '$1');
}

const _extractThreadArraysFromResponseArrayXf = t.compose(
  t.cat,
  t.filter((item: any) => item[0] === 'tb'),
  t.map((item: any) => item[2]),
  t.cat
);
function _extractThreadArraysFromResponseArray(
  threadResponseArray: any[]
): any[] {
  return t.toArray(
    threadResponseArray,
    _extractThreadArraysFromResponseArrayXf
  );
}

export interface Message {
  date: number;
  messageID?: string;
  recipients?: Array<{
    emailAddress: string;
    name: string | null | undefined;
  }>;
}

const _extractThreadsFromConversationViewResponseArrayXf = t.compose(
  t.cat,
  t.filter((item: any) => item[0] === 'cs'),
  t.map((item: any) => ({
    threadID: item[1],
    messageIDs: item[8]
  }))
);

const _extractMessagesFromResponseArrayXf = t.compose(
  t.cat,
  t.filter((item: any) => item[0] === 'ms'),
  t.map((item: any) => ({
    messageID: item[1],
    date: item[7]
  }))
);

export function extractMessages(
  response: string
): Array<{ threadID: string; messages: Message[] }> {
  // regular view=cv requests have a top level array length of 1
  // whereas view=cv requests when you refresh Gmail while looking at a thread
  // have a top level array with more elements
  let { value } = deserialize(response);
  if (value.length === 1) value = value[0];

  const threads: Array<{ threadID: string; messageIDs: string[] }> = t.toArray(
    value,
    _extractThreadsFromConversationViewResponseArrayXf
  );
  const messages = t.toArray(value, _extractMessagesFromResponseArrayXf);

  const messageMap: Record<string, Message> = {};
  messages.forEach((message: any) => {
    messageMap[message.messageID] = message;
  });

  return threads.map(({ threadID, messageIDs }) => ({
    threadID,
    messages: messageIDs.map(messageID => messageMap[messageID])
  }));
}

function _threadsToTbGroups(threads: any[], start: number): Array<Array<any>> {
  const _threadsToTbGroupsXf = t.compose(
    t.map((thread: any) => thread._originalGmailFormat),
    t.partition(10),
    mapIndexed((threadsChunk, i) => [['tb', start + i * 10, threadsChunk]])
  );
  return t.toArray(threads, _threadsToTbGroupsXf);
}

function _searchArray(
  responseArray: any,
  marker: string,
  markerArrayValidator: (markerArray: any[]) => boolean
): any {
  const pathArray = _searchObject(responseArray, marker, 100);

  for (let ii = 0; ii < pathArray.length; ii++) {
    const pathToMarkerArray = pathArray[ii].path.slice(0, -1);
    const markerArray = _getArrayValueFromPath(
      responseArray,
      pathToMarkerArray
    );

    if (markerArrayValidator(markerArray)) {
      return markerArray;
    }
  }
}

function _searchObject(element: any, query: string, maxDepth: number): any {
  const retVal = [];
  const initialNode = {
    el: element,
    path: [] as string[]
  };
  const nodeList = [initialNode];

  while (nodeList.length > 0) {
    const node = nodeList.pop()!;
    if (node.path.length <= maxDepth) {
      if (node.el !== null && typeof node.el === 'object') {
        const keys = Object.keys(node.el);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const newNode = {
            el: node.el[key],
            path: node.path.concat([key])
          };
          nodeList.push(newNode);
        }
      } else {
        if (node.el === query) {
          retVal.push(node);
        }
      }
    }
  }
  return retVal;
}

function _getArrayValueFromPath(responseArray: any, path: string[]): any {
  let currentArray = responseArray;
  for (let ii = 0; ii < path.length; ii++) {
    currentArray = currentArray[path[ii]];
  }
  return currentArray;
}
