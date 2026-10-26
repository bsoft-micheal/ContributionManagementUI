/**
 * Utility functions for Expense Form live calculations, input sanitization,
 * and Add Row gating rules in Contribution Management System.
 */

export const MAX_ADDITIONAL_EXPENSE_ROWS = 10;
export const MAX_AMOUNT_DIGITS = 5;
export const MAX_AMOUNT_VALUE = 99999;

/**
 * Strictly sanitizes an amount input value:
 * - Accepts digits 0-9 only
 * - Strips decimals, commas, spaces, letters, minus/plus signs, currency symbols, and special chars
 * - Enforces maximum length of 5 digits (0 - 99999)
 *
 * @param {string|number} val
 * @returns {string} Sanitized string containing only digits (0-5 chars)
 */
export function sanitizeAmountInput(val) {
  if (val === undefined || val === null) return "";
  const str = String(val);
  return str.replace(/[^0-9]/g, "").slice(0, MAX_AMOUNT_DIGITS);
}

/**
 * Validates whether an amount string is strictly formatted as 0-9 digits up to 5 digits,
 * within allowable bounds [minAmount, 99999].
 *
 * @param {string} val
 * @param {Object} options
 * @returns {{ isValid: boolean, error?: string, numValue: number }}
 */
export function validateAmountInput(val, {
  required = true,
  minAmount = 1,
  fieldName = "Amount",
} = {}) {
  const sanitized = sanitizeAmountInput(val);
  if (!val && !sanitized) {
    if (required) {
      return { isValid: false, error: `${fieldName} is required`, numValue: 0 };
    }
    return { isValid: true, error: null, numValue: 0 };
  }

  // Check if original value had disallowed characters
  if (String(val).trim() !== sanitized) {
    return {
      isValid: false,
      error: `${fieldName} must contain digits 0-9 only (max 5 digits)`,
      numValue: Number(sanitized) || 0,
    };
  }

  if (sanitized.length > MAX_AMOUNT_DIGITS) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${MAX_AMOUNT_DIGITS} digits`,
      numValue: Number(sanitized) || 0,
    };
  }

  const num = Number(sanitized);
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} is invalid`, numValue: 0 };
  }

  if (required && num < minAmount) {
    return {
      isValid: false,
      error: `${fieldName} must be greater than ₹0`,
      numValue: num,
    };
  }

  if (num > MAX_AMOUNT_VALUE) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ₹${MAX_AMOUNT_VALUE.toLocaleString("en-IN")}`,
      numValue: num,
    };
  }

  return { isValid: true, error: null, numValue: num };
}

/**
 * Remaining Budget = max(Expected Budget - Main Budget Amount, 0)
 * When other historical expenses exist (priorSpent), remaining is calculated
 * against the remaining expected budget available to this expense:
 * effectiveExpected = max(0, expectedBudget - priorSpent)
 * Remaining Budget = max(0, effectiveExpected - mainBudgetAmount)
 */
export function calculateLiveRemainingBudget(expectedBudget, priorSpent, mainBudgetAmount) {
  const exp = Math.max(0, Number(expectedBudget) || 0);
  const prior = Math.max(0, Number(priorSpent) || 0);
  const main = Math.max(0, Number(mainBudgetAmount) || 0);

  const effectiveExpected = Math.max(0, exp - prior);
  return Math.max(0, effectiveExpected - main);
}

/**
 * Total Spent consistent with existing dashboard business logic:
 * Total Spent = prior expenses + current main budget amount + additional expenses sum
 */
export function calculateLiveTotalSpent(priorSpent, mainBudgetAmount, additionalExpensesSum) {
  const prior = Math.max(0, Number(priorSpent) || 0);
  const main = Math.max(0, Number(mainBudgetAmount) || 0);
  const extra = Math.max(0, Number(additionalExpensesSum) || 0);
  return Math.round(prior + main + extra);
}

/**
 * Extra Amount Spent:
 * Any spending beyond the expected budget:
 * Extra Amount Spent = max(0, Total Spent - Expected Budget)
 */
export function calculateLiveExtraAmountSpent(expectedBudget, priorSpent, mainBudgetAmount, additionalExpensesSum) {
  const exp = Math.max(0, Number(expectedBudget) || 0);
  const totalSpent = calculateLiveTotalSpent(priorSpent, mainBudgetAmount, additionalExpensesSum);
  return Math.round(Math.max(0, totalSpent - exp));
}

/**
 * Total Expense = Main Budget Amount + sum of additional expense amounts
 */
export function calculateTotalExpense(mainBudgetAmount, additionalExpensesSum) {
  const main = Math.max(0, Number(mainBudgetAmount) || 0);
  const extra = Math.max(0, Number(additionalExpensesSum) || 0);
  return Math.round(main + extra);
}

/**
 * Determines whether "+ Add Row" can be clicked:
 * Rule 1: Disabled until Main Budget Amount reaches Expected Budget and Remaining Budget is zero.
 * Rule 2: Cannot add another row without entering valid Reason and Amount (>0) in existing rows.
 * Rule 3: Allow subsequent rows up to 10 rows.
 *
 * @param {Object} params
 * @param {boolean} params.eventSelected
 * @param {number} params.expectedBudget
 * @param {number} params.priorSpent
 * @param {number} params.mainBudgetAmount
 * @param {Array} [params.rows=[]]
 * @param {number} params.currentRowsCount
 * @param {number} [params.maxRows=10]
 * @returns {boolean}
 */
export function canAddAdditionalExpenseRow({
  eventSelected = true,
  expectedBudget = 0,
  priorSpent = 0,
  mainBudgetAmount = 0,
  rows = [],
  currentRowsCount = 0,
  maxRows = MAX_ADDITIONAL_EXPENSE_ROWS,
} = {}) { 
  if (!eventSelected) return false;
  const count = Array.isArray(rows) && rows.length > 0 ? rows.length : currentRowsCount;
  if (count >= maxRows) return false;

  // Rule: Do not allow adding subsequent row if any existing row has not had values entered
  if (Array.isArray(rows) && rows.length > 0) {
    const hasIncompleteRow = rows.some((r) => {
      const reasonEmpty = !r.reason || !r.reason.trim();
      const amountVal = Number(r.amount);
      const amountEmpty = !r.amount || !String(r.amount).trim() || isNaN(amountVal) || amountVal <= 0;
      return reasonEmpty || amountEmpty;
    });
    if (hasIncompleteRow) return false;
  }

  const exp = Math.max(0, Number(expectedBudget) || 0);
  if (exp <= 0) {
    // If event has no expected budget defined, user can add rows up to maxRows
    return true;
  }

  const prior = Math.max(0, Number(priorSpent) || 0);
  const main = Math.max(0, Number(mainBudgetAmount) || 0);
  const effectiveExpected = Math.max(0, exp - prior);
  const remaining = Math.max(0, effectiveExpected - main);

  // Must reach expected budget and remaining budget must be 0
  return main >= effectiveExpected && remaining === 0;
}
