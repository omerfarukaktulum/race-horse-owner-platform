'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs'
import { UserPlus, UserCheck, Users, MapPin, Building, Shield } from 'lucide-react'
import AdminUsersTab from './components/AdminUsersTab'
import AdminCreateOwnerTab from './components/AdminCreateOwnerTab'
import AdminCreateTrainerTab from './components/AdminCreateTrainerTab'
import AdminCreateAdminTab from './components/AdminCreateAdminTab'
import AdminRacecoursesTab from './components/AdminRacecoursesTab'
import AdminFarmsTab from './components/AdminFarmsTab'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tabs */}
      <div className="max-w-3xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Kullanıcılar</span>
            </TabsTrigger>
            <TabsTrigger value="create-owner" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">At Sahibi</span>
            </TabsTrigger>
            <TabsTrigger value="create-trainer" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Antrenör</span>
            </TabsTrigger>
            <TabsTrigger value="create-admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </TabsTrigger>
            <TabsTrigger value="racecourses" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Hipodromlar</span>
            </TabsTrigger>
            <TabsTrigger value="farms" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline">Çiftlikler</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="users" className="mt-0">
          <AdminUsersTab />
        </TabsContent>

        <TabsContent value="create-owner" className="mt-0">
          <AdminCreateOwnerTab />
        </TabsContent>

        <TabsContent value="create-trainer" className="mt-0">
          <AdminCreateTrainerTab />
        </TabsContent>

        <TabsContent value="create-admin" className="mt-0">
          <AdminCreateAdminTab />
        </TabsContent>

        <TabsContent value="racecourses" className="mt-0">
          <AdminRacecoursesTab />
        </TabsContent>

        <TabsContent value="farms" className="mt-0">
          <AdminFarmsTab />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
