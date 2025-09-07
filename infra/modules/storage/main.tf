# Storage Module - DynamoDB, S3, and related storage resources

# DynamoDB Table for Appointments
resource "aws_dynamodb_table" "appointments" {
  name           = "${var.project_name}-appointments-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"  # Free tier friendly
  hash_key       = "PK"
  range_key      = "SK"

  # Global Secondary Index for tenant-based queries
  global_secondary_index {
    name     = "GSI1"
    hash_key = "GSI1PK"
    range_key = "GSI1SK"
  }

  # Global Secondary Index for user-based queries
  global_secondary_index {
    name     = "GSI2"
    hash_key = "GSI2PK"
    range_key = "GSI2SK"
  }

  # Point-in-time recovery (free tier includes this)
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  # TTL for automatic cleanup of old records
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-appointments-${var.environment}"
  })
}

# DynamoDB Table for Tenants
resource "aws_dynamodb_table" "tenants" {
  name           = "${var.project_name}-tenants-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "tenantId"

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-tenants-${var.environment}"
  })
}

# DynamoDB Table for Users
resource "aws_dynamodb_table" "users" {
  name           = "${var.project_name}-users-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

  # Global Secondary Index for tenant-based queries
  global_secondary_index {
    name     = "TenantIndex"
    hash_key = "tenantId"
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-users-${var.environment}"
  })
}

# S3 Bucket for Frontend
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend-${var.environment}-${random_string.bucket_suffix.result}"

  tags = merge(var.tags, {
    Name = "${var.project_name}-frontend-${var.environment}"
  })
}

# Random string for bucket suffix to ensure uniqueness
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server-side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Policy for CloudFront
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/*"
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# S3 Bucket for Lambda deployment packages
resource "aws_s3_bucket" "lambda_deployments" {
  bucket = "${var.project_name}-lambda-deployments-${var.environment}-${random_string.lambda_bucket_suffix.result}"

  tags = merge(var.tags, {
    Name = "${var.project_name}-lambda-deployments-${var.environment}"
  })
}

# Random string for lambda bucket suffix
resource "random_string" "lambda_bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3 Bucket Versioning for Lambda deployments
resource "aws_s3_bucket_versioning" "lambda_deployments" {
  bucket = aws_s3_bucket.lambda_deployments.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server-side Encryption for Lambda deployments
resource "aws_s3_bucket_server_side_encryption_configuration" "lambda_deployments" {
  bucket = aws_s3_bucket.lambda_deployments.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket Public Access Block for Lambda deployments
resource "aws_s3_bucket_public_access_block" "lambda_deployments" {
  bucket = aws_s3_bucket.lambda_deployments.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Data sources
data "aws_caller_identity" "current" {}

# Variables
variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Outputs
output "appointments_table_name" {
  description = "Name of the appointments DynamoDB table"
  value       = aws_dynamodb_table.appointments.name
}

output "appointments_table_arn" {
  description = "ARN of the appointments DynamoDB table"
  value       = aws_dynamodb_table.appointments.arn
}

output "tenants_table_name" {
  description = "Name of the tenants DynamoDB table"
  value       = aws_dynamodb_table.tenants.name
}

output "tenants_table_arn" {
  description = "ARN of the tenants DynamoDB table"
  value       = aws_dynamodb_table.tenants.arn
}

output "users_table_name" {
  description = "Name of the users DynamoDB table"
  value       = aws_dynamodb_table.users.name
}

output "users_table_arn" {
  description = "ARN of the users DynamoDB table"
  value       = aws_dynamodb_table.users.arn
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket for frontend"
  value       = aws_s3_bucket.frontend.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for frontend"
  value       = aws_s3_bucket.frontend.arn
}

output "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket for frontend"
  value       = aws_s3_bucket.frontend.bucket_domain_name
}

output "lambda_deployments_bucket_name" {
  description = "Name of the S3 bucket for Lambda deployments"
  value       = aws_s3_bucket.lambda_deployments.bucket
}

output "lambda_deployments_bucket_arn" {
  description = "ARN of the S3 bucket for Lambda deployments"
  value       = aws_s3_bucket.lambda_deployments.arn
}
