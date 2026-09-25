const DAY = 86_400_000;

export function daysSince(value, now = Date.now()) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((now - time) / DAY));
}

export function extractPayout(text = "") {
  const normalized = String(text).replace(/,/g, "");
  const matches = [...normalized.matchAll(/(?:\$|USD\s*)(\d+(?:\.\d{1,2})?)(?:\s*(k))?/gi)];
  const values = matches.map((match) => Number(match[1]) * (match[2] ? 1000 : 1));
  return values.length ? Math.max(...values) : null;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function scoreIssue(input) {
  const { issue, repo, comments = [], relatedPulls = [], closedPulls = [], now = Date.now() } = input;
  const labels = (issue.labels || []).map((label) => String(label.name || label).toLowerCase());
  const bodyText = `${issue.title || ""}\n${issue.body || ""}\n${comments.map((c) => c.body || "").join("\n")}`;
  const payout = extractPayout(bodyText);
  const issueAge = daysSince(issue.created_at, now) ?? 9999;
  const issueFreshness = daysSince(issue.updated_at, now) ?? 9999;
  const repoFreshness = daysSince(repo.pushed_at, now) ?? 9999;
  const assignees = issue.assignees?.length || 0;
  const claimMentions = (bodyText.match(/\b(?:claim|attempt|working on|assigned|reserved)\b/gi) || []).length;
  const botAuthored = comments.filter((c) => /\[bot\]$/i.test(c.user?.login || ""));
  const paymentPlatform = /algora-pbc|algora bot|polar|drips|gitcoin/i.test(bodyText);
  const rewarded = labels.some((label) => /rewarded|paid|completed/.test(label));
  const proposalOnly = /proposal|proposed amount|requested reward|not an existing award/i.test(bodyText);
  const suspicious = /system prompt|initialization payload|reveal.*(?:prompt|secret|credential)|star this repo/i.test(bodyText);
  const mergedCount = closedPulls.filter((pull) => pull.merged_at).length;
  const mergeRatio = closedPulls.length ? mergedCount / closedPulls.length : null;

  let payment = 12;
  if (payout) payment += 25;
  if (paymentPlatform || botAuthored.length) payment += 22;
  if (labels.some((label) => /bounty|reward|paid/.test(label))) payment += 16;
  if (proposalOnly) payment -= 45;
  if (rewarded) payment -= 70;

  let activity = 25;
  if (repoFreshness <= 7) activity += 35;
  else if (repoFreshness <= 30) activity += 25;
  else if (repoFreshness <= 90) activity += 12;
  else activity -= 15;
  if ((repo.stargazers_count || 0) >= 100) activity += 12;
  if ((repo.stargazers_count || 0) >= 1000) activity += 8;
  if (repo.archived || repo.disabled) activity -= 70;
  if (mergeRatio !== null) activity += Math.round(mergeRatio * 20);

  let availability = 88;
  availability -= assignees * 45;
  availability -= relatedPulls.length * 28;
  availability -= Math.min(30, claimMentions * 5);
  availability -= Math.min(18, (issue.comments || 0) * 2);
  if (issue.state !== "open") availability = 0;

  let clarity = 30;
  if ((issue.body || "").length >= 300) clarity += 22;
  if (/acceptance criteria|expected behavior|requirements|definition of done|test/i.test(issue.body || "")) clarity += 22;
  if (/repro|steps to reproduce|example|screenshot|mockup/i.test(issue.body || "")) clarity += 12;
  if (issueAge > 365) clarity -= 12;
  if (issueFreshness <= 30) clarity += 10;

  const components = {
    paymentConfidence: clamp(payment),
    repositoryHealth: clamp(activity),
    availability: clamp(availability),
    taskClarity: clamp(clarity),
  };

  let score =
    components.paymentConfidence * 0.34 +
    components.repositoryHealth * 0.22 +
    components.availability * 0.28 +
    components.taskClarity * 0.16;

  const blockers = [];
  const warnings = [];
  const positives = [];
  if (issue.state !== "open") blockers.push("The issue is closed.");
  if (assignees) blockers.push(`${assignees} assignee${assignees > 1 ? "s are" : " is"} already attached.`);
  if (relatedPulls.length) blockers.push(`${relatedPulls.length} related open pull request${relatedPulls.length > 1 ? "s" : ""} detected.`);
  if (rewarded) blockers.push("The issue appears to have already been rewarded or paid.");
  if (proposalOnly) blockers.push("The amount is proposed, not confirmed funding.");
  if (suspicious) blockers.push("Potential unsafe or engagement-farming instructions detected.");
  if (!payout) warnings.push("No unambiguous USD amount was found.");
  if (!paymentPlatform && !botAuthored.length) warnings.push("No recognized payment-platform evidence was found.");
  if (repoFreshness > 90) warnings.push(`Repository has not been pushed to for ${repoFreshness} days.`);
  if ((issue.comments || 0) >= 8) warnings.push(`Competition may be high: ${issue.comments} issue comments.`);
  if (payout) positives.push(`A stated amount of $${payout.toLocaleString("en-US")} was found.`);
  if (paymentPlatform || botAuthored.length) positives.push("Recognized payment or automation evidence is present.");
  if (repoFreshness <= 30) positives.push("Repository development is recently active.");
  if (!assignees && !relatedPulls.length) positives.push("No assignee or related open PR was detected.");
  if (mergeRatio !== null && mergeRatio >= 0.35) positives.push(`Recent sampled PR merge ratio is ${Math.round(mergeRatio * 100)}%.`);

  if (blockers.length) score -= Math.min(55, blockers.length * 18);
  score = clamp(score);
  const verdict = score >= 72 ? "pursue" : score >= 48 ? "verify" : "skip";

  return {
    score,
    verdict,
    payout,
    components,
    evidence: { positives, warnings, blockers },
    metrics: {
      issueAgeDays: issueAge,
      lastIssueActivityDays: issueFreshness,
      lastRepoPushDays: repoFreshness,
      assignees,
      relatedOpenPulls: relatedPulls.length,
      sampledClosedPulls: closedPulls.length,
      sampledMergedPulls: mergedCount,
      sampledMergeRatio: mergeRatio === null ? null : Math.round(mergeRatio * 100),
    },
  };
}

export function parseGitHubIssueUrl(value) {
  let url;
  try {
    url = new URL(String(value).trim());
  } catch {
    throw new Error("Enter a valid GitHub issue URL.");
  }
  if (url.hostname !== "github.com") throw new Error("Only github.com issue URLs are supported.");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 4 || parts[2] !== "issues" || !/^\d+$/.test(parts[3])) {
    throw new Error("Use a URL like https://github.com/owner/repository/issues/123.");
  }
  return { owner: parts[0], repo: parts[1], number: Number(parts[3]) };
}
