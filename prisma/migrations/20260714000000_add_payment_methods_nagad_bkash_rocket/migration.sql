-- AlterEnum
-- Adds Nagad, bKash, and Rocket as payment method options for sales.
-- These are popular Bangladeshi mobile financial services.

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'NAGAD';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'BKASH';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ROCKET';
