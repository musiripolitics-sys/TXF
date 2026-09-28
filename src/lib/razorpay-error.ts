/**
 * Razorpay SDK errors don't carry a top-level `message`. They look like
 * `{ statusCode, error: { code, description, reason, field } }`, so reading
 * `error.message` silently loses the only useful part and every failure
 * becomes the same generic string.
 */
export function razorpayErrorDetail(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const e = error as {
      error?: { description?: string; code?: string; reason?: string; field?: string };
      message?: string;
      statusCode?: number;
    };
    const inner = e.error;
    if (inner?.description) {
      return [inner.description, inner.field ? `(field: ${inner.field})` : null, inner.code]
        .filter(Boolean)
        .join(" ");
    }
    if (e.message) return e.message;
    if (e.statusCode) return `Razorpay returned HTTP ${e.statusCode}`;
  }
  return "Unknown error from the payment gateway";
}
