import jwt, { SignOptions, Secret } from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import type { JwtPayload, UserRole } from './types'

/**
 * JWT and auth utilities
 * Matches NestJS auth flow exactly
 */

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'supershop-local-dev-secret'
const JWT_REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET || JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

// Firebase initialization (lazy, optional)
let firebaseInitialized = false

async function initializeFirebase(): Promise<any> {
  if (firebaseInitialized) return true

  try {
    // Dynamic import to avoid issues in environments where Firebase isn't needed
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const admin = require('firebase-admin')

    const projectId =
      process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'shomaj-817b0'
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL

    if (!privateKey || !clientEmail) {
      console.warn('Firebase not configured, skipping Firebase initialization')
      return false
    }

    if (!admin.apps || admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail,
        }),
      })
    }

    firebaseInitialized = true
    return true
  } catch (error) {
    console.warn('Firebase initialization failed:', error)
    return false
  }
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Generate access token (15m default)
 */
export function generateAccessToken(userId: string, email: string, role: UserRole, tenantId: string | null): string {
  const payload: JwtPayload = {
    sub: userId,
    email,
    role,
    tenantId,
  }

  return jwt.sign(payload, JWT_SECRET as Secret, {
    expiresIn: JWT_EXPIRES_IN,
  } as any)
}

/**
 * Generate refresh token (7d default)
 */
export function generateRefreshToken(userId: string): string {
  const payload: JwtPayload = {
    sub: userId,
    email: '', // not needed in refresh token
    role: 'EMPLOYEE' as UserRole,
    tenantId: null,
  }

  return jwt.sign(payload, JWT_REFRESH_SECRET as Secret, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as any)
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload
  } catch {
    return null
  }
}

/**
 * Rotate refresh token: validate old, delete, issue new
 */
export async function rotateRefreshToken(refreshToken: string): Promise<{
  accessToken: string
  refreshToken: string
} | null> {
  try {
    const payload = verifyRefreshToken(refreshToken)
    if (!payload) return null

    // Check if token exists in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!storedToken || storedToken.userId !== payload.sub) {
      return null
    }

    // Delete old token
    await prisma.refreshToken.delete({
      where: { token: refreshToken },
    })

    // Generate new tokens
    const user = storedToken.user
    const newAccessToken = generateAccessToken(user.id, user.email, user.role as UserRole, user.tenantId)
    const newRefreshToken = generateRefreshToken(user.id)

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }
  } catch {
    return null
  }
}

/**
 * Verify Firebase ID token and return user data
 */
export async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  try {
    const initialized = await initializeFirebase()
    if (!initialized) return null

    // eslint-disable-next-line global-require, import/no-dynamic-require
    const admin = require('firebase-admin')
    const auth = admin.auth()
    const decodedToken = await auth.verifyIdToken(idToken)
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    }
  } catch {
    return null
  }
}

/**
 * Create refresh token record in DB
 */
export async function createRefreshTokenRecord(userId: string, token: string): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  })
}

/**
 * Invalidate refresh token (logout)
 */
export async function invalidateRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { token },
  })
}
