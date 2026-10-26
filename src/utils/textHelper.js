const PRESERVE_ACRONYMS = new Set([
  "id",
  "utr",
  "upi",
  "qr",
  "s.no",
  "pdf",
  "csv",
  "txn",
  "sms",
  "otp",
  "url",
  "api",
  "sno",
]);

/**
 * Converts camelCase, SNAKE_CASE, UPPERCASE, or lowercase strings to Title / Pascal Case words.
 * Examples:
 *   "totalExpected" -> "Total Expected"
 *   "TOTAL EXPECTED" -> "Total Expected"
 *   "total_expected" -> "Total Expected"
 *   "memberName" -> "Member Name"
 *   "transactionId" -> "Transaction ID"
 *   "UTR / Reference No" -> "UTR / Reference No"
 *   "#" -> "S.No"
 */
export function toPascalCase(str) {
  if (str === null || str === undefined || typeof str !== "string") return str || "";
  const trimmed = str.trim();
  if (!trimmed) return "";
  if (trimmed === "#") return "S.No";

  return trimmed
    // Insert space between lowerCamelCase words (e.g. totalExpected -> total Expected)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // Replace underscores with space
    .replace(/_+/g, " ")
    .split(/\s+/)
    .map((word) => {
      // Check for punctuation around the word, like "(>30" or "No."
      const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, "");
      const lower = cleanWord.toLowerCase();

      if (PRESERVE_ACRONYMS.has(lower)) {
        const replacement = lower === "s.no" ? "S.No" : lower === "txn" ? "Txn" : lower.toUpperCase();
        return word.replace(cleanWord, replacement);
      }

      // If word is symbol like "/" or "&" or "₹" or "-", return as is
      if (!cleanWord) return word;

      // Title case the word: First letter capital, rest lowercase
      const capitalized = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
      return word.replace(cleanWord, capitalized);
    })
    .join(" ");
}
