import test from "node:test";
import assert from "node:assert/strict";
import { extractPayout, parseGitHubIssueUrl, scoreIssue } from "../lib/scoring.mjs";

const now = new Date("2026-09-25T00:00:00Z").getTime();

test("extracts the largest stated USD payout", () => {
  assert.equal(extractPayout("$50 starter and USD 250 completion bounty"), 250);
  assert.equal(extractPayout("/bounty $1.5k"), 1500);
  assert.equal(extractPayout("no amount"), null);
});

test("parses canonical GitHub issue URLs", () => {
  assert.deepEqual(parseGitHubIssueUrl("https://github.com/acme/widget/issues/42"), {
    owner: "acme",
    repo: "widget",
    number: 42,
  });
  assert.throws(() => parseGitHubIssueUrl("https://example.com/acme/widget/issues/42"));
});

test("scores a funded, active and unclaimed issue highly", () => {
  const report = scoreIssue({
    now,
    issue: {
      state: "open",
      title: "Add CSV export",
      body: "Acceptance criteria: export tested CSV files. /bounty $250",
      labels: [{ name: "💎 Bounty" }],
      assignees: [],
      comments: 1,
      created_at: "2026-09-20T00:00:00Z",
      updated_at: "2026-09-24T00:00:00Z",
    },
    repo: { pushed_at: "2026-09-24T00:00:00Z", stargazers_count: 450, archived: false },
    comments: [{ body: "Bounty funded through Algora", user: { login: "algora-pbc[bot]" } }],
    relatedPulls: [],
    closedPulls: [{ merged_at: "2026-09-22" }, { merged_at: "2026-09-21" }],
  });
  assert.equal(report.verdict, "pursue");
  assert.ok(report.score >= 72);
});

test("blocks already assigned proposal-only work", () => {
  const report = scoreIssue({
    now,
    issue: {
      state: "open",
      title: "Bounty proposal $50",
      body: "Proposed amount, not an existing award. Fix is already in PR #9.",
      labels: [],
      assignees: [{ login: "someone" }],
      comments: 8,
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-24T00:00:00Z",
    },
    repo: { pushed_at: "2026-09-24T00:00:00Z", stargazers_count: 10, archived: false },
    comments: [],
    relatedPulls: [{ number: 9 }],
    closedPulls: [],
  });
  assert.equal(report.verdict, "skip");
  assert.ok(report.evidence.blockers.length >= 2);
});
