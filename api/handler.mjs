import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { parseGitHubIssueUrl, scoreIssue } from "./lib/scoring.mjs";

const db = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME;
const APP_VERSION = "1.0.0";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
};

function response(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

async function github(path) {
  const result = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": `IssueWorth/${APP_VERSION}`,
      "x-github-api-version": "2022-11-28",
    },
  });
  if (result.status === 404) throw new Error("GitHub issue not found or repository is not public.");
  if (result.status === 403) throw new Error("GitHub rate limit reached. Please try again shortly.");
  if (!result.ok) throw new Error(`GitHub returned HTTP ${result.status}.`);
  return result.json();
}

function mentionsIssue(pull, number) {
  const text = `${pull.title || ""}\n${pull.body || ""}`;
  return new RegExp(`(?:#|issues\\/)${number}(?:\\b|$)`, "i").test(text);
}

async function persistAudit(id, source, report) {
  if (!TABLE_NAME) return;
  const now = Math.floor(Date.now() / 1000);
  await db.send(new PutItemCommand({
    TableName: TABLE_NAME,
    Item: {
      id: { S: id },
      source: { S: source },
      score: { N: String(report.score) },
      verdict: { S: report.verdict },
      createdAt: { N: String(now) },
      expiresAt: { N: String(now + 60 * 60 * 24 * 7) },
    },
  })).catch((error) => console.warn("Audit cache write failed", error.name));
}

export async function handler(event) {
  if (event.requestContext?.http?.method === "OPTIONS") return response(204, {});
  if (event.requestContext?.http?.method === "GET" && event.rawPath === "/health") {
    return response(200, { ok: true, service: "issueworth", version: APP_VERSION });
  }
  if (event.requestContext?.http?.method !== "POST" || event.rawPath !== "/analyze") {
    return response(404, { error: "Not found" });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const parsed = parseGitHubIssueUrl(payload.url);
    const base = `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
    const [issue, repo, comments, openPulls, closedPulls] = await Promise.all([
      github(`${base}/issues/${parsed.number}`),
      github(base),
      github(`${base}/issues/${parsed.number}/comments?per_page=50`),
      github(`${base}/pulls?state=open&per_page=100&sort=updated&direction=desc`),
      github(`${base}/pulls?state=closed&per_page=30&sort=updated&direction=desc`),
    ]);

    if (issue.pull_request) throw new Error("That URL points to a pull request, not an issue.");
    const relatedPulls = openPulls.filter((pull) => mentionsIssue(pull, parsed.number));
    const report = scoreIssue({ issue, repo, comments, relatedPulls, closedPulls });
    const canonicalUrl = `https://github.com/${parsed.owner}/${parsed.repo}/issues/${parsed.number}`;
    const id = `${parsed.owner}/${parsed.repo}#${parsed.number}-${Date.now()}`;
    await persistAudit(id, canonicalUrl, report);

    return response(200, {
      ...report,
      source: {
        url: canonicalUrl,
        repository: `${parsed.owner}/${parsed.repo}`,
        issueNumber: parsed.number,
        title: issue.title,
        ownerAvatar: repo.owner?.avatar_url,
        stars: repo.stargazers_count,
        language: repo.language,
      },
      generatedAt: new Date().toISOString(),
      disclaimer: "IssueWorth provides evidence-based decision support, not a payment guarantee.",
    });
  } catch (error) {
    console.error(error);
    const status = /valid|supported|not found|not public|pull request/i.test(error.message) ? 400 : 502;
    return response(status, { error: error.message || "Unable to analyse this issue." });
  }
}
