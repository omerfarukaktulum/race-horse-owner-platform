'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Database, RefreshCw, X } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'

interface DatabaseInfo {
  type: 'production' | 'local' | 'unknown'
  name: string
  projectRef: string | null
  url: string
  currentPreference: 'local' | 'prod'
  hasProdDb: boolean
}

interface DbTestResult {
  cookiePreference: string
  databaseUrl: {
    length: number
    preview: string
    isLocal: boolean
    isProd: boolean
    detectedType: string
  }
  databaseQuery: {
    userCount: number
    firstUser: {
      email: string
      role: string
      createdAt: string
    } | null
  }
  environment: {
    hasDatabseUrl: boolean
    hasProdDatabseUrl: boolean
    databseUrlLength: number
    prodDatabseUrlLength: number
  }
}

export default function AdminNavbar() {
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showTestModal, setShowTestModal] = useState(false)
  const [testResult, setTestResult] = useState<DbTestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const fetchDbStatus = async () => {
    try {
      const response = await fetch('/api/admin/db-status')
      if (response.ok) {
        const data = await response.json()
        setDbInfo(data)
      }
    } catch (error) {
      console.error('Failed to fetch DB status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDbStatus()
  }, [])

  const testDatabaseConnection = async () => {
    setIsTesting(true)
    setShowTestModal(true)
    try {
      const response = await fetch('/api/admin/db-test', {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Database test failed')
      }

      setTestResult(data)
    } catch (error) {
      console.error('Database test error:', error)
      toast.error('Database test failed')
    } finally {
      setIsTesting(false)
    }
  }

  const handleSwitchDatabase = async () => {
    if (!dbInfo) return
    
    const newPreference = dbInfo.currentPreference === 'local' ? 'prod' : 'local'
    
    if (newPreference === 'prod' && !dbInfo.hasProdDb) {
      toast.error('PROD_DATABASE_URL is not configured in environment variables')
      return
    }

    setIsSwitching(true)
    try {
      const response = await fetch('/api/admin/db-switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preference: newPreference }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch database')
      }

      toast.success(data.message || `Switched to ${newPreference === 'prod' ? 'production' : 'local'} database`)
      
      // Test the database connection and show results
      await testDatabaseConnection()
      
      // Refresh after showing test results
      setTimeout(() => {
        window.location.href = window.location.href
      }, 3000)
    } catch (error: any) {
      toast.error(error.message || 'Failed to switch database')
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/admin" className="hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </Link>
          
          {/* Database Status - Right Aligned */}
          <div className="flex items-center gap-3">
            {/* Database Status */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-white">
              <Database className={`h-4 w-4 ${
                dbInfo?.type === 'production' ? 'text-green-600' : 
                dbInfo?.type === 'local' ? 'text-blue-600' : 
                'text-gray-600'
              }`} />
              <div className="flex flex-col">
                <span className={`text-xs font-semibold ${
                  dbInfo?.type === 'production' ? 'text-green-700' : 
                  dbInfo?.type === 'local' ? 'text-blue-700' : 
                  'text-gray-700'
                }`}>
                  {isLoading ? '...' : dbInfo?.type === 'production' ? 'PROD' : dbInfo?.type === 'local' ? 'LOCAL' : 'UNKNOWN'}
                </span>
                <span className="text-xs text-gray-500">{isLoading ? 'Loading...' : dbInfo?.name || 'Unknown'}</span>
              </div>
            </div>

            {/* Database Switch Toggle (only show if PROD_DATABASE_URL is available) */}
            {dbInfo?.hasProdDb && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white">
                <span className="text-xs text-gray-600 mr-1">
                  {dbInfo.currentPreference === 'local' ? 'Local' : 'Prod'}
                </span>
                <Button
                  onClick={handleSwitchDatabase}
                  disabled={isSwitching || isLoading}
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 text-xs"
                >
                  {isSwitching ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Switching...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Switch
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Database Test Modal */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Database Connection Test</DialogTitle>
          </DialogHeader>
          
          {isTesting ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Testing database connection...</p>
            </div>
          ) : testResult ? (
            <div className="space-y-4">
              {/* Cookie Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Cookie Preference</h3>
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Value:</span> {testResult.cookiePreference || 'not set'}
                </p>
              </div>

              {/* Database URL Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Database URL</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Type:</span> <span className={`font-semibold ${testResult.databaseUrl.isProd ? 'text-green-600' : testResult.databaseUrl.isLocal ? 'text-blue-600' : 'text-gray-600'}`}>{testResult.databaseUrl.detectedType}</span></p>
                  <p><span className="font-medium">Preview:</span> <code className="text-xs bg-white px-2 py-1 rounded">{testResult.databaseUrl.preview}</code></p>
                  <p><span className="font-medium">Length:</span> {testResult.databaseUrl.length} characters</p>
                  <p><span className="font-medium">Is Local:</span> {testResult.databaseUrl.isLocal ? '✅ Yes' : '❌ No'}</p>
                  <p><span className="font-medium">Is Prod:</span> {testResult.databaseUrl.isProd ? '✅ Yes' : '❌ No'}</p>
                </div>
              </div>

              {/* Query Results */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Database Query Results</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Total Users:</span> {testResult.databaseQuery.userCount}</p>
                  {testResult.databaseQuery.firstUser && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="font-medium">First User (by creation date):</p>
                      <p><span className="font-medium">Email:</span> {testResult.databaseQuery.firstUser.email}</p>
                      <p><span className="font-medium">Role:</span> {testResult.databaseQuery.firstUser.role}</p>
                      <p><span className="font-medium">Created:</span> {new Date(testResult.databaseQuery.firstUser.createdAt).toLocaleString('tr-TR')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Environment Variables */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">Environment Variables</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">DATABASE_URL exists:</span> {testResult.environment.hasDatabseUrl ? '✅ Yes' : '❌ No'} ({testResult.environment.databseUrlLength} chars)</p>
                  <p><span className="font-medium">PROD_DATABASE_URL exists:</span> {testResult.environment.hasProdDatabseUrl ? '✅ Yes' : '❌ No'} ({testResult.environment.prodDatabseUrlLength} chars)</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button onClick={() => setShowTestModal(false)} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              No test results available
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

