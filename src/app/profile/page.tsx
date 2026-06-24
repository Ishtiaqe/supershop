'use client'

import { useEffect, useState, startTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Card,
  CardBody,
  Avatar,
  Button,
  Input,
  Tabs,
  Tab,
  Divider,
  Spinner,
} from '@heroui/react'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@/types'
import api from '@/lib/api'

// Validation schemas
const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(255),
  email: z.string().email('Please enter a valid email'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordVisible, setPasswordVisible] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      email: '',
    },
  })

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) {
      const parsedUser = JSON.parse(u)
      setUser(parsedUser)
      profileForm.reset({
        fullName: parsedUser.fullName || '',
        email: parsedUser.email || '',
      })
    }
    setLoading(false)
  }, [profileForm])

  const onProfileSubmit = async (values: ProfileFormData) => {
    if (!user) return

    setIsSubmittingProfile(true)
    try {
      const response = await api.put('/users/me', {
        fullName: values.fullName,
        email: values.email,
      })

      const updatedUser = response.data

      startTransition(() => {
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
      })

      toast.success('Profile saved successfully')
    } catch (error) {
      console.error('Profile update error:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update profile'
      toast.error(errorMessage)
    } finally {
      setIsSubmittingProfile(false)
    }
  }

  const onPasswordSubmit = async (values: PasswordFormData) => {
    if (!user) return

    setIsSubmittingPassword(true)
    try {
      await api.post('/users/me/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })

      // Allow UI to update before showing success message
      await new Promise((resolve) => setTimeout(resolve, 0))

      passwordForm.reset()
      setPasswordVisible({ current: false, new: false, confirm: false })
      toast.success('Password changed successfully')
    } catch (error) {
      console.error('Password change error:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to change password'
      toast.error(errorMessage)
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Spinner color="current" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <p className="text-foreground">Not signed in</p>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="w-full max-w-2xl mx-auto">
        <Card>
          <CardBody className="gap-6">
            {/* Header with avatar */}
            <div className="flex items-center gap-4">
              <Avatar
                isBordered
                color="primary"
                size="lg"
                name={user.fullName || user.email || 'U'}
              />
              <div>
                <p className="font-bold text-foreground text-lg">
                  {user.fullName || user.email}
                </p>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>
            </div>

            <Divider />

            {/* Tabs */}
            <Tabs aria-label="Profile options" color="primary" variant="light">
              {/* Profile Tab */}
              <Tab key="profile" title="Profile">
                <div className="py-4">
                  <form
                    onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                    className="space-y-4"
                  >
                    {/* Full Name Field */}
                    <Controller
                      name="fullName"
                      control={profileForm.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          label="Full Name"
                          placeholder="Enter your full name"
                          isInvalid={!!profileForm.formState.errors.fullName}
                          errorMessage={
                            profileForm.formState.errors.fullName?.message
                          }
                          disabled={isSubmittingProfile}
                        />
                      )}
                    />

                    {/* Email Field */}
                    <Controller
                      name="email"
                      control={profileForm.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="email"
                          label="Email"
                          placeholder="Enter your email"
                          isInvalid={!!profileForm.formState.errors.email}
                          errorMessage={
                            profileForm.formState.errors.email?.message
                          }
                          disabled={isSubmittingProfile}
                        />
                      )}
                    />

                    {/* Save Button */}
                    <Button
                      color="primary"
                      type="submit"
                      isLoading={isSubmittingProfile}
                      disabled={isSubmittingProfile}
                      className="w-full sm:w-auto"
                    >
                      {isSubmittingProfile ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </div>
              </Tab>

              {/* Change Password Tab */}
              <Tab key="password" title="Change Password">
                <div className="py-4">
                  <form
                    onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                    className="space-y-4"
                  >
                    {/* Current Password Field */}
                    <Controller
                      name="currentPassword"
                      control={passwordForm.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          label="Current Password"
                          type={passwordVisible.current ? 'text' : 'password'}
                          placeholder="Enter your current password"
                          isInvalid={
                            !!passwordForm.formState.errors.currentPassword
                          }
                          errorMessage={
                            passwordForm.formState.errors.currentPassword
                              ?.message
                          }
                          disabled={isSubmittingPassword}
                          endContent={
                            <button
                              type="button"
                              onClick={() =>
                                setPasswordVisible((prev) => ({
                                  ...prev,
                                  current: !prev.current,
                                }))
                              }
                              disabled={isSubmittingPassword}
                              className="focus:outline-none"
                            >
                              {passwordVisible.current ? (
                                <Eye className="w-4 h-4 text-default-400" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-default-400" />
                              )}
                            </button>
                          }
                        />
                      )}
                    />

                    {/* New Password Field */}
                    <Controller
                      name="newPassword"
                      control={passwordForm.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          label="New Password"
                          type={passwordVisible.new ? 'text' : 'password'}
                          placeholder="Enter your new password"
                          isInvalid={!!passwordForm.formState.errors.newPassword}
                          errorMessage={
                            passwordForm.formState.errors.newPassword?.message
                          }
                          disabled={isSubmittingPassword}
                          description="At least 8 characters, with uppercase, lowercase, and numbers"
                          endContent={
                            <button
                              type="button"
                              onClick={() =>
                                setPasswordVisible((prev) => ({
                                  ...prev,
                                  new: !prev.new,
                                }))
                              }
                              disabled={isSubmittingPassword}
                              className="focus:outline-none"
                            >
                              {passwordVisible.new ? (
                                <Eye className="w-4 h-4 text-default-400" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-default-400" />
                              )}
                            </button>
                          }
                        />
                      )}
                    />

                    {/* Confirm Password Field */}
                    <Controller
                      name="confirmPassword"
                      control={passwordForm.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          label="Confirm New Password"
                          type={passwordVisible.confirm ? 'text' : 'password'}
                          placeholder="Confirm your new password"
                          isInvalid={
                            !!passwordForm.formState.errors.confirmPassword
                          }
                          errorMessage={
                            passwordForm.formState.errors.confirmPassword
                              ?.message
                          }
                          disabled={isSubmittingPassword}
                          endContent={
                            <button
                              type="button"
                              onClick={() =>
                                setPasswordVisible((prev) => ({
                                  ...prev,
                                  confirm: !prev.confirm,
                                }))
                              }
                              disabled={isSubmittingPassword}
                              className="focus:outline-none"
                            >
                              {passwordVisible.confirm ? (
                                <Eye className="w-4 h-4 text-default-400" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-default-400" />
                              )}
                            </button>
                          }
                        />
                      )}
                    />

                    {/* Submit Button */}
                    <Button
                      color="primary"
                      type="submit"
                      isLoading={isSubmittingPassword}
                      disabled={isSubmittingPassword}
                      className="w-full sm:w-auto"
                    >
                      {isSubmittingPassword
                        ? 'Changing Password...'
                        : 'Change Password'}
                    </Button>
                  </form>
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
