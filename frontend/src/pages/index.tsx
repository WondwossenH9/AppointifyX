import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface LoginForm {
  email: string
  password: string
  tenantId: string
}

export default function Home() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      // TODO: Implement actual authentication
      toast.success('Login successful!')
      router.push(`/dashboard/${data.tenantId}`)
    } catch (error) {
      toast.error('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>AppointifyX - Multi-Tenant Appointment Booking</title>
        <meta name="description" content="Professional appointment booking system for multi-tenant SaaS" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-600">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Welcome to AppointifyX
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Multi-tenant appointment booking system
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="tenantId" className="label">
                  Tenant ID
                </label>
                <input
                  {...register('tenantId', { required: 'Tenant ID is required' })}
                  type="text"
                  className="input"
                  placeholder="Enter your tenant ID"
                />
                {errors.tenantId && (
                  <p className="mt-1 text-sm text-red-600">{errors.tenantId.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="label">
                  Email Address
                </label>
                <input
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  className="input"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password', { required: 'Password is required' })}
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Demo credentials: tenant-001 / admin@appointifyx.com / password123
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
