# AppointifyX - Main Terraform Configuration
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    # Configure this for your S3 backend
    # bucket = "your-terraform-state-bucket"
    # key    = "appointifyx/terraform.tfstate"
    # region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "AppointifyX"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local values
locals {
  project_name = "appointifyx"
  common_tags = {
    Project     = "AppointifyX"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

# Networking Module
module "networking" {
  source = "./modules/networking"
  
  project_name = local.project_name
  environment  = var.environment
  tags         = local.common_tags
}

# Security Module
module "security" {
  source = "./modules/security"
  
  project_name = local.project_name
  environment  = var.environment
  tags         = local.common_tags
}

# Storage Module
module "storage" {
  source = "./modules/storage"
  
  project_name = local.project_name
  environment  = var.environment
  tags         = local.common_tags
}

# Compute Module
module "compute" {
  source = "./modules/compute"
  
  project_name = local.project_name
  environment  = var.environment
  tags         = local.common_tags
  
  vpc_id                = module.networking.vpc_id
  private_subnet_ids    = module.networking.private_subnet_ids
  public_subnet_ids     = module.networking.public_subnet_ids
  
  cognito_user_pool_id  = module.security.cognito_user_pool_id
  cognito_user_pool_arn = module.security.cognito_user_pool_arn
  
  appointments_table_name = module.storage.appointments_table_name
  appointments_table_arn  = module.storage.appointments_table_arn
  
  s3_bucket_name = module.storage.s3_bucket_name
  s3_bucket_arn  = module.storage.s3_bucket_arn
}

# Outputs
output "api_gateway_url" {
  description = "API Gateway URL"
  value       = module.compute.api_gateway_url
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = module.compute.cloudfront_url
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.security.cognito_user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = module.security.cognito_user_pool_client_id
}

output "s3_bucket_name" {
  description = "S3 bucket name for frontend"
  value       = module.storage.s3_bucket_name
}
