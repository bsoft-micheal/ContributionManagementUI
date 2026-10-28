import assert from "node:assert/strict";
import {
  isWfhWorkType,
  isOfficeWorkType,
  isWfhMember,
  isOfficeMember,
  getWorkTypeBadgeLabel,
} from "../workTypeHelper.js";

function runTests() {
  console.log("Starting tests for Work Type Helper...\n");

  // TEST 1: Work from home variations
  console.log("Test 1: WFH string detection");
  assert.equal(isWfhWorkType("WFH"), true);
  assert.equal(isWfhWorkType("wfh"), true);
  assert.equal(isWfhWorkType("Work From Home"), true);
  assert.equal(isWfhWorkType("Work from Home"), true);
  assert.equal(isWfhWorkType("work from home"), true);
  assert.equal(isWfhWorkType("Remote"), true);
  assert.equal(isWfhWorkType("Home"), true);
  console.log("✓ Test 1 passed: WFH strings correctly detected.\n");

  // TEST 2: Office string detection
  console.log("Test 2: Office string detection");
  assert.equal(isOfficeWorkType("Office"), true);
  assert.equal(isOfficeWorkType("office"), true);
  assert.equal(isOfficeWorkType("Work From Office"), true);
  assert.equal(isOfficeWorkType("WFO"), true);
  assert.equal(isOfficeWorkType("Onsite"), true);
  assert.equal(isOfficeWorkType(""), true);
  assert.equal(isOfficeWorkType(null), true);
  assert.equal(isOfficeWorkType(undefined), true);
  console.log("✓ Test 2 passed: Office strings correctly detected.\n");

  // TEST 3: Member object detection
  console.log("Test 3: Member object detection");
  const wfhMember1 = { name: "Anthony Infant Raj", workType: "Work From Home" };
  const wfhMember2 = { name: "Bob", memberType: "WFH" };
  const officeMember1 = { name: "Alice", workType: "Office" };
  const officeMember2 = { name: "Charlie", workType: "Work From Office" };
  const defaultMember = { name: "Dave" };

  assert.equal(isWfhMember(wfhMember1), true);
  assert.equal(isOfficeMember(wfhMember1), false);
  assert.equal(getWorkTypeBadgeLabel(wfhMember1), "WFH");

  assert.equal(isWfhMember(wfhMember2), true);
  assert.equal(isOfficeMember(wfhMember2), false);
  assert.equal(getWorkTypeBadgeLabel(wfhMember2), "WFH");

  assert.equal(isWfhMember(officeMember1), false);
  assert.equal(isOfficeMember(officeMember1), true);
  assert.equal(getWorkTypeBadgeLabel(officeMember1), "Office");

  assert.equal(isWfhMember(officeMember2), false);
  assert.equal(isOfficeMember(officeMember2), true);
  assert.equal(getWorkTypeBadgeLabel(officeMember2), "Office");

  assert.equal(isWfhMember(defaultMember), false);
  assert.equal(isOfficeMember(defaultMember), true);
  assert.equal(getWorkTypeBadgeLabel(defaultMember), "Office");
  console.log("✓ Test 3 passed: Member objects correctly processed.\n");

  // TEST 4: Array filtering
  console.log("Test 4: Array filtering with callbacks");
  const members = [wfhMember1, officeMember1, officeMember2, wfhMember2, defaultMember];
  const wfhList = members.filter(isWfhMember);
  const officeList = members.filter(isOfficeMember);

  assert.equal(wfhList.length, 2);
  assert.equal(officeList.length, 3);
  assert.equal(wfhList.length + officeList.length, members.length);
  console.log("✓ Test 4 passed: Array filtering verified.\n");

  console.log("All workTypeHelper tests passed successfully! 🎉");
}

runTests();

