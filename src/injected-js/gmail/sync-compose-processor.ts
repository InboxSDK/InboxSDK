import { ComposeRequest } from './constants';
import {
  parseComposeRequestBody_2022_09_09,
  parseComposeResponseBody_2022_09_09,
  replaceBodyContentInComposeSendRequestBody_2022_09_09,
} from './sync-compose-processor-20220909';
import {
  getDetailsOfComposeRequest,
  replaceEmailBodyForSendRequest,
} from './sync-compose-request-processor';
import * as logger from '../injected-logger';

export function parseComposeRequestBody(
  request: string,
): ComposeRequest | null {
  const requestParsed = JSON.parse(request);

  try {
    if (Array.isArray(requestParsed)) {
      const parsed = parseComposeRequestBody_2022_09_09(requestParsed);
      if (parsed) {
        return {
          type: parsed.type,
          to: parsed.to,
          cc: parsed.cc,
          bcc: parsed.bcc,
          draftID: parsed.messageId.replace('msg-a:', ''),
          subject: parsed.subject,
          body: parsed.body,
        };
      }

      return null;
    }
  } catch (err) {
    logger.eventSdkPassive('connection.requestResponseParsingFailed', {
      requestParseError: err,
    });
  }

  return getDetailsOfComposeRequest(requestParsed);
}

export function parseComposeResponseBody(response: string) {
  const responseParsed = JSON.parse(response);

  if (Array.isArray(responseParsed)) {
    return parseComposeResponseBody_2022_09_09(responseParsed);
  }

  return [];
}

export function replaceBodyContentInComposeSendRequestBody(
  request: string,
  newBodyHtmlContent: string,
): string {
  const requestParsed = JSON.parse(request);

  try {
    if (Array.isArray(requestParsed)) {
      const replacedRequestObj =
        replaceBodyContentInComposeSendRequestBody_2022_09_09(
          requestParsed,
          newBodyHtmlContent,
        );

      if (replacedRequestObj) {
        return JSON.stringify(replacedRequestObj);
      }

      // if couldn't parse and replace body content, return original object
      return request;
    }
  } catch (err) {
    logger.eventSdkPassive('connection.requestResponseParsingFailed', {
      replaceBodyFailed: err,
    });
  }

  return replaceEmailBodyForSendRequest(request, newBodyHtmlContent);
}
