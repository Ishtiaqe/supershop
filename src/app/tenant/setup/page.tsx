"use client"

import { startTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import api from '@/lib/api'
import { Input, Button, Card, CardBody } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const tenantSetupSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  registrationNumber: z.string().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressZone: z.string().optional(),
})

type TenantSetupData = z.infer<typeof tenantSetupSchema>

export default function TenantSetupPage() {
  const router = useRouter()
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<TenantSetupData>({
    resolver: zodResolver(tenantSetupSchema),
  })

  const onSubmit = async (values: TenantSetupData) => {
    try {
      await api.post('/tenants/setup', values)
      toast.success('Tenant created successfully')
      startTransition(() => {
        router.push('/sales')
      })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e?.response?.data?.message || 'Failed to setup tenant')
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-xl font-semibold">Setup your store</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Store name"
                  placeholder="Your store name"
                  isInvalid={!!errors.name}
                  errorMessage={errors.name?.message}
                />
              )}
            />

            <Controller
              name="registrationNumber"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Registration number"
                  placeholder="Optional registration number"
                />
              )}
            />

            <Controller
              name="addressStreet"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Street"
                  placeholder="Street address"
                />
              )}
            />

            <Controller
              name="addressCity"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="City"
                  placeholder="City"
                />
              )}
            />

            <Controller
              name="addressZone"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Zone"
                  placeholder="Zone"
                />
              )}
            />

            <Button
              type="submit"
              color="primary"
              fullWidth
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Create store
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
