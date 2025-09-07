/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://your-api-gateway-url.amazonaws.com/dev',
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
    NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || '',
    NEXT_PUBLIC_COGNITO_REGION: process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1'
  }
}

module.exports = nextConfig
