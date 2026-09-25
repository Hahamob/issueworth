# AWS MCP connection verification

Verified on **2026-09-25** using the official AWS MCP Server connected to Codex Desktop through OAuth.

## Connection

- MCP server: `aws-mcp-oauth`
- Endpoint: `https://aws-mcp.us-east-1.api.aws/mcp`
- Authentication: AWS Sign-in OAuth
- Account: `2777…2771` (masked intentionally)
- Region used for deployment inspection: `us-east-1`

The connection first returned the official AWS Region catalog, including `us-east-1`, and then completed authenticated, read-only AWS API calls.

## Verified API calls

All of these calls returned `status: success` through the AWS MCP Server:

- STS `GetCallerIdentity`
- CloudFormation `DescribeStacks`
- CloudFormation `ListStackResources`
- Lambda `GetFunctionConfiguration`
- DynamoDB `DescribeTable`
- CloudFront `GetDistribution`
- API Gateway v2 `GetApi`

## Deployed application evidence

- CloudFormation stack: `issueworth`
- Stack state: `CREATE_COMPLETE`
- Stack resources: 13, all reported `CREATE_COMPLETE`
- Lambda: `issueworth-analyzer-issueworth`, `Active`, Arm64, Node.js 20
- DynamoDB: `issueworth-AuditTable-PNIJ0C7PZAMO`, `ACTIVE`, on-demand billing, encryption enabled
- CloudFront distribution: `E3RXEXNLLB798L`, `Deployed`, HTTPS redirect enabled, S3 origin protected by Origin Access Control
- HTTP API: `kfkod3itj2`, public endpoint active with CORS configured
- Live application: https://d19gqr3o81kg2d.cloudfront.net/
- API endpoint: https://kfkod3itj2.execute-api.us-east-1.amazonaws.com

## End-to-end test

The public application successfully analyzed `https://github.com/pallets/flask/issues/1` using live public GitHub evidence and returned an IssueWorth report. The report correctly detected that the issue is closed, found no verified payout, and recommended skipping it.

No AWS credentials, OAuth tokens, or full identity ARN are included in this document.
