import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldRecordVisit,
  VISIT_RECORD_INTERVAL_MS,
} from "../lib/visitCounter.ts";

test("records a visitor when there is no previous visit", () => {
  assert.equal(shouldRecordVisit(null, 1_000), true);
});

test("does not record another visit inside the 24-hour window", () => {
  assert.equal(shouldRecordVisit(1_000, 1_000 + VISIT_RECORD_INTERVAL_MS - 1), false);
});

test("records again after 24 hours", () => {
  assert.equal(shouldRecordVisit(1_000, 1_000 + VISIT_RECORD_INTERVAL_MS), true);
});

test("recovers if the stored time is ahead of the browser clock", () => {
  assert.equal(shouldRecordVisit(2_000, 1_000), true);
});
