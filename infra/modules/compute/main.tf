# Compute Module - Lambda Functions, API Gateway, and CloudFront

# API Gateway
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api-${var.environment}"
  description = "AppointifyX API Gateway"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.tags
}

# API Gateway Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name                   = "cognito-authorizer"
  rest_api_id            = aws_api_gateway_rest_api.main.id
  type                   = "COGNITO_USER_POOLS"
  provider_arns          = [var.cognito_user_pool_arn]
  authorizer_credentials = var.api_gateway_role_arn
}

# API Gateway Resources
resource "aws_api_gateway_resource" "tenants" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "tenants"
}

resource "aws_api_gateway_resource" "tenant_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.tenants.id
  path_part   = "{tenantId}"
}

resource "aws_api_gateway_resource" "appointments" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.tenant_id.id
  path_part   = "appointments"
}

resource "aws_api_gateway_resource" "appointment_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.appointments.id
  path_part   = "{appointmentId}"
}

# Lambda Functions
resource "aws_lambda_function" "appointments_handler" {
  function_name = "${var.project_name}-appointments-${var.environment}"
  role          = var.lambda_execution_role_arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 256

  s3_bucket = var.lambda_deployments_bucket_name
  s3_key    = "appointments-handler.zip"

  environment {
    variables = {
      APPOINTMENTS_TABLE_NAME = var.appointments_table_name
      TENANTS_TABLE_NAME      = var.tenants_table_name
      USERS_TABLE_NAME        = var.users_table_name
      COGNITO_USER_POOL_ID    = var.cognito_user_pool_id
      NODE_ENV                = var.environment
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  tracing_config {
    mode = "Active"
  }

  tags = var.tags

  depends_on = [
    aws_cloudwatch_log_group.appointments_handler
  ]
}

resource "aws_lambda_function" "tenants_handler" {
  function_name = "${var.project_name}-tenants-${var.environment}"
  role          = var.lambda_execution_role_arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 256

  s3_bucket = var.lambda_deployments_bucket_name
  s3_key    = "tenants-handler.zip"

  environment {
    variables = {
      TENANTS_TABLE_NAME   = var.tenants_table_name
      USERS_TABLE_NAME     = var.users_table_name
      COGNITO_USER_POOL_ID = var.cognito_user_pool_id
      NODE_ENV             = var.environment
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  tracing_config {
    mode = "Active"
  }

  tags = var.tags

  depends_on = [
    aws_cloudwatch_log_group.tenants_handler
  ]
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "appointments_handler" {
  name              = "/aws/lambda/${var.project_name}-appointments-${var.environment}"
  retention_in_days = 14  # Free tier friendly

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "tenants_handler" {
  name              = "/aws/lambda/${var.project_name}-tenants-${var.environment}"
  retention_in_days = 14  # Free tier friendly

  tags = var.tags
}

# Lambda Permissions
resource "aws_lambda_permission" "api_gateway_appointments" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.appointments_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_tenants" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tenants_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# API Gateway Methods
resource "aws_api_gateway_method" "appointments_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.appointments.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "appointments_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.appointments.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "appointment_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.appointment_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "appointment_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.appointment_id.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "appointment_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.appointment_id.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# API Gateway Integrations
resource "aws_api_gateway_integration" "appointments_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.appointments.id
  http_method = aws_api_gateway_method.appointments_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.appointments_handler.invoke_arn
}

resource "aws_api_gateway_integration" "appointments_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.appointments.id
  http_method = aws_api_gateway_method.appointments_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.appointments_handler.invoke_arn
}

resource "aws_api_gateway_integration" "appointment_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.appointment_id.id
  http_method = aws_api_gateway_method.appointment_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.appointments_handler.invoke_arn
}

resource "aws_api_gateway_integration" "appointment_put" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.appointment_id.id
  http_method = aws_api_gateway_method.appointment_put.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.appointments_handler.invoke_arn
}

resource "aws_api_gateway_integration" "appointment_delete" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.appointment_id.id
  http_method = aws_api_gateway_method.appointment_delete.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.appointments_handler.invoke_arn
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.appointments_get,
    aws_api_gateway_integration.appointments_post,
    aws_api_gateway_integration.appointment_get,
    aws_api_gateway_integration.appointment_put,
    aws_api_gateway_integration.appointment_delete
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = var.environment

  lifecycle {
    create_before_destroy = true
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = var.s3_bucket_domain_name
    origin_id   = "S3-${var.s3_bucket_name}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${var.s3_bucket_name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Cache behavior for API calls
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "API-${aws_api_gateway_rest_api.main.id}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # API Gateway origin for API calls
  origin {
    domain_name = replace(aws_api_gateway_deployment.main.invoke_url, "/^https?://([^/]+).*$/", "$1")
    origin_id   = "API-${aws_api_gateway_rest_api.main.id}"
    origin_path = "/${var.environment}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = var.tags
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "OAI for ${var.project_name}-${var.environment}"
}

# Security Group for Lambda
resource "aws_security_group" "lambda" {
  name_prefix = "${var.project_name}-lambda-${var.environment}"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-lambda-sg-${var.environment}"
  })
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

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnet IDs"
  type        = list(string)
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  type        = string
}

variable "appointments_table_name" {
  description = "Appointments table name"
  type        = string
}

variable "appointments_table_arn" {
  description = "Appointments table ARN"
  type        = string
}

variable "tenants_table_name" {
  description = "Tenants table name"
  type        = string
}

variable "users_table_name" {
  description = "Users table name"
  type        = string
}

variable "s3_bucket_name" {
  description = "S3 bucket name for frontend"
  type        = string
}

variable "s3_bucket_arn" {
  description = "S3 bucket ARN for frontend"
  type        = string
}

variable "s3_bucket_domain_name" {
  description = "S3 bucket domain name for frontend"
  type        = string
}

variable "lambda_execution_role_arn" {
  description = "Lambda execution role ARN"
  type        = string
}

variable "api_gateway_role_arn" {
  description = "API Gateway role ARN"
  type        = string
}

variable "lambda_deployments_bucket_name" {
  description = "Lambda deployments bucket name"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Outputs
output "api_gateway_url" {
  description = "API Gateway URL"
  value       = aws_api_gateway_deployment.main.invoke_url
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}
