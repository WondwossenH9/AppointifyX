# Security Module - Cognito, IAM, and Security Groups

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-user-pool-${var.environment}"

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # User pool attributes
  username_attributes = ["email"]
  auto_verified_attributes = ["email"]

  # MFA configuration
  mfa_configuration = "OPTIONAL"
  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Admin create user config
  admin_create_user_config {
    allow_admin_create_user_only = false
    invite_message_template {
      email_subject = "Welcome to AppointifyX"
      email_message = "Welcome to AppointifyX! Your username is {username} and temporary password is {####}."
      sms_message   = "Your AppointifyX username is {username} and temporary password is {####}."
    }
  }

  # Schema attributes
  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true
  }

  schema {
    attribute_data_type = "String"
    name                = "tenant_id"
    required            = false
    mutable             = true
  }

  schema {
    attribute_data_type = "String"
    name                = "role"
    required            = false
    mutable             = true
  }

  tags = var.tags
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # Client settings
  generate_secret                      = false
  prevent_user_existence_errors        = "ENABLED"
  enable_token_revocation              = true
  enable_propagate_additional_user_context_data = false

  # Token validity
  access_token_validity  = 60  # 1 hour
  id_token_validity      = 60  # 1 hour
  refresh_token_validity = 30  # 30 days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # OAuth settings
  allowed_oauth_flows = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes = ["email", "openid", "profile"]

  callback_urls = [
    "http://localhost:3000/auth/callback",
    "https://${var.domain_name}/auth/callback"
  ]

  logout_urls = [
    "http://localhost:3000/auth/logout",
    "https://${var.domain_name}/auth/logout"
  ]

  supported_identity_providers = ["COGNITO"]
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  count = var.domain_name != "" ? 1 : 0
  
  domain       = "${var.project_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Cognito User Pool Groups
resource "aws_cognito_user_pool_group" "super_admin" {
  name         = "super-admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Super administrators with access to all tenants"
  precedence   = 1
}

resource "aws_cognito_user_pool_group" "tenant_admin" {
  name         = "tenant-admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Tenant administrators"
  precedence   = 2
}

resource "aws_cognito_user_pool_group" "tenant_user" {
  name         = "tenant-user"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Regular tenant users"
  precedence   = 3
}

# IAM Role for Lambda functions
resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM Policy for Lambda execution
resource "aws_iam_role_policy" "lambda_execution" {
  name = "${var.project_name}-lambda-policy-${var.environment}"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/${var.project_name}-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminListGroupsForUser",
          "cognito-idp:ListUsers",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminDeleteUser"
        ]
        Resource = aws_cognito_user_pool.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:*:*:parameter/${var.project_name}/*"
      }
    ]
  })
}

# IAM Role for API Gateway
resource "aws_iam_role" "api_gateway" {
  name = "${var.project_name}-api-gateway-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# Variables
variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Outputs
output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.main.id
}

output "cognito_user_pool_domain" {
  description = "Domain of the Cognito User Pool"
  value       = var.domain_name != "" ? aws_cognito_user_pool_domain.main[0].domain : null
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}

output "api_gateway_role_arn" {
  description = "ARN of the API Gateway role"
  value       = aws_iam_role.api_gateway.arn
}
