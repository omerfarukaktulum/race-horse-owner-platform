'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'

export default function StablemateSetupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [foundationYear, setFoundationYear] = useState('')
  const [coOwners, setCoOwners] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/onboarding/stablemate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          foundationYear: foundationYear ? parseInt(foundationYear) : undefined,
          coOwners: coOwners ? coOwners.split('\n').filter(Boolean) : [],
          location,
          website: website || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Eküri oluşturulamadı')
      }

      toast.success('Eküri oluşturuldu')
      router.push('/onboarding/import-horses')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{TR.onboarding.setupStablemate}</CardTitle>
          <CardDescription>
            {TR.onboarding.setupStablemateDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{TR.stablemate.name} *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Örn: Mehmet Ali Eküri"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="foundationYear">{TR.stablemate.foundationYear}</Label>
              <Input
                id="foundationYear"
                type="number"
                placeholder="Örn: 2020"
                value={foundationYear}
                onChange={(e) => setFoundationYear(e.target.value)}
                min="1900"
                max={new Date().getFullYear()}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coOwners">{TR.stablemate.coOwners}</Label>
              <textarea
                id="coOwners"
                placeholder="Her satıra bir ortak sahip adı"
                value={coOwners}
                onChange={(e) => setCoOwners(e.target.value)}
                disabled={isSubmitting}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{TR.stablemate.location}</Label>
              <Input
                id="location"
                type="text"
                placeholder="Örn: İstanbul"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">{TR.stablemate.website}</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                {TR.common.back}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? TR.common.loading : TR.common.next}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

