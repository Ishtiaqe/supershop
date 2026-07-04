"use client";

import { useEffect, useState, startTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { User } from '@/types';
import { supabase } from '@/lib/supabase';
import { authStorage } from '@/lib/auth-storage';

// Import shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Please enter a valid email'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = authStorage.getUser();
    if (u) setUser(u as User);
  }, []);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      email: '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || '',
        email: user.email || '',
      });
    }
  }, [user, profileForm]);

  const onProfileSubmit = async (values: ProfileFormData) => {
    if (!user) return;

    try {
      // 1. Update Supabase Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        email: values.email,
        data: { full_name: values.fullName }
      });
      if (authError) throw authError;

      // 2. Update public.users database table
      const { data: dbData, error: dbError } = await supabase
        .from('users')
        .update({ fullName: values.fullName, email: values.email })
        .eq('id', user.id)
        .select()
        .single();
      
      const updatedUser = dbError ? {
        ...user,
        fullName: values.fullName,
        email: values.email
      } : dbData;

      startTransition(() => {
        authStorage.setUser(updatedUser as Record<string, unknown>);
        setUser(updatedUser);
      });

      toast.success('Profile saved successfully');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Profile update error:', error);
    }
  };

  const onPasswordSubmit = async (values: PasswordFormData) => {
    if (!user) return;

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword
      });
      if (error) throw error;

      await new Promise((resolve) => setTimeout(resolve, 0));
      toast.success('Password changed successfully');
      passwordForm.reset();
    } catch (error) {
      toast.error('Failed to change password');
      console.error('Password change error:', error);
    }
  };

  if (!user) {
    return <div className="p-6 text-muted-foreground text-sm text-center">Not signed in</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4 p-5">
          <CardTitle className="text-lg font-semibold">Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid grid-cols-2 w-full max-w-[400px]">
              <TabsTrigger value="profile">Profile Details</TabsTrigger>
              <TabsTrigger value="password">Change Password</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 outline-none">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
                  {(user.fullName || user.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-foreground">{user.fullName || user.email}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
              </div>

              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 pt-2">
                  <FormField
                    control={profileForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your email" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full sm:w-auto h-11">Save Changes</Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="password" className="space-y-4 outline-none">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter current password" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter new password (min. 8 chars)" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input placeholder="Re-enter new password" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full sm:w-auto h-11">Change Password</Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
