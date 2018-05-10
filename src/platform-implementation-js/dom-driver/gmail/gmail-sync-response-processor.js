
/* @flow */

import BigNumber from 'bignumber.js';

type Recipient = {
  emailAddress: string;
  name: ?string;
};

export type SyncThread = {|
  subject: string;
  snippet: string;
  syncThreadID: string;
  oldGmailThreadID: string;
  rawResponse: Object;
  extraMetaData: {
    snippet: string;
    syncMessageData: Array<{
      syncMessageID: string;
      date: number;
      recipients?: Recipient[];
    }>;
  };
|};

export type MinimalSyncThread = {|
  syncThreadID: string;
  extraMetaData: {
    syncMessageData: Array<{
      syncMessageID: string;
      date: number;
      recipients?: Recipient[];
    }>;
  };
|};

export function extractThreadsFromSearchResponse(response: string): SyncThread[] {

  const parsedResponse = JSON.parse(response);
  const threadDescriptors = (
    parsedResponse &&
    parsedResponse[3]
  );

  if(!threadDescriptors) return [];

  return threadDescriptors.map((descriptorWrapper, index) => {
    const descriptor = descriptorWrapper[1];
    if(!descriptor) return null;

    return {
      subject: descriptor[1],
      snippet: descriptor[2],
      syncThreadID: descriptor[4],
      oldGmailThreadID: new BigNumber(descriptor[18]).toString(16),
      rawResponse: descriptorWrapper,
      extraMetaData: {
        snippet: (
          parsedResponse[15] &&
          parsedResponse[15][1] &&
          parsedResponse[15][1][index]
        ) || '',
        syncMessageData: descriptor[5].map(md => ({
          syncMessageID: md[1],
          date: +md[7]
        }))
      }
    };

  })
  .filter(Boolean);

}


export function extractThreadsFromThreadResponse(response: string): Array<SyncThread | MinimalSyncThread> {
  const parsedResponse = JSON.parse(response);

  const threadDescriptors = (
    parsedResponse &&
    parsedResponse[2]
  );

  if(!threadDescriptors) throw new Error('Failed to process thread response');

  return threadDescriptors.map(descriptorWrapper => {
    if(
      typeof descriptorWrapper[1] === 'string' && Array.isArray(descriptorWrapper[3]) &&
      !(descriptorWrapper[2] && descriptorWrapper[2][1] && descriptorWrapper[2][1][14] && Array.isArray(descriptorWrapper[2][2]))
    ) {
      return {
        syncThreadID: descriptorWrapper[1],
        extraMetaData: {
          syncMessageData: (descriptorWrapper[3] || []).filter(md => Boolean(md[2])).map(md => ({
            syncMessageID: md[1],
            date: +md[2][17],
            recipients: getRecipientsFromMessageDescriptor(md)
          }))
        }
      };
    }
    else {
      const threadDescriptor = (
        descriptorWrapper[2] &&
        descriptorWrapper[2][1]
      );

      if(!threadDescriptor) return null;

      let syncMessageData;
      const fullMessageDescriptors = (
        Array.isArray(descriptorWrapper[3]) &&
        descriptorWrapper[3]
      );

      if(fullMessageDescriptors){
        syncMessageData = fullMessageDescriptors.map(md => ({
          syncMessageID: md[1],
          date: +md[2][17],
          recipients: getRecipientsFromMessageDescriptor(md)
        }));
      }
      else {
        const messageDescriptors = (
          descriptorWrapper[2] &&
          descriptorWrapper[2][2]
        );

        syncMessageData = messageDescriptors.map(md => ({
          syncMessageId: md[1],
          date: +md[16]
       }));
     }

      return {
        subject: threadDescriptor[2],
        snippet: threadDescriptor[3],
        syncThreadID: threadDescriptor[1],
        oldGmailThreadID: new BigNumber(threadDescriptor[14]).toString(16),
        rawResponse: descriptorWrapper,
        extraMetaData: {
          syncMessageData,
          snippet: ''
        }
      };
    }
  })
  .filter(Boolean);

}

function getRecipientsFromMessageDescriptor(messageDescriptor: Array<Object>): Recipient[] | void {
  if(!messageDescriptor[2]) return;

  const to = messageDescriptor[2][1] || [];
  const cc = messageDescriptor[2][2] || [];
  const bcc = messageDescriptor[2][3] || [];

  return to.concat(cc).concat(bcc).map(recipientDescriptor => ({
    emailAddress: recipientDescriptor[2],
    name: recipientDescriptor[3]
  }));
}


export function replaceThreadsInSearchResponse(
  response: string,
  replacementThreads: SyncThread[],
  { start, total }: { start: number, total?: number|'MANY' }
): string {

  const parsedResponse = JSON.parse(response);

  parsedResponse[3] = replacementThreads.map(({rawResponse}, index) => ({...rawResponse, '2': index}));
  parsedResponse[15][1] = replacementThreads.map(({extraMetaData}) => extraMetaData.snippet);
  parsedResponse[15][2] = replacementThreads.map(({extraMetaData}) => extraMetaData.syncMessageData.map(({syncMessageID}) => syncMessageID));

  return JSON.stringify(parsedResponse);

}
