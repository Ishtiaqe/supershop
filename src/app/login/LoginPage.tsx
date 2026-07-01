'use client'

import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Lock, Mail, ShoppingBag } from 'lucide-react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { useAuth } from '@/components/auth/AuthProvider'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Please enter your password'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useSupabaseAuth()
  const { user, loading: authLoading } = useAuth()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as Resolver<LoginFormData>,
    defaultValues: {
      email: '',
      password: '',
    },
  })
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (!authLoading && user && !hasRedirected.current) {
      hasRedirected.current = true
      navigate('/pos', { replace: true })
    }
  }, [authLoading, user, navigate])

  const submit = async (values: LoginFormData) => {
    setError(null)
    setLoading(true)

    try {
      const result = await login(values.email, values.password)
      if (result?.user) {
        // User state will update via useEffect, no need to navigate manually
        // useEffect above will handle the redirect
      } else {
        setError('Login failed. Please try again.')
        setLoading(false)
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your email and password.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <ShoppingBag className="text-2xl text-primary-foreground" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-2">Sign in to access your shop dashboard</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 rounded-lg">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Email</FormLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          autoComplete="email"
                          className="pl-10 h-12 rounded-lg"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Password</FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className="pl-10 h-12 rounded-lg"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 rounded-lg font-semibold text-base"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Powered by Supabase Auth</p>
          </div>
        </div>
      </div>
    </main>
  )
}
