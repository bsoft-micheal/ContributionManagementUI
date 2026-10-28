import assert from "node:assert/strict";
import {
  sanitizeAmountInput,
  validateAmountInput,
  calculateLiveRemainingBudget,
  calculateLiveTotalSpent,
  calculateLiveExtraAmountSpent,
  calculateTotalExpense,
  canAddAdditionalExpenseRow,
  getEventPlannedBudget,
  MAX_ADDITIONAL_EXPENSE_ROWS,
  MAX_AMOUNT_DIGITS,
  MAX_AMOUNT_VALUE,
} from "../expenseBudgetCalculations.js";

function runTests() {
  console.log("Starting tests for Expense Budget Calculations & Validation...\n");

  // ── TEST 1: Sanitization of Amount Inputs (Requirement 4) ──
  console.log("Test 1: Input sanitization (digits 0-9 only, max 5 digits)");
  assert.equal(sanitizeAmountInput(""), "", "empty string should stay empty");
  assert.equal(sanitizeAmountInput(null), "", "null should return empty string");
  assert.equal(sanitizeAmountInput(undefined), "", "undefined should return empty string");
  assert.equal(sanitizeAmountInput("12345"), "12345", "valid 5 digits should remain intact");
  assert.equal(sanitizeAmountInput("1234567"), "12345", "should slice down to 5 digits");
  assert.equal(sanitizeAmountInput("12.50"), "1250", "should strip decimal point");
  assert.equal(sanitizeAmountInput("1,500"), "1500", "should strip comma");
  assert.equal(sanitizeAmountInput(" -500 "), "500", "should strip minus and spaces");
  assert.equal(sanitizeAmountInput("+100"), "100", "should strip plus");
  assert.equal(sanitizeAmountInput("1e5"), "15", "should strip scientific notation e");
  assert.equal(sanitizeAmountInput("₹5000"), "5000", "should strip currency rupee symbol");
  assert.equal(sanitizeAmountInput("$9999"), "9999", "should strip dollar symbol");
  assert.equal(sanitizeAmountInput("abc@#$"), "", "should strip letters and special chars");
  console.log("✓ Test 1 passed: Input sanitization verified.\n");

  // ── TEST 2: Validation of Amount Inputs (Requirement 4) ──
  console.log("Test 2: Validation of amounts before saving");
  const valid = validateAmountInput("5000", { required: true, fieldName: "Amount" });
  assert.equal(valid.isValid, true);
  assert.equal(valid.numValue, 5000);

  const hasDecimal = validateAmountInput("500.5", { required: true });
  assert.equal(hasDecimal.isValid, false, "decimals must be rejected");

  const hasComma = validateAmountInput("5,000", { required: true });
  assert.equal(hasComma.isValid, false, "commas must be rejected");

  const hasNegative = validateAmountInput("-500", { required: true });
  assert.equal(hasNegative.isValid, false, "negative signs must be rejected");

  const tooLong = validateAmountInput("123456", { required: true });
  assert.equal(tooLong.isValid, false, "exceeding 5 digits must be rejected");

  const zeroAmount = validateAmountInput("0", { required: true });
  assert.equal(zeroAmount.isValid, false, "amount must be greater than 0");
  console.log("✓ Test 2 passed: Amount input validation verified.\n");

  // ── TEST 3: Live Calculations on Main Budget Change (Requirements 1 & 5) ──
  console.log("Test 3: Live updates when Main Budget Amount changes");
  const expectedBudget = 10000;
  const priorSpent = 0;

  // When amount is 0
  assert.equal(calculateLiveRemainingBudget(expectedBudget, priorSpent, 0), 10000);
  assert.equal(calculateLiveTotalSpent(priorSpent, 0, 0), 0);
  assert.equal(calculateLiveExtraAmountSpent(expectedBudget, priorSpent, 0, 0), 0);
  assert.equal(calculateTotalExpense(0, 0), 0);

  // When amount is 4000
  assert.equal(calculateLiveRemainingBudget(expectedBudget, priorSpent, 4000), 6000);
  assert.equal(calculateLiveTotalSpent(priorSpent, 4000, 0), 4000);
  assert.equal(calculateLiveExtraAmountSpent(expectedBudget, priorSpent, 4000, 0), 0);
  assert.equal(calculateTotalExpense(4000, 0), 4000);

  // When amount reaches expected budget (10000)
  assert.equal(calculateLiveRemainingBudget(expectedBudget, priorSpent, 10000), 0);
  assert.equal(calculateLiveTotalSpent(priorSpent, 10000, 0), 10000);
  assert.equal(calculateLiveExtraAmountSpent(expectedBudget, priorSpent, 10000, 0), 0);
  assert.equal(calculateTotalExpense(10000, 0), 10000);

  // When amount exceeds expected budget
  assert.equal(calculateLiveRemainingBudget(expectedBudget, priorSpent, 12000), 0);
  assert.equal(calculateLiveTotalSpent(priorSpent, 12000, 0), 12000);
  assert.equal(calculateLiveExtraAmountSpent(expectedBudget, priorSpent, 12000, 0), 2000);
  assert.equal(calculateTotalExpense(12000, 0), 12000);
  console.log("✓ Test 3 passed: Live updates on Main Budget change verified.\n");

  // ── TEST 4: Add Row Gating Logic (Requirement 2) ──
  console.log("Test 4: Add Row gating logic");
  // Main Budget < Expected Budget -> Add Row DISABLED
  assert.equal(
    canAddAdditionalExpenseRow({
      eventSelected: true,
      expectedBudget: 10000,
      priorSpent: 0,
      mainBudgetAmount: 9999,
      currentRowsCount: 0,
    }),
    false,
    "Add Row must be disabled when Main Budget < Expected Budget"
  );

  // Main Budget reaches Expected Budget (10000) -> Add Row ENABLED
  assert.equal(
    canAddAdditionalExpenseRow({
      eventSelected: true,
      expectedBudget: 10000,
      priorSpent: 0,
      mainBudgetAmount: 10000,
      currentRowsCount: 0,
    }),
    true,
    "Add Row must be enabled when Main Budget reaches Expected Budget"
  );

  // Cannot add second row if first row has not had values entered
  assert.equal(
    canAddAdditionalExpenseRow({
      eventSelected: true,
      expectedBudget: 10000,
      priorSpent: 0,
      mainBudgetAmount: 10000,
      rows: [{ reason: "", amount: "" }],
    }),
    false,
    "Add Row must be disabled if existing row is empty"
  );

  assert.equal(
    canAddAdditionalExpenseRow({
      eventSelected: true,
      expectedBudget: 10000,
      priorSpent: 0,
      mainBudgetAmount: 10000,
      rows: [{ reason: "Supplies", amount: "0" }],
    }),
    false,
    "Add Row must be disabled if existing row amount is 0"
  );

  assert.equal(
    canAddAdditionalExpenseRow({
      eventSelected: true,
      expectedBudget: 10000,
      priorSpent: 0,
      mainBudgetAmount: 10000,
      rows: [{ reason: "Supplies", amount: "500" }],
    }),
    true,
    "Add Row must be enabled once existing row has valid reason and amount"
  );

  // After valid additional row added, allow subsequent rows up to 10
  const validRows = [{ reason: "Row 1", amount: "100" }];
  for (let rows = 1; rows < 10; rows++) {
    assert.equal(
      canAddAdditionalExpenseRow({
        eventSelected: true,
        expectedBudget: 10000,
        priorSpent: 0,
        mainBudgetAmount: 10000,
        rows: validRows,
        currentRowsCount: rows,
      }),
      true,
      `Add Row must be allowed for row count ${rows} when current rows are valid`
    );
  }

  // At 10 rows -> Add Row DISABLED
  assert.equal(
    canAddAdditionalExpenseRow({
      eventSelected: true,
      expectedBudget: 10000,
      priorSpent: 0,
      mainBudgetAmount: 10000,
      currentRowsCount: 10,
    }),
    false,
    "Add Row must be disabled when row count reaches 10"
  );

  // If a row is deleted (count drops from 10 to 9) -> Add Row ENABLED again
  assert.equal(
    canAddAdditionalExpenseRow({
      eventSelected: true,
      expectedBudget: 10000,
      priorSpent: 0,
      mainBudgetAmount: 10000,
      currentRowsCount: 9,
    }),
    true,
    "Add Row must re-enable when a row is deleted and count is < 10"
  );
  console.log("✓ Test 4 passed: Add Row gating logic verified.\n");

  // ── TEST 5: Additional Rows & Extra Amount Spent (Requirement 3) ──
  console.log("Test 5: Live Extra Amount Spent and Total Expense updates on rows add/edit/delete");
  const mainBudget = 10000;
  const row1 = 1500;
  const row2 = 2500;

  // Add row 1
  let extraSum = row1;
  assert.equal(calculateLiveExtraAmountSpent(expectedBudget, priorSpent, mainBudget, extraSum), 1500);
  assert.equal(calculateTotalExpense(mainBudget, extraSum), 11500);
  assert.equal(calculateLiveTotalSpent(priorSpent, mainBudget, extraSum), 11500);

  // Add row 2
  extraSum = row1 + row2;
  assert.equal(calculateLiveExtraAmountSpent(expectedBudget, priorSpent, mainBudget, extraSum), 4000);
  assert.equal(calculateTotalExpense(mainBudget, extraSum), 14000);
  assert.equal(calculateLiveTotalSpent(priorSpent, mainBudget, extraSum), 14000);

  // Edit row 2 to 3000
  extraSum = row1 + 3000;
  assert.equal(calculateLiveExtraAmountSpent(expectedBudget, priorSpent, mainBudget, extraSum), 4500);
  assert.equal(calculateTotalExpense(mainBudget, extraSum), 14500);

  // Delete row 1 (only row 2 with 3000 remains)
  extraSum = 3000;
  assert.equal(calculateLiveExtraAmountSpent(expectedBudget, priorSpent, mainBudget, extraSum), 3000);
  assert.equal(calculateTotalExpense(mainBudget, extraSum), 13000);
  assert.equal(calculateLiveTotalSpent(priorSpent, mainBudget, extraSum), 13000);
  console.log("✓ Test 5 passed: Extra amount and total expense live recalculation verified.\n");

  // ── TEST 6: Editing existing expense with prior spent (Never double counting) ──
  console.log("Test 6: Editing expense with prior expenses from DB (No double counting)");
  // Suppose event expected budget is 20000, another expense already spent 5000.
  const eventExpected = 20000;
  const otherExpenseSpent = 5000;
  const effectiveExpected = 15000;

  // Initial form entry for this expense: 15000
  assert.equal(calculateLiveRemainingBudget(eventExpected, otherExpenseSpent, 15000), 0);
  assert.equal(calculateLiveTotalSpent(otherExpenseSpent, 15000, 0), 20000);
  assert.equal(calculateLiveExtraAmountSpent(eventExpected, otherExpenseSpent, 15000, 0), 0);

  // Add extra row: 2000
  assert.equal(calculateLiveTotalSpent(otherExpenseSpent, 15000, 2000), 22000);
  assert.equal(calculateLiveExtraAmountSpent(eventExpected, otherExpenseSpent, 15000, 2000), 2000);
  assert.equal(calculateTotalExpense(15000, 2000), 17000);
  console.log("✓ Test 6 passed: Editing and prior expenses handling verified.\n");

  
  // ── TEST 7: Event Planned Budget Resolution (with Sponsor Contributions) ──
  console.log("Test 7: Event Planned Budget Resolution with Sponsor Contribution");
  // Case A: Event with ₹10,000 planned budget and ₹5,000 sponsor contribution (Felix R)
  const eventWithSponsor = {
    eventName: "Suppose Christmassss",
    baseAmount: 10000,
    originalPlannedBudget: 10000,
    totalExpectedAmount: 5000, // Member collection requirement
    requireSponsorContribution: true,
    sponsorContributionAmount: 5000,
    sponsors: [{ userId: "123", amount: 5000 }],
  };
  assert.equal(
    getEventPlannedBudget(eventWithSponsor),
    10000,
    "Planned budget must be ₹10,000 even though member collection is ₹5,000 due to sponsor"
  );

  // Case B: Standard event without sponsor
  const standardEvent = {
    eventName: "Team Lunch",
    baseAmount: 5000,
    originalPlannedBudget: 5000,
    totalExpectedAmount: 5000,
  };
  assert.equal(getEventPlannedBudget(standardEvent), 5000);

  // Case C: Event with Amount in Hand deduction
  const eventWithHand = {
    eventName: "Annual Party",
    baseAmount: 20000,
    originalPlannedBudget: 20000,
    totalExpectedAmount: 15000,
    useAvailableBalance: true,
    allocatedAmount: 5000,
  };
  assert.equal(getEventPlannedBudget(eventWithHand), 20000);

  // Case D: Event with fallback member collection and sponsor when baseAmount was not set
  const eventFallback = {
    eventName: "New Year",
    totalExpectedAmount: 6000,
    sponsorContributionAmount: 4000,
  };
  assert.equal(getEventPlannedBudget(eventFallback), 10000);

  console.log("✓ Test 7 passed: getEventPlannedBudget handles sponsors, balance deductions, and standard events.\n");

  console.log("ALL TESTS PASSED SUCCESSFULLY! (7/7)");
}

runTests();
