/*
 returns "/u/NUMBER" or "/u/NUMBER/d/DELEGATE_ID" for delegated accounts
*/
export default function getAccountUrlPart(): string {
  const delegatedAccountMatch = document.location.pathname.match(
    /\/u\/(\d+)\/d\/(.+?)\//,
  );
  if (delegatedAccountMatch) {
    const delegatedAccountId = delegatedAccountMatch[2];
    const delegatedAccountNumber = delegatedAccountMatch[1];
    return `/u/${delegatedAccountNumber}/d/${delegatedAccountId}`;
  } else {
    const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
    //no match happens in inbox when user only has one account
    const accountParam = accountParamMatch ? accountParamMatch[1] : '/u/0';
    return accountParam;
  }
}
