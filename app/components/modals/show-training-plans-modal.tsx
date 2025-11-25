'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { formatDateShort } from '@/lib/utils/format'
import { NotebookPen, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { AddTrainingPlanModal } from './add-training-plan-modal'

interface TrainingPlan {
  id: string
  planDate: string
  distance: string
  note?: string | null
  racecourseId?: string | null
  racecourse?: {
    id: string
    name: string
  } | null
  addedById: string
  addedBy: {
    email: string
    role: string
    ownerProfile?: { officialName: string }
    trainerProfile?: { fullName: string }
  }
}

interface ShowTrainingPlansModalProps {
  open: boolean
  onClose: () => void
  horseId: string
  horseName: string
  onRefresh?: () => void
}

const ROLE_MAP: Record<string, string> = {
  OWNER: 'At Sahibi',
  TRAINER: 'Antrenör',
  GROOM: 'Groom',
}

function formatAddedBy(plan: TrainingPlan) {
  if (!plan.addedBy) return '-'
  const roleLabel = ROLE_MAP[plan.addedBy.role] || plan.addedBy.role || ''
  const profileName =
    plan.addedBy.ownerProfile?.officialName ||
    plan.addedBy.trainerProfile?.fullName

  if (roleLabel && profileName) {
    return `${roleLabel} (${profileName})`
  }

  return roleLabel || profileName || 'Bilinmiyor'
}

function calculateDaysUntil(planDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const plan = new Date(planDate)
  plan.setHours(0, 0, 0, 0)
  
  const diffTime = plan.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} gün önce`
  } else if (diffDays === 0) {
    return 'Bugün'
  } else {
    return `${diffDays} gün sonra`
  }
}

export function ShowTrainingPlansModal({
  open,
  onClose,
  horseId,
  horseName,
  onRefresh,
}: ShowTrainingPlansModalProps) {
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<TrainingPlan | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    if (open) {
      fetchPlans()
    }
  }, [open, horseId])

  const fetchPlans = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/horses/${horseId}/training-plans`, {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('İdman planları yüklenemedi')
      }
      const data = await response.json()
      // Sort by date ascending (future dates first)
      const sorted = (data.plans || []).sort((a: TrainingPlan, b: TrainingPlan) => {
        return new Date(a.planDate).getTime() - new Date(b.planDate).getTime()
      })
      setPlans(sorted)
    } catch (error: any) {
      console.error('Error fetching training plans:', error)
      toast.error(error.message || 'İdman planları yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (plan: TrainingPlan) => {
    setSelectedPlanForEdit(plan)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (planId: string) => {
    if (!confirm('Bu idman planını silmek istediğinizden emin misiniz?')) {
      return
    }

    setIsDeleting(planId)
    try {
      const response = await fetch(`/api/horses/${horseId}/training-plans/${planId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'İdman planı silinemedi')
      }

      toast.success('İdman planı silindi')
      fetchPlans()
      onRefresh?.()
    } catch (error: any) {
      console.error('Error deleting training plan:', error)
      toast.error(error.message || 'İdman planı silinirken bir hata oluştu')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleEditSuccess = () => {
    fetchPlans()
    onRefresh?.()
    setIsEditModalOpen(false)
    setSelectedPlanForEdit(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-7xl max-h-[90vh] p-0 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
                  <NotebookPen className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="w-full">
                <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-center">
                  {horseName}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Yükleniyor...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Add Button - Top Right */}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    Ekle
                  </Button>
                </div>
                
                {plans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <NotebookPen className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 text-lg">Henüz idman planı eklenmemiş</p>
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Zamanlama
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Hipodrom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Mesafe
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Not
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Ekleyen
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {plans.map((plan, index) => {
                    const isStriped = index % 2 === 1
                    return (
                      <tr
                        key={plan.id}
                        className={`transition-colors ${
                          isStriped ? 'bg-gray-50' : 'bg-white'
                        } hover:bg-indigo-50/50`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {formatDateShort(plan.planDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-700">
                            {calculateDaysUntil(plan.planDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-700">
                            {plan.racecourse?.name || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-700">
                            {plan.distance === 'Kenter' || plan.distance === 'Tırıs' 
                              ? plan.distance 
                              : `${plan.distance}m`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">
                            {plan.note || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-700">
                            {formatAddedBy(plan)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(plan)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                              title="Düzenle"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(plan.id)}
                              disabled={isDeleting === plan.id}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
                </div>
                )}
              </div>
            )}
          </div>

        </DialogContent>
      </Dialog>

      {/* Add Training Plan Modal */}
      <AddTrainingPlanModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        horseId={horseId}
        horseName={horseName}
        onSuccess={() => {
          setIsAddModalOpen(false)
          fetchPlans()
          onRefresh?.()
        }}
      />

      {/* Edit Training Plan Modal */}
      {selectedPlanForEdit && (
        <AddTrainingPlanModal
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedPlanForEdit(null)
          }}
          horseId={horseId}
          horseName={horseName}
          onSuccess={handleEditSuccess}
          mode="edit"
          planId={selectedPlanForEdit.id}
          initialPlan={{
            planDate: selectedPlanForEdit.planDate,
            distance: selectedPlanForEdit.distance,
            note: selectedPlanForEdit.note,
            racecourseId: selectedPlanForEdit.racecourseId || null,
          }}
        />
      )}
    </>
  )
}

