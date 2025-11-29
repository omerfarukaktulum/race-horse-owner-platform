import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

/**
 * Helper functions for admin operations
 * Used when admin is creating accounts for other users
 */

/**
 * Get target user ID from cookie (set during admin user creation)
 * Returns null if not in admin mode
 */
export async function getAdminTargetUserId(): Promise<string | null> {
  const cookieStore = cookies()
  const targetUserIdCookie = cookieStore.get('admin-target-user-id')
  return targetUserIdCookie?.value || null
}

/**
 * Verify admin is logged in and get target user ID
 * Returns { isAdmin: boolean, targetUserId: string | null }
 */
export async function verifyAdminAndGetTargetUserId(): Promise<{
  isAdmin: boolean
  targetUserId: string | null
  adminId: string | null
}> {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')

  if (!token) {
    return { isAdmin: false, targetUserId: null, adminId: null }
  }

  try {
    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
    }

    if (decoded.role !== 'ADMIN') {
      return { isAdmin: false, targetUserId: null, adminId: null }
    }

    const targetUserId = await getAdminTargetUserId()
    return {
      isAdmin: true,
      targetUserId,
      adminId: decoded.id,
    }
  } catch (error) {
    return { isAdmin: false, targetUserId: null, adminId: null }
  }
}

/**
 * Get the user ID to use for operations
 * If admin mode: returns target user ID
 * Otherwise: returns the authenticated user ID
 */
export async function getEffectiveUserId(): Promise<string | null> {
  const { isAdmin, targetUserId, adminId } = await verifyAdminAndGetTargetUserId()
  
  if (isAdmin && targetUserId) {
    return targetUserId // Admin creating account for target user
  }
  
  if (adminId) {
    return adminId // Admin but no target (shouldn't happen in onboarding)
  }
  
  // Not admin, get from token
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')
  
  if (!token) {
    return null
  }
  
  try {
    const { verify } = require('jsonwebtoken')
    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
    }
    return decoded.id
  } catch {
    return null
  }
}

