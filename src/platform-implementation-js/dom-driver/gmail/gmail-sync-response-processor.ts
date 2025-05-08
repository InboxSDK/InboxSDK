import BigNumber from 'bignumber.js';
import isNotNil from '../../../common/isNotNil';

interface Recipient {
  emailAddress: string;
  name?: string;
}

export interface SyncThread {
  subject: string;
  snippet: string;
  syncThreadID: string;
  oldGmailThreadID: string;
  rawResponse: any;
  extraMetaData: {
    snippet: string;
    syncMessageData: Array<{
      syncMessageID: string;
      oldMessageID?: string;
      date: number;
      recipients?: Recipient[];
    }>;
  };
}

export interface MinimalSyncThread {
  syncThreadID: string;
  extraMetaData: {
    syncMessageData: Array<{
      syncMessageID: string;
      date: number;
      recipients?: Recipient[];
    }>;
  };
}

export function extractThreadsFromSearchResponse(
  response: string,
): SyncThread[] {
  const parsedResponse = JSON.parse(response);

  if (Array.isArray(parsedResponse)) {
    try {
      return extractThreadsFromSearchResponse_20220909(parsedResponse);
    } catch (err) {
      return [];
    }
  }

  const threadDescriptors: any[] | null = parsedResponse && parsedResponse[3];

  if (!threadDescriptors) return [];

  return threadDescriptors
    .map((descriptorWrapper, index) => {
      const descriptor = descriptorWrapper[1];
      if (!descriptor) return null;

      return {
        subject: descriptor[1],
        snippet: descriptor[2],
        syncThreadID: descriptor[4],
        // It seems Gmail is A/B testing including gmailThreadID in descriptor[20] and not including
        // the encoded version of it in descriptor[18], so pull it from [20] if [18] is not set.
        oldGmailThreadID:
          descriptor[18] != null
            ? new BigNumber(descriptor[18]).toString(16)
            : descriptor[20],
        rawResponse: descriptorWrapper,
        extraMetaData: {
          snippet:
            (parsedResponse[15] &&
              parsedResponse[15][1] &&
              parsedResponse[15][1][index]) ||
            '',
          syncMessageData: descriptor[5].map((md: any) => ({
            syncMessageID: md[1],
            oldMessageID: md[56],
            date: +md[7],
          })),
        },
      };
    })
    .filter(isNotNil);
}

export function extractThreadsFromSearchResponse_20220909(
  parsedResponse: any[],
): SyncThread[] {
  const threadDescriptors: any[] | null = parsedResponse && parsedResponse[2];

  if (!threadDescriptors) return [];

  return threadDescriptors
    .map((descriptorWrapper, index) => {
      const descriptor = descriptorWrapper[0];
      if (!descriptor) return null;

      return {
        subject: descriptor[0],
        snippet: descriptor[1],
        syncThreadID: descriptor[3],
        // It seems Gmail is A/B testing including gmailThreadID in descriptor[20] and not including
        // the encoded version of it in descriptor[18], so pull it from [20] if [18] is not set.
        oldGmailThreadID:
          descriptor[17] != null
            ? new BigNumber(descriptor[17]).toString(16)
            : descriptor[19],
        rawResponse: descriptorWrapper,
        extraMetaData: {
          snippet:
            (parsedResponse[14] &&
              parsedResponse[14][0] &&
              parsedResponse[14][0][index]) ||
            '',
          syncMessageData: descriptor[4].map((md: any) => ({
            syncMessageID: md[0],
            oldMessageID: md[55],
            date: +md[6],
          })),
        },
      };
    })
    .filter(isNotNil);
}

