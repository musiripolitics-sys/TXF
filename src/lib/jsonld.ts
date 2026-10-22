/**
 * JSON.stringify does not escape `<`, so a value containing `</script>` closes
 * the surrounding tag early and everything after it is parsed as HTML. Titles,
 * names and bios all reach these scripts from user input, so that is a live
 * XSS path rather than a theoretical one. Escaping `<` as < keeps the JSON
 * valid and identical to a parser while making the sequence impossible to
 * produce.
 *
 * Every `type="application/ld+json"` script in the app goes through here.
 */
export function jsonLdSafe(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
