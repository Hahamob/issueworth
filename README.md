# IssueWorth

**Know whether a paid GitHub issue is worth your time before you code.**

IssueWorth turns a public GitHub issue URL into an evidence-backed work decision. It checks payout signals, repository health, maintainer activity, assignment status, competing claims, related pull requests, and historical merge behaviour. The result is a transparent score with a clear recommendation: **Pursue**, **Verify first**, or **Skip**.

IssueWorth is an original application created for the AWS Zero to Shipped Hackathon 2026.

**Live application:** https://d19gqr3o81kg2d.cloudfront.net

**Source repository:** https://github.com/Hahamob/issueworth

## Hackathon track

- Category: `#commercial-potential`
- Lane: `#startups`
- Built with: a coding agent connected to AWS through the Agent Toolkit for AWS / AWS MCP Server

## AWS architecture

```text
Browser
  │
  ├── CloudFront ── private S3 bucket (frontend)
  │
  └── API Gateway HTTP API ── Lambda (Node.js 20)
                                  ├── GitHub public API
                                  └── DynamoDB (audit cache + aggregate metrics)
```

The scoring engine is deterministic and evidence-first. It does not invent payout guarantees and does not require a GitHub token for the demo.

## Local preview

The frontend can be previewed with any static file server:

```powershell
npx serve frontend
```

Run API tests:

```powershell
node --test api/test/*.test.mjs
```

## Deploy

Prerequisites:

- AWS CLI v2 authenticated to your AWS account
- Permission to create CloudFormation, S3, CloudFront, Lambda, API Gateway, IAM roles, and DynamoDB resources

```powershell
.\scripts\deploy.ps1 -Region us-east-1
```

The script deploys the CloudFormation stack, uploads the frontend, injects the API URL, invalidates CloudFront, and prints the public URL.

## Privacy and safety

- Only public GitHub repository metadata is analysed.
- No GitHub credentials are requested or stored.
- Cached audit records expire automatically.
- Scores are decision support, not payment guarantees.
- The app never comments on, claims, or modifies a GitHub issue.

## Evidence for the submission

Before publishing the Builder Center project, add screenshots to `docs/evidence/` showing:

1. Codex configured through `aws configure agent-toolkit`.
2. The AWS MCP Server connected and able to inspect the deployment.
3. The live CloudFormation stack and public CloudFront URL.
4. A real IssueWorth report generated from a public GitHub issue.

## Verified production deployment

- Region: `us-east-1`
- CloudFormation stack: `issueworth`
- Public URL: https://d19gqr3o81kg2d.cloudfront.net
- API health check: `{"ok":true,"service":"issueworth","version":"1.0.0"}`
- Live analysis verified against `https://github.com/pallets/flask/issues/1`