export function extractThreadsFromThreadResponse(
  response: string,
): Array<SyncThread | MinimalSyncThread> {
  const parsedResponse = JSON.parse(response);

  if (Array.isArray(parsedResponse)) {
    return extractThreadsFromThreadResponse_20220909(parsedResponse);
  }

  const threadDescriptors: any[] | null = parsedResponse && parsedResponse[2];

  if (!threadDescriptors) throw new Error('Failed to process thread response');

  return threadDescriptors
    .map((descriptorWrapper) => {
      if (
        typeof descriptorWrapper[1] === 'string' &&
        Array.isArray(descriptorWrapper[3]) &&
        !(
          descriptorWrapper[2] &&
          descriptorWrapper[2][1] &&
          descriptorWrapper[2][1][14] &&
          Array.isArray(descriptorWrapper[2][2])
        )
      ) {
        return {
          syncThreadID: descriptorWrapper[1],
          oldGmailThreadID:
            (descriptorWrapper[2] &&
              descriptorWrapper[2][1] &&
              descriptorWrapper[2][1][16]) ||
            undefined,
          extraMetaData: {
            snippet:
              (descriptorWrapper[2] &&
                descriptorWrapper[2][1] &&
                descriptorWrapper[2][1][3]) ||
              undefined,
            syncMessageData: (descriptorWrapper[3] || [])
              .filter((md) => Boolean(md[2]))
              .map((md) => ({
                syncMessageID: md[1],
                date: +md[2][17],
                recipients: getRecipientsFromMessageDescriptor(md),
              })),
          },
        } as MinimalSyncThread;
      } else {
        const threadDescriptor =
          descriptorWrapper[2] && descriptorWrapper[2][1];

        if (!threadDescriptor) return null;

        let syncMessageData;
        const fullMessageDescriptors =
          Array.isArray(descriptorWrapper[3]) && descriptorWrapper[3];

        if (fullMessageDescriptors) {
          syncMessageData = fullMessageDescriptors.map((md) => ({
            syncMessageID: md[1],
            date: +md[2][17],
            recipients: getRecipientsFromMessageDescriptor(md),
          }));
        } else {
          const messageDescriptors =
            descriptorWrapper[2] && descriptorWrapper[2][2];

          syncMessageData = messageDescriptors.map((md: any) => ({
            syncMessageId: md[1],
            date: +md[16],
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
            snippet: '',
          },
        } as SyncThread;
      }
    })
    .filter(isNotNil);
}

function extractThreadsFromThreadResponse_20220909(
  parsedResponse: any[],
): Array<SyncThread | MinimalSyncThread> {
  const threadDescriptors: any[] | null = parsedResponse && parsedResponse[1];

  if (!threadDescriptors) throw new Error('Failed to process thread response');

  return threadDescriptors
    .map((descriptorWrapper) => {
      if (
        typeof descriptorWrapper[0] === 'string' &&
        Array.isArray(descriptorWrapper[2]) &&
        !(
          descriptorWrapper[1] &&
          descriptorWrapper[1][0] &&
          descriptorWrapper[1][0][13] &&
          Array.isArray(descriptorWrapper[1][1])
        )
      ) {
        return {
          syncThreadID: descriptorWrapper[0],
          oldGmailThreadID:
            (descriptorWrapper[1] &&
              descriptorWrapper[1][0] &&
              descriptorWrapper[1][0][15]) ||
            undefined,
          extraMetaData: {
            snippet:
              (descriptorWrapper[1] &&
                descriptorWrapper[1][0] &&
                descriptorWrapper[1][0][2]) ||
              undefined,
            syncMessageData: (descriptorWrapper[2] || [])
              .filter((md) => Boolean(md[1]))
              .map((md) => ({
                syncMessageID: md[0],
                date: +md[1][16],
                recipients: getRecipientsFromMessageDescriptor_20220909(md),
              })),
          },
        } as MinimalSyncThread;
      } else {
        const threadDescriptor =
          descriptorWrapper[1] && descriptorWrapper[1][0];

        if (!threadDescriptor) return null;

        let syncMessageData;
        const fullMessageDescriptors =
          Array.isArray(descriptorWrapper[2]) && descriptorWrapper[2];

        if (fullMessageDescriptors) {
          syncMessageData = fullMessageDescriptors.map((md) => ({
            syncMessageID: md[0],
            date: +md[1][16],
            recipients: getRecipientsFromMessageDescriptor_20220909(md),
          }));
        } else {
          const messageDescriptors =
            descriptorWrapper[1] && descriptorWrapper[1][1];

          syncMessageData = messageDescriptors.map((md: any) => ({
            syncMessageId: md[0],
            date: +md[15],
          }));
        }

        return {
          subject: threadDescriptor[1],
          snippet: threadDescriptor[2],
          syncThreadID: threadDescriptor[0],
          oldGmailThreadID: new BigNumber(threadDescriptor[13]).toString(16),
          rawResponse: descriptorWrapper,
          extraMetaData: {
            syncMessageData,
            snippet: '',
          },
        } as SyncThread;
      }
    })
    .filter(isNotNil);
}

function getRecipientsFromMessageDescriptor(
  messageDescriptor: Array<any>,
): Recipient[] | void {
  if (!messageDescriptor[2]) return;

  const to = messageDescriptor[2][1] || [];
  const cc = messageDescriptor[2][2] || [];
  const bcc = messageDescriptor[2][3] || [];

  return to
    .concat(cc)
    .concat(bcc)
    .map((recipientDescriptor: any) => ({
      emailAddress: recipientDescriptor[2],
      name: recipientDescriptor[3],
    }));
}

function getRecipientsFromMessageDescriptor_20220909(
  messageDescriptor: Array<any>,
): Recipient[] | void {
  if (!messageDescriptor[1]) return;

  const to = messageDescriptor[1][0] || [];
  const cc = messageDescriptor[1][1] || [];
  const bcc = messageDescriptor[1][2] || [];

  return to
    .concat(cc)
    .concat(bcc)
    .map((recipientDescriptor: any) => ({
      emailAddress: recipientDescriptor[1],
      name: recipientDescriptor[2],
    }));
}

export function replaceThreadsInSearchResponse(
  response: string,
  replacementThreads: SyncThread[],
  { start, total }: { start: number; total?: number | 'MANY' },
): string {
  const parsedResponse = JSON.parse(response);

  if (Array.isArray(parsedResponse)) {
    try {
      return replaceThreadsInSearchResponse_20220909(
        parsedResponse,
        replacementThreads,
        { start, total },
      );
    } catch (err) {
      console.error('Caught err in replaceThreadsInSearchResponse', err);
      return response;
    }
  }

  if (parsedResponse[3] || replacementThreads.length) {
    parsedResponse[3] = replacementThreads.map(({ rawResponse }, index) => ({
      ...rawResponse,
      '2': index,
    }));
  }

  if (parsedResponse[15] || replacementThreads.length) {
    parsedResponse[15] = {
      ...parsedResponse[15],
      '1': replacementThreads.map(({ extraMetaData }) => extraMetaData.snippet),
      '2': replacementThreads.map(({ extraMetaData }) =>
        extraMetaData.syncMessageData.map(({ syncMessageID }) => syncMessageID),
      ),
    };
  }

  return JSON.stringify(parsedResponse);
}

export function replaceThreadsInSearchResponse_20220909(
  parsedResponse: any[],
  replacementThreads: SyncThread[],
  { start, total }: { start: number; total?: number | 'MANY' },
): string {
  if (parsedResponse[11] && parsedResponse[11][1]) {
    parsedResponse[11][1] = total;
  }
  if (parsedResponse[2] || replacementThreads.length) {
    parsedResponse[2] = replacementThreads.map(({ rawResponse }, index) => {
      const res = [...rawResponse];
      res[1] = index;
      return res;
    });
  }

  if (parsedResponse[14] || replacementThreads.length) {
    parsedResponse[14] = [...parsedResponse[14]];
    parsedResponse[14][0] = replacementThreads.map(
      ({ extraMetaData }) => extraMetaData.snippet,
    );

    if (
      Array.isArray(parsedResponse[14][1]) &&
      parsedResponse[14][1].length > 0 &&
      Array.isArray(parsedResponse[14][1][0][0])
    ) {
      // 2023-04-19 gmail change
      parsedResponse[14][1] = replacementThreads.map(({ extraMetaData }) => [
        [extraMetaData.syncMessageData[0].syncMessageID],
      ]);
    } else {
      parsedResponse[14][1] = replacementThreads.map(({ extraMetaData }) =>
        extraMetaData.syncMessageData.map(({ syncMessageID }) => syncMessageID),
      );
    }
  }

  return JSON.stringify(parsedResponse);
}
