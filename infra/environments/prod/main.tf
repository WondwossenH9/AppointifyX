# Production Environment Configuration

module "appointifyx" {
  source = "../../"

  environment = "prod"
  aws_region  = "us-east-1"
  domain_name = var.domain_name

  tags = {
    Environment = "prod"
    Project     = "AppointifyX"
    Owner       = "Production Team"
  }
}

# Variables for production
variable "domain_name" {
  description = "Custom domain name for production"
  type        = string
  default     = ""
}

# Outputs for production
output "api_url" {
  description = "API Gateway URL for production"
  value       = module.appointifyx.api_gateway_url
}

output "frontend_url" {
  description = "Frontend URL for production"
  value       = module.appointifyx.cloudfront_url
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID for production"
  value       = module.appointifyx.cognito_user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID for production"
  value       = module.appointifyx.cognito_user_pool_client_id
}
