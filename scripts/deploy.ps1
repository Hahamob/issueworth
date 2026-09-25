param(
  [string]$Region = "us-east-1",
  [string]$StackName = "issueworth"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI v2 is required. Install it, authenticate, and run this script again."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$buildRoot = Join-Path $projectRoot ".build"
$apiRoot = Join-Path $projectRoot "api"
$frontendRoot = Join-Path $projectRoot "frontend"
$frontendBuild = Join-Path $buildRoot "frontend"
$lambdaZip = Join-Path $buildRoot "issueworth-api.zip"

New-Item -ItemType Directory -Force -Path $buildRoot | Out-Null
if (Test-Path -LiteralPath $lambdaZip) { Remove-Item -LiteralPath $lambdaZip -Force }
if (Test-Path -LiteralPath $frontendBuild) { Remove-Item -LiteralPath $frontendBuild -Recurse -Force }

Push-Location $apiRoot
try {
  Compress-Archive -Path "handler.mjs", "lib" -DestinationPath $lambdaZip -CompressionLevel Optimal
} finally {
  Pop-Location
}

$accountId = aws sts get-caller-identity --query Account --output text
if ($LASTEXITCODE -ne 0 -or -not $accountId) { throw "AWS authentication failed." }
$artifactBucket = "issueworth-artifacts-$accountId-$Region".ToLowerInvariant()

aws s3api head-bucket --bucket $artifactBucket 2>$null
if ($LASTEXITCODE -ne 0) {
  if ($Region -eq "us-east-1") {
    aws s3api create-bucket --bucket $artifactBucket --region $Region | Out-Null
  } else {
    aws s3api create-bucket --bucket $artifactBucket --region $Region --create-bucket-configuration LocationConstraint=$Region | Out-Null
  }
}

$codeKey = "lambda/issueworth-api-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()).zip"
aws s3 cp $lambdaZip "s3://$artifactBucket/$codeKey" --region $Region | Out-Null

aws cloudformation deploy `
  --template-file (Join-Path $projectRoot "infra\template.yaml") `
  --stack-name $StackName `
  --region $Region `
  --capabilities CAPABILITY_NAMED_IAM `
  --parameter-overrides CodeBucket=$artifactBucket CodeKey=$codeKey `
  --tags Application=IssueWorth Hackathon=ZeroToShipped2026

if ($LASTEXITCODE -ne 0) { throw "CloudFormation deployment failed." }

$outputsJson = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json
$outputs = $outputsJson | ConvertFrom-Json
function Read-Output([string]$name) {
  return ($outputs | Where-Object OutputKey -eq $name).OutputValue
}

$frontendBucket = Read-Output "FrontendBucketName"
$distributionId = Read-Output "DistributionId"
$publicUrl = Read-Output "PublicUrl"
$apiUrl = Read-Output "ApiUrl"

Copy-Item -LiteralPath $frontendRoot -Destination $frontendBuild -Recurse
$config = "window.ISSUEWORTH_CONFIG = { apiBaseUrl: `"$apiUrl`" };"
Set-Content -LiteralPath (Join-Path $frontendBuild "config.js") -Value $config -Encoding utf8NoBOM

aws s3 sync $frontendBuild "s3://$frontendBucket" --delete --region $Region | Out-Null
aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*" | Out-Null

Write-Output "IssueWorth deployment complete."
Write-Output "Public URL: $publicUrl"
Write-Output "API URL:    $apiUrl"
Write-Output "Allow several minutes for the first CloudFront deployment to finish."

