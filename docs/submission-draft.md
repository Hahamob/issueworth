# IssueWorth — Check the work before you do the work

Tags: `#commercial-potential` `#startups`

## The problem

Open-source contributors lose hours to paid issues that were already claimed, already solved, never actually funded, or posted in repositories that rarely merge outside work. The advertised amount is easy to see. The probability of getting paid is not.

IssueWorth gives independent developers a fast, evidence-backed answer before they invest their time.

## What I built

Paste a public GitHub issue URL. IssueWorth checks four evidence layers:

1. **Payment confidence** — stated amount, bounty labels, recognized payment automation, and proposal-only language.
2. **Repository health** — recent pushes, project status, audience, and sampled pull-request merge history.
3. **Real availability** — assignees, competing claim language, discussion volume, and related open pull requests.
4. **Task clarity** — acceptance criteria, reproducible examples, tests, and recent issue activity.

It returns a transparent 0–100 score and one of three decisions: Pursue, Verify first, or Skip. Every score is accompanied by positive evidence, warnings, deal breakers, and the underlying metrics. The application never claims work or modifies GitHub.

## Why it is different

Most bounty boards optimize for the size of the advertised pool. IssueWorth optimizes for a contributor's expected outcome. It explicitly separates a funded bounty from a proposed reward, detects already-rewarded issues left open, looks for parallel work, and makes the reasoning inspectable.

This is not another opaque AI opinion. The current engine is deterministic, reproducible, and deliberately honest about missing evidence.

## AWS architecture

- **Amazon CloudFront** delivers the responsive application globally.
- **Amazon S3** stores the private static frontend behind CloudFront Origin Access Control.
- **Amazon API Gateway** exposes a rate-limited HTTP API.
- **AWS Lambda (Arm64, Node.js 20)** gathers public GitHub evidence and runs the scoring engine.
- **Amazon DynamoDB** keeps short-lived, TTL-expiring audit records for product analytics without collecting GitHub credentials.
- **AWS CloudFormation** makes the full architecture reproducible.

The application is live at: **https://d19gqr3o81kg2d.cloudfront.net/**

Source code: **https://github.com/Hahamob/issueworth**

## How the coding agent helped me ship

I connected Codex Desktop to the official AWS MCP Server using AWS Sign-in OAuth and used the AWS Core Agent Toolkit throughout the project. The agent helped translate the product idea into a production-minded serverless architecture, implement the evidence engine and interface, write tests, generate infrastructure as code, deploy the application, and inspect the live AWS resources.

Proof of connection:

- OAuth connection: the official AWS MCP endpoint was registered in Codex and authenticated through AWS Sign-in.
- Connection test: the MCP server returned the official AWS Region catalog.
- Deployment inspection: authenticated MCP calls verified STS identity plus the CloudFormation stack, Lambda, API Gateway, DynamoDB, and CloudFront resources.
- Detailed, credential-safe verification: [`docs/evidence/aws-mcp-verification.md`](evidence/aws-mcp-verification.md)

Cover image: `docs/evidence/issueworth-cover-1200x675.jpg`

## Implementation quality

- Mobile-responsive and keyboard-accessible interface
- No GitHub credential collection
- Private S3 origin; CloudFront is the only public frontend path
- API throttling and least-privilege Lambda IAM role
- DynamoDB encryption, point-in-time recovery, and TTL deletion
- Automated unit tests for URL parsing, payout extraction, and critical scoring outcomes
- One-command repeatable deployment

## Market potential

The first users are freelance developers and open-source contributors. A future paid tier can add continuous watchlists, personalized stack matching, expected hourly-return estimates, organization reputation histories, and notifications when a high-confidence issue appears.

The same evidence model can also help maintainers demonstrate that their bounty programs are trustworthy.

## What I learned

Shipping changed the design. A clever score was not enough: the application needed to make uncertainty visible, keep the public demo safe without user credentials, and remain inexpensive to operate. The serverless AWS architecture gave the project a real public endpoint while keeping every component replaceable and auditable.
