function cleanupPeopleLine(peopleHtml) {
  // Removes possible headings like "To: " that get added on the Sent page, and
  // removes a class that's specific to the current preview pane setting.
  return peopleHtml
    .replace(/^[^<]*/, '')
    .replace(/(<span[^>]*) class="[^"]*"/g, '$1');
}
module.exports = cleanupPeopleLine;
