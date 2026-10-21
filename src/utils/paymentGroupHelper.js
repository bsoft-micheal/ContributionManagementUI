import dayjs from "dayjs";

/**
 * Groups split child payment transactions into their parent transaction.
 * E.g., TXN001329-1 (₹2000, Cash) and TXN001329-2 (₹500, Gpay) become:
 * TXN001329 (₹2500, [Split], splits: [TXN001329-1, TXN001329-2])
 */
export function groupSplitTransactions(rawList) {
  if (!Array.isArray(rawList)) return [];

  const groups = new Map();
  const nonSplit = [];

  rawList.forEach((t) => {
    // Determine parent transaction group key
    let parentKey =
      t.parentTxnNumber ||
      t.ParentTxnNumber ||
      t.transactionGroupId ||
      t.TransactionGroupId ||
      null;

    if (!parentKey) {
      const rawId = String(t.txnNumber || t.TxnNumber || t.id || "").trim();
      const match = rawId.match(/^([A-Za-z0-9]+)-\d+$/);
      if (match) {
        parentKey = match[1];
      }
    }

    if (parentKey) {
      if (!groups.has(parentKey)) {
        groups.set(parentKey, []);
      }
      groups.get(parentKey).push(t);
    } else {
      nonSplit.push(t);
    }
  });

  const merged = [];

  groups.forEach((children, parentKey) => {
    // If only 1 child and it didn't have explicit parent, keep as-is
    if (
      children.length === 1 &&
      !children[0].parentTxnNumber &&
      !children[0].ParentTxnNumber
    ) {
      merged.push(children[0]);
      return;
    }

    // Sort splits by txnNumber or id
    children.sort((a, b) => {
      const idA = String(a.id || a.txnNumber || a.TxnNumber || "");
      const idB = String(b.id || b.txnNumber || b.TxnNumber || "");
      return idA.localeCompare(idB);
    });

    const primary = children[0];
    const totalAmount = children.reduce(
      (sum, c) => sum + (Number(c.amount || c.Amount) || 0),
      0
    );

    const modes = Array.from(
      new Set(children.map((c) => c.paymentMode || c.PaymentMode).filter(Boolean))
    );
    const paymentMode = "Split";

    // Build aggregate UTR string
    const utrParts = children
      .map((c) => {
        const u = c.utr || c.Utr;
        if (!u || u === "-" || u === "--") return null;
        const m = c.paymentMode || c.PaymentMode || "Ref";
        return u.includes(":") ? u : `${m}: ${u}`;
      })
      .filter(Boolean);
    const combinedUtr = utrParts.length > 0 ? utrParts.join("; ") : "--";

    // Aggregated verification status
    const statuses = children.map((c) =>
      String(c.status || c.Status || "").toLowerCase().trim()
    );
    const isAllVerified = statuses.every(
      (s) => s === "verified" || s === "closed" || s === "paid"
    );
    const isAnyRejected = statuses.some(
      (s) => s === "rejected" || s === "failed"
    );
    const aggregateStatus = isAllVerified
      ? "Verified"
      : isAnyRejected
      ? "Rejected"
      : "Pending";

    const verifiedBy =
      children.find(
        (c) =>
          (c.verifiedBy || c.VerifiedBy) &&
          (c.verifiedBy || c.VerifiedBy) !== "-" &&
          (c.verifiedBy || c.VerifiedBy) !== "--"
      )?.verifiedBy ||
      primary.verifiedBy ||
      primary.VerifiedBy ||
      "-";

    const verifiedOn =
      children.find(
        (c) =>
          (c.verifiedOn || c.VerifiedOn) &&
          (c.verifiedOn || c.VerifiedOn) !== "-" &&
          (c.verifiedOn || c.VerifiedOn) !== "--"
      )?.verifiedOn ||
      primary.verifiedOn ||
      primary.VerifiedOn ||
      "-";

    const screenshot =
      children.find((c) => c.screenshot || c.Screenshot)?.screenshot ||
      primary.screenshot ||
      primary.Screenshot ||
      "";

    const notes =
      children
        .map((c) => c.notes || c.Notes)
        .filter(Boolean)
        .join(" | ") ||
      primary.notes ||
      primary.Notes ||
      "";

    const parentId =
      primary.parentTxnNumber || primary.ParentTxnNumber || parentKey;

    merged.push({
      ...primary,
      id: parentId,
      txnNumber: parentId,
      transactionId: primary.transactionId || parentId,
      parentTxnNumber: null,
      isSplitGroup: true,
      splitCount: children.length,
      splits: children.map((c) => ({
        ...c,
        id: c.id || c.txnNumber || c.TxnNumber,
        txnNumber: c.txnNumber || c.TxnNumber || c.id,
        amount: Number(c.amount || c.Amount) || 0,
        paymentMode: c.paymentMode || c.PaymentMode || "—",
        utr: c.utr || c.Utr || "--",
        notes: c.notes || c.Notes || "",
        screenshot: c.screenshot || c.Screenshot || "",
      })),
      amount: totalAmount,
      paymentMode,
      paymentModes: modes,
      utr: combinedUtr,
      status: aggregateStatus,
      verifiedBy,
      verifiedOn,
      screenshot,
      notes,
    });
  });

  return [...merged, ...nonSplit].sort((a, b) => {
    const da = dayjs(
      a.paymentDate ||
        a.PaymentDate ||
        a.createdOn ||
        a.CreatedOn ||
        a.createdAt ||
        0
    );
    const db = dayjs(
      b.paymentDate ||
        b.PaymentDate ||
        b.createdOn ||
        b.CreatedOn ||
        b.createdAt ||
        0
    );
    return db.valueOf() - da.valueOf();
  });
}
