# Judging matrix

## Technical innovation and originality — 25%

- Reframes bounty discovery as expected-outcome analysis rather than a list sorted by advertised amount.
- Separates confirmed funding from self-proposed rewards and already-paid issues left open.
- Cross-checks issue state against related open pull requests and sampled merge behaviour.
- Deterministic, inspectable scoring avoids unsupported AI certainty.

## Implementation quality — 25%

- CloudFront with private S3 origin and Origin Access Control.
- API Gateway throttling in front of an Arm64 Lambda function.
- Least-privilege IAM: Lambda can only write to the one audit table.
- DynamoDB encryption, point-in-time recovery, and automatic TTL expiry.
- No GitHub token collection; public, read-only API use.
- Responsive interface, clear error handling, and automated scoring tests.
- Reproducible CloudFormation deployment.

## Community and market impact — 25%

- Protects independent developers from wasting unpaid hours.
- Helps new contributors understand signals experienced maintainers check manually.
- Can become a paid watchlist and opportunity-matching SaaS.
- Can give legitimate bounty programs a transparent trust profile.
- Success can be measured by avoided low-confidence work, high-confidence issue conversion, and realised contributor hourly return.

## Creativity and storytelling — 25%

- Opening tension: “The advertised amount is visible. The probability of getting paid is not.”
- Concrete user: an independent Python developer trying to earn $100/day from GitHub work.
- Live before/after demo using one trustworthy issue and one misleading bounty proposal.
- Visual scoring report turns a messy due-diligence process into a memorable decision.
- Honest close: IssueWorth does not promise payment; it makes uncertainty actionable.

