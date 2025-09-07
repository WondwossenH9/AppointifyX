# AppointifyX Deployment Guide

## Prerequisites

### Required Tools
- AWS CLI v2
- Terraform v1.6+
- Node.js v18+
- Git

### AWS Account Setup
1. Create AWS account
2. Configure AWS CLI with credentials
3. Enable required AWS services
4. Set up billing alerts

### GitHub Setup
1. Fork/clone the repository
2. Set up GitHub Actions secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/appointifyx.git
cd appointifyx
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run build
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Environment Variables
Create `.env.local` in frontend directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your-pool-id
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=your-client-id
NEXT_PUBLIC_COGNITO_REGION=us-east-1
```

## AWS Deployment

### 1. Infrastructure Deployment

#### Development Environment
```bash
cd infra/environments/dev
terraform init
terraform plan
terraform apply
```

#### Production Environment
```bash
cd infra/environments/prod
terraform init
terraform plan
terraform apply
```

### 2. Lambda Function Deployment

#### Manual Deployment
```bash
cd backend
npm run build
npm run zip
aws s3 cp appointments-handler.zip s3://your-lambda-bucket/
aws lambda update-function-code \
  --function-name appointifyx-appointments-dev \
  --s3-bucket your-lambda-bucket \
  --s3-key appointments-handler.zip
```

#### Automated Deployment
The GitHub Actions workflow handles this automatically on push to main branch.

### 3. Frontend Deployment

#### Manual Deployment
```bash
cd frontend
npm run build
aws s3 sync out/ s3://your-frontend-bucket/ --delete
aws cloudfront create-invalidation \
  --distribution-id your-distribution-id \
  --paths "/*"
```

#### Automated Deployment
The GitHub Actions workflow handles this automatically.

## Configuration

### Terraform Variables
Create `terraform.tfvars` in environment directory:
```hcl
environment = "dev"
aws_region  = "us-east-1"
domain_name = "your-domain.com"  # Optional
```

### Lambda Environment Variables
Set in Terraform configuration:
```hcl
environment {
  variables = {
    APPOINTMENTS_TABLE_NAME = var.appointments_table_name
    TENANTS_TABLE_NAME      = var.tenants_table_name
    USERS_TABLE_NAME        = var.users_table_name
    COGNITO_USER_POOL_ID    = var.cognito_user_pool_id
    NODE_ENV                = var.environment
  }
}
```

## Verification

### 1. Infrastructure Verification
```bash
# Check Terraform outputs
terraform output

# Verify resources
aws lambda list-functions
aws dynamodb list-tables
aws s3 ls
```

### 2. Application Verification
```bash
# Test API endpoint
curl https://your-api-gateway-url.amazonaws.com/dev/health

# Test frontend
open https://your-cloudfront-url.cloudfront.net
```

### 3. Monitoring Setup
```bash
# Check CloudWatch logs
aws logs describe-log-groups

# Check X-Ray traces
aws xray get-trace-summaries --time-range-type TimeRangeByStartTime --start-time 2024-01-01 --end-time 2024-01-02
```

## Troubleshooting

### Common Issues

#### 1. Terraform State Issues
```bash
# Reinitialize Terraform
terraform init -reconfigure

# Import existing resources
terraform import aws_s3_bucket.example bucket-name
```

#### 2. Lambda Deployment Issues
```bash
# Check Lambda logs
aws logs tail /aws/lambda/function-name --follow

# Test Lambda function
aws lambda invoke --function-name function-name response.json
```

#### 3. API Gateway Issues
```bash
# Check API Gateway logs
aws logs tail /aws/apigateway/api-name --follow

# Test API endpoint
curl -X GET https://api-url/endpoint
```

#### 4. Frontend Issues
```bash
# Check S3 bucket contents
aws s3 ls s3://bucket-name --recursive

# Check CloudFront distribution
aws cloudfront get-distribution --id distribution-id
```

### Debugging Steps

1. **Check AWS Console**: Verify resources are created
2. **Review Logs**: Check CloudWatch logs for errors
3. **Test Endpoints**: Use curl or Postman to test APIs
4. **Verify Permissions**: Check IAM roles and policies
5. **Check Quotas**: Ensure you haven't hit AWS limits

## Cost Monitoring

### Set Up Billing Alerts
```bash
# Create billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "AppointifyX-Billing-Alert" \
  --alarm-description "Alert when costs exceed $5" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 5.0 \
  --comparison-operator GreaterThanThreshold
```

### Monitor Usage
- Check AWS Cost Explorer
- Review CloudWatch metrics
- Monitor DynamoDB usage
- Track Lambda invocations

## Security Checklist

### Pre-Deployment
- [ ] IAM roles follow least privilege
- [ ] DynamoDB encryption enabled
- [ ] S3 bucket encryption enabled
- [ ] CloudFront HTTPS only
- [ ] Cognito MFA enabled
- [ ] Secrets in Parameter Store

### Post-Deployment
- [ ] Test authentication flow
- [ ] Verify tenant isolation
- [ ] Check API authorization
- [ ] Validate data encryption
- [ ] Test backup procedures

## Rollback Procedures

### Infrastructure Rollback
```bash
# Rollback to previous Terraform state
terraform plan -destroy
terraform apply -destroy

# Restore from backup
terraform import aws_s3_bucket.example bucket-name
```

### Application Rollback
```bash
# Rollback Lambda function
aws lambda update-function-code \
  --function-name function-name \
  --s3-bucket bucket-name \
  --s3-key previous-version.zip

# Rollback frontend
aws s3 sync previous-build/ s3://bucket-name/ --delete
```

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review and rotate secrets
- Monitor cost and usage
- Update documentation
- Test backup procedures

### Monitoring
- Set up CloudWatch dashboards
- Configure alerting
- Review X-Ray traces
- Monitor error rates
- Track performance metrics
