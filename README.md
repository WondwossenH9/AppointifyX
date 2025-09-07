# AppointifyX - Multi-Tenant Serverless SaaS

A production-grade multi-tenant appointment booking platform built with AWS serverless technologies.

## 🏗️ Architecture

- **Frontend**: Next.js hosted on S3 + CloudFront
- **Backend**: AWS Lambda + API Gateway
- **Authentication**: Amazon Cognito with tenant-based groups
- **Database**: DynamoDB with optimized multi-tenant schema
- **Infrastructure**: Terraform for IaC
- **Monitoring**: CloudWatch + X-Ray tracing
- **CI/CD**: GitHub Actions

## 🚀 Quick Start

### Prerequisites
- AWS CLI configured
- Terraform installed
- Node.js 18+
- Git

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Deploy infrastructure
cd infra
terraform init
terraform plan
terraform apply
```

### Demo
- [Live Demo](https://your-cloudfront-url.com)
- [Architecture Diagram](./docs/architecture.md)
- [Cost Analysis](./docs/cost-analysis.md)

## 📊 Features

- ✅ Multi-tenant appointment management
- ✅ Secure tenant isolation
- ✅ Real-time availability checking
- ✅ Email notifications
- ✅ Admin dashboard
- ✅ API-first design
- ✅ Cost-optimized for AWS free tier

## 🔒 Security

- Tenant-based data isolation
- JWT token validation
- API Gateway authorizers
- IAM least privilege access
- Secrets management

## 📈 Monitoring

- CloudWatch metrics and logs
- X-Ray distributed tracing
- Custom business metrics
- Cost monitoring and alerts

## 🛠️ Development

See [Development Guide](./docs/development.md) for detailed setup instructions.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file.
