/**
 * Centralized whole-number rounding and currency formatting helper for TeamContributionManagementSystem.
 * Rule: decimal part >= .50 rounds up; decimal part < .50 rounds down (AwayFromZero).
 * Provides exact total remainder distribution so sums match target values with zero penny/rupee drift.
 */

/**
 * Rounds a number or numeric string to a whole integer using standard half-up (AwayFromZero) rounding.
 * Safely handles null, undefined, strings, NaN, zero, and negative values.
 * @param {number|string|null|undefined} val 
 * @returns {number}
 */
export function roundToWhole(val) {
  if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
    return 0;
  }
  const num = Number(val);
  return num >= 0 ? Math.floor(num + 0.5) : Math.ceil(num - 0.5);
}

/**
 * Formats an amount as a whole-number currency string with Indian comma grouping.
 * Examples: 12500.5 -> "₹12,501", -500 -> "-₹500", 0 -> "₹0"
 * @param {number|string|null|undefined} val 
 * @param {string} [prefix="₹"]
 * @returns {string}
 */
export function formatWholeCurrency(val, prefix = "₹") {
  const rounded = roundToWhole(val);
  const isNegative = rounded < 0;
  const absFormatted = Math.abs(rounded).toLocaleString("en-IN");
  return isNegative ? `-${prefix}${absFormatted}` : `${prefix}${absFormatted}`;
}

/**
 * Formats a number as a whole number string with Indian comma grouping without currency prefix.
 * Example: 12500.5 -> "12,501"
 * @param {number|string|null|undefined} val 
 * @returns {string}
 */
export function formatWholeNumber(val) {
  return roundToWhole(val).toLocaleString("en-IN");
}

/**
 * Distributes an exact total amount among given raw shares using the Largest Remainder Method (Hare-Niemeyer).
 * Guarantees that sum(resultShares) === roundToWhole(totalAmount) exactly.
 * @param {number|string} totalAmount 
 * @param {Array<number|string>} rawShares 
 * @returns {number[]}
 */
export function distributeRoundedTotal(totalAmount, rawShares = []) {
  if (!rawShares || !rawShares.length) {
    return [];
  }

  const target = roundToWhole(totalAmount);
  const shares = rawShares.map(roundToWhole);
  let diff = target - shares.reduce((sum, s) => sum + s, 0);

  if (diff !== 0) {
    const indexed = rawShares
      .map((val, idx) => {
        const num = Number(val) || 0;
        const rem = num - Math.floor(num);
        return { idx, rem };
      })
      .sort((a, b) => (diff > 0 ? b.rem - a.rem : a.rem - b.rem));

    const step = diff > 0 ? 1 : -1;
    let count = Math.abs(diff);

    for (let i = 0; i < indexed.length && count > 0; i++) {
      shares[indexed[i].idx] += step;
      count--;
    }
  }

  return shares;
}

/**
 * Splits a total amount equally across a given number of participants into whole numbers.
 * Safely handles count <= 0.
 * @param {number|string} totalAmount 
 * @param {number} count 
 * @returns {number[]}
 */
export function distributeEqualSplit(totalAmount, count) {
  const safeCount = Math.max(0, parseInt(count, 10) || 0);
  if (safeCount <= 0) {
    return [];
  }
  const rawShare = (Number(totalAmount) || 0) / safeCount;
  const rawShares = Array(safeCount).fill(rawShare);
  return distributeRoundedTotal(totalAmount, rawShares);
}
