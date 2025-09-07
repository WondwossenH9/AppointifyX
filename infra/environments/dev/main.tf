# Development Environment Configuration

module "appointifyx" {
  source = "../../"

  environment = "dev"
  aws_region  = "us-east-1"
  domain_name = ""  # No custom domain for dev

  tags = {
    Environment = "dev"
    Project     = "AppointifyX"
    Owner       = "Development Team"
  }
}

# Outputs for development
output "api_url" {
  description = "API Gateway URL for development"
  value       = module.appointifyx.api_gateway_url
}

output "frontend_url" {
  description = "Frontend URL for development"
  value       = module.appointifyx.cloudfront_url
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID for development"
  value       = module.appointifyx.cognito_user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID for development"
  value       = module.appointifyx.cognito_user_pool_client_id
}
