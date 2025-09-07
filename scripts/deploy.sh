#!/bin/bash

# AppointifyX Deployment Script
# This script automates the deployment process for AppointifyX

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="appointifyx"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    log_success "All prerequisites met!"
}

deploy_infrastructure() {
    log_info "Deploying infrastructure for environment: $ENVIRONMENT"
    
    cd infra/environments/$ENVIRONMENT
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init
    
    # Plan deployment
    log_info "Planning Terraform deployment..."
    terraform plan -out=tfplan
    
    # Apply deployment
    log_info "Applying Terraform deployment..."
    terraform apply -auto-approve tfplan
    
    # Get outputs
    log_info "Getting Terraform outputs..."
    API_URL=$(terraform output -raw api_gateway_url)
    FRONTEND_URL=$(terraform output -raw cloudfront_url)
    LAMBDA_BUCKET=$(terraform output -raw lambda_deployments_bucket_name)
    S3_BUCKET=$(terraform output -raw s3_bucket_name)
    CLOUDFRONT_ID=$(terraform output -raw cloudfront_distribution_id)
    
    log_success "Infrastructure deployed successfully!"
    log_info "API URL: $API_URL"
    log_info "Frontend URL: $FRONTEND_URL"
    
    cd ../../..
}

build_backend() {
    log_info "Building backend..."
    
    cd backend
    
    # Install dependencies
    log_info "Installing backend dependencies..."
    npm ci
    
    # Run tests
    log_info "Running backend tests..."
    npm test
    
    # Build
    log_info "Building backend..."
    npm run build
    
    # Package Lambda functions
    log_info "Packaging Lambda functions..."
    npm run zip
    
    cd ..
    
    log_success "Backend built successfully!"
}

deploy_backend() {
    log_info "Deploying backend..."
    
    # Upload Lambda package
    log_info "Uploading Lambda package to S3..."
    aws s3 cp backend/appointments-handler.zip s3://$LAMBDA_BUCKET/
    
    # Update Lambda function
    log_info "Updating Lambda function..."
    aws lambda update-function-code \
        --function-name ${PROJECT_NAME}-appointments-${ENVIRONMENT} \
        --s3-bucket $LAMBDA_BUCKET \
        --s3-key appointments-handler.zip
    
    log_success "Backend deployed successfully!"
}

build_frontend() {
    log_info "Building frontend..."
    
    cd frontend
    
    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm ci
    
    # Run tests
    log_info "Running frontend tests..."
    npm test
    
    # Build
    log_info "Building frontend..."
    npm run build
    
    cd ..
    
    log_success "Frontend built successfully!"
}

deploy_frontend() {
    log_info "Deploying frontend..."
    
    # Upload to S3
    log_info "Uploading frontend to S3..."
    aws s3 sync frontend/out/ s3://$S3_BUCKET/ --delete
    
    # Invalidate CloudFront cache
    log_info "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_ID \
        --paths "/*"
    
    log_success "Frontend deployed successfully!"
}

seed_data() {
    log_info "Seeding sample data..."
    
    # Set environment variables for the seed script
    export AWS_REGION=$AWS_REGION
    export APPOINTMENTS_TABLE_NAME="${PROJECT_NAME}-appointments-${ENVIRONMENT}"
    export TENANTS_TABLE_NAME="${PROJECT_NAME}-tenants-${ENVIRONMENT}"
    export USERS_TABLE_NAME="${PROJECT_NAME}-users-${ENVIRONMENT}"
    
    # Run seed script
    node scripts/seed-data.js
    
    log_success "Sample data seeded successfully!"
}

show_summary() {
    log_success "🎉 Deployment completed successfully!"
    echo ""
    log_info "📋 Deployment Summary:"
    echo "   Environment: $ENVIRONMENT"
    echo "   Region: $AWS_REGION"
    echo "   API URL: $API_URL"
    echo "   Frontend URL: $FRONTEND_URL"
    echo ""
    log_info "🔑 Demo Credentials:"
    echo "   Tenant 1: tenant-001 / admin@acme.com"
    echo "   Tenant 2: tenant-002 / admin@techstart.io"
    echo ""
    log_info "📊 Next Steps:"
    echo "   1. Test the application at: $FRONTEND_URL"
    echo "   2. Check CloudWatch logs for any issues"
    echo "   3. Monitor costs in AWS Cost Explorer"
    echo "   4. Set up billing alerts if needed"
}

# Main deployment flow
main() {
    log_info "🚀 Starting AppointifyX deployment..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Region: $AWS_REGION"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    echo ""
    
    # Deploy infrastructure
    deploy_infrastructure
    echo ""
    
    # Build and deploy backend
    build_backend
    deploy_backend
    echo ""
    
    # Build and deploy frontend
    build_frontend
    deploy_frontend
    echo ""
    
    # Seed sample data
    seed_data
    echo ""
    
    # Show summary
    show_summary
}

# Handle script arguments
case "${1:-}" in
    "infra")
        check_prerequisites
        deploy_infrastructure
        ;;
    "backend")
        build_backend
        deploy_backend
        ;;
    "frontend")
        build_frontend
        deploy_frontend
        ;;
    "seed")
        seed_data
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [ENVIRONMENT] [COMMAND]"
        echo ""
        echo "ENVIRONMENT: dev (default) | prod"
        echo "COMMAND: infra | backend | frontend | seed | help"
        echo ""
        echo "Examples:"
        echo "  $0                    # Deploy everything to dev"
        echo "  $0 prod               # Deploy everything to prod"
        echo "  $0 dev infra          # Deploy only infrastructure to dev"
        echo "  $0 prod backend       # Deploy only backend to prod"
        ;;
    *)
        main
        ;;
esac
