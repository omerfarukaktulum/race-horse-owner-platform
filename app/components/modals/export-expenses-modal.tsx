'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/app/components/ui/button'
import { ModalSelect } from '@/app/components/ui/modal-field'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { Download, Calendar, UserRound, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'
import { useModalInteractionGuard } from '@/app/hooks/use-modal-interaction-guard'
import { formatCurrency, formatDateShort } from '@/lib/utils/format'
import { TR } from '@/lib/constants/tr'
import { normalizeTextForPDF, escapeTextForPDF } from '@/lib/utils/pdf-font'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Horse {
  id: string
  name: string
}

interface Expense {
  id: string
  date: string
  category: string
  customName?: string
  amount: number | string
  currency: string
  note?: string
  horse: {
    id: string
    name: string
    stablemate?: {
      id: string
      name: string
    } | null
  }
  addedBy: {
    email: string
    role: string
    ownerProfile?: { officialName: string }
    trainerProfile?: { fullName: string }
  }
}

interface ExportExpensesModalProps {
  open: boolean
  onClose: () => void
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

export function ExportExpensesModal({
  open,
  onClose,
}: ExportExpensesModalProps) {
  const { user } = useAuth()
  const [isExporting, setIsExporting] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedHorseId, setSelectedHorseId] = useState('')
  const [horses, setHorses] = useState<Horse[]>([])
  const [isLoadingHorses, setIsLoadingHorses] = useState(false)
  const [stablemateName, setStablemateName] = useState<string>('')
  const { guardPointerEvent, guardFocusEvent } = useModalInteractionGuard(open)

  // Generate month options: January of current year to current month
  const monthOptions = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-11
    const options: { value: string; label: string }[] = []

    for (let month = 0; month <= currentMonth; month++) {
      const monthValue = `${currentYear}-${String(month + 1).padStart(2, '0')}`
      const monthLabel = `${MONTH_NAMES[month]} ${currentYear}`
      options.push({ value: monthValue, label: monthLabel })
    }

    // Sort descending (most recent first)
    return options.reverse()
  }, [])

  // Set default to current month when modal opens
  useEffect(() => {
    if (open && !selectedMonth && monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0].value)
    }
  }, [open, selectedMonth, monthOptions])

  // Fetch horses and stablemate name when modal opens
  useEffect(() => {
    if (open) {
      fetchHorses()
      fetchStablemateName()
    } else {
      setSelectedHorseId('')
      setSelectedMonth('')
      setStablemateName('')
    }
  }, [open])

  const fetchStablemateName = async () => {
    try {
      if (user?.role === 'OWNER') {
        // For owners, fetch stablemate name
        const response = await fetch('/api/onboarding/stablemate', {
          credentials: 'include',
        })
        const data = await response.json()

        if (response.ok && data.stablemate?.name) {
          setStablemateName(data.stablemate.name)
        }
      } else if (user?.role === 'TRAINER') {
        // For trainers, they might work with multiple stablemates
        // We can skip showing stablemate name for trainers, or show the first one
        // For now, we'll skip it for trainers
        setStablemateName('')
      }
    } catch (error) {
      console.error('Fetch stablemate name error:', error)
      // Don't show error toast, just continue without stablemate name
    }
  }

  const fetchHorses = async () => {
    setIsLoadingHorses(true)
    try {
      const response = await fetch('/api/horses', {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Atlar yüklenemedi')
      }

      const horsesList = (data.horses || []).map((h: any) => ({
        id: h.id,
        name: h.name,
      }))
      setHorses(horsesList)
    } catch (error) {
      console.error('Fetch horses error:', error)
      toast.error('Atlar yüklenirken bir hata oluştu')
    } finally {
      setIsLoadingHorses(false)
    }
  }

  const getCategoryLabel = (expense: Expense) => {
    if (expense.customName && expense.customName.trim().length > 0) {
      return expense.customName
    }
    const translation =
      TR.expenseCategories[
        expense.category as keyof typeof TR.expenseCategories
      ]
    return translation || expense.category
  }

  const formatAddedBy = (expense: Expense) => {
    if (!expense.addedBy) return '-'
    const roleMap: Record<string, string> = {
      OWNER: 'At Sahibi',
      TRAINER: 'Antrenör',
    }
    const roleLabel = roleMap[expense.addedBy.role] || expense.addedBy.role || ''
    const profileName =
      expense.addedBy.ownerProfile?.officialName ||
      expense.addedBy.trainerProfile?.fullName ||
      ''

    if (profileName) {
      return `${roleLabel} (${profileName})`
    }
    return roleLabel || 'Bilinmiyor'
  }

  const getAmountValue = (amount?: number | string) => {
    if (typeof amount === 'number') {
      return isNaN(amount) ? 0 : amount
    }
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  // Format currency for PDF with Turkish Lira symbol
  // Note: The ₺ symbol might not render well, so we use "TL" as fallback
  const formatCurrencyForPDF = (amount: number, currency: string = 'TRY'): string => {
    const formatted = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
    // Use "TL" instead of ₺ symbol since it doesn't render well in default fonts
    return `${formatted} TL`
  }

  // Helper to normalize and encode Turkish characters for PDF
  const encodeTextForPDF = (text: string | undefined | null): string => {
    if (!text) return ''
    // Use the utility function for proper normalization
    return escapeTextForPDF(text)
  }

  const handleExport = async () => {
    if (!selectedMonth) {
      toast.error('Lütfen bir ay seçin')
      return
    }

    setIsExporting(true)

    try {
      // Parse selected month (format: YYYY-MM)
      const [year, month] = selectedMonth.split('-')
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      // Start of month: first day at 00:00:00
      const startDate = new Date(yearNum, monthNum - 1, 1, 0, 0, 0)
      // End of month: last day at 23:59:59
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59)

      // Build API URL
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })

      if (selectedHorseId) {
        params.append('horseId', selectedHorseId)
      }

      // Fetch expenses
      const response = await fetch(`/api/expenses?${params.toString()}`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Giderler yüklenemedi')
      }

      let expenses: Expense[] = data.expenses || []

      if (expenses.length === 0) {
        toast.error('Seçilen ay için gider bulunamadı')
        setIsExporting(false)
        return
      }

      // Sort expenses by date ascending (oldest first)
      expenses = expenses.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return dateA - dateB // Ascending order
      })

      // Generate PDF
      const doc = new jsPDF('l', 'mm', 'a4') // Landscape orientation

      // Set language for better Turkish character support
      // Note: Default fonts have limited Turkish character support
      // For full support, a custom font would be needed
      // doc.setLanguage('tr-TR') // Commented out - not a valid language code for jsPDF
      
      // Ensure proper encoding for Turkish characters
      // jsPDF v3+ should handle UTF-8 better, but we normalize text

      // Header - organized title section
      const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth
      const horseName = selectedHorseId
        ? horses.find(h => h.id === selectedHorseId)?.name
        : null

      // Title section - centered and organized
      const pageWidth = doc.internal.pageSize.getWidth()
      const tableMargin = 10 // Match table margin
      const leftMargin = tableMargin
      const titleX = pageWidth / 2
      
      // Use proper text encoding for Turkish characters
      const titleText = encodeTextForPDF('GIDER RAPORU') || '' // Using mapped version
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(titleText, titleX, 18, { align: 'center' })
      
      // Add stablemate name between title and month
      if (stablemateName) {
        doc.setFontSize(13)
        doc.setFont('helvetica', 'normal')
        const stablemateText = encodeTextForPDF(stablemateName) || ''
        doc.text(stablemateText, titleX, 25, { align: 'center' })
      }
      
      // Center month label below title (or below stablemate name if present)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      const monthText = encodeTextForPDF(monthLabel) || ''
      doc.text(monthText, titleX, stablemateName ? 30 : 25, { align: 'center' })
      if (horseName) {
        const horseText = encodeTextForPDF(`At: ${horseName}`) || ''
        doc.text(horseText, titleX, stablemateName ? 35 : 30, { align: 'center' })
      }

      // Calculate total and category distribution FIRST (before creating tables)
      const totalAmount = expenses.reduce(
        (acc, expense) => acc + getAmountValue(expense.amount),
        0
      )
      const defaultCurrency = expenses[0]?.currency || 'TRY'

      // Calculate category distribution
      const categoryTotals: Record<string, number> = {}
      expenses.forEach((expense) => {
        const categoryLabel = getCategoryLabel(expense)
        const amount = getAmountValue(expense.amount)
        categoryTotals[categoryLabel] = (categoryTotals[categoryLabel] || 0) + amount
      })

      // Sort categories by amount (descending)
      const sortedCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .map(([category, amount]) => ({
          category: encodeTextForPDF(category || ''),
          amount: encodeTextForPDF(formatCurrencyForPDF(amount, defaultCurrency)),
          percentage: `%${((amount / totalAmount) * 100).toFixed(1)}`, // Percentage symbol at front
        }))

      // Add category distribution table FIRST (before main expenses table)
      let categoryTableEndY = horseName ? 40 : 35
      if (sortedCategories.length > 0) {
        // Category distribution header - with top margin
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        const categoryTableStartY = horseName ? 40 : 35 // Added top margin
        doc.text(encodeTextForPDF('Gider Dagilimi') || '', leftMargin, categoryTableStartY)
        
        // Prepare category table data
        const categoryTableData = sortedCategories.map((item) => [
          item.category,
          item.amount,
          item.percentage, // Already includes % at front
        ])

        // Calculate dynamic width based on content
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        
        // Find the maximum width for each column
        let maxCategoryWidth = doc.getTextWidth('Kategori') + 6 // Header + padding
        let maxAmountWidth = doc.getTextWidth('Toplam') + 6
        let maxPercentageWidth = doc.getTextWidth('Yuzde') + 6
        
        // Check all data rows
        categoryTableData.forEach((row) => {
          const categoryWidth = doc.getTextWidth(row[0] as string) + 6
          const amountWidth = doc.getTextWidth(row[1] as string) + 6
          const percentageWidth = doc.getTextWidth(row[2] as string) + 6
          
          if (categoryWidth > maxCategoryWidth) maxCategoryWidth = categoryWidth
          if (amountWidth > maxAmountWidth) maxAmountWidth = amountWidth
          if (percentageWidth > maxPercentageWidth) maxPercentageWidth = percentageWidth
        })
        
        // Calculate total table width with some extra padding
        const categoryTableWidth = maxCategoryWidth + maxAmountWidth + maxPercentageWidth + 20 // Extra padding for cell padding
        
        autoTable(doc, {
          head: [[
            encodeTextForPDF('Kategori'),
            encodeTextForPDF('Toplam'),
            encodeTextForPDF('Yuzde'),
          ]],
          body: categoryTableData,
          startY: categoryTableStartY + 5,
          margin: { left: tableMargin, right: pageWidth - tableMargin - categoryTableWidth },
          tableWidth: categoryTableWidth,
          // Store table right edge for total alignment
          didDrawPage: (data: any) => {
            // This callback runs after table is drawn, we can use it to get exact table position
          },
          styles: {
            fontSize: 9,
            cellPadding: 3,
            font: 'helvetica',
            textColor: [0, 0, 0],
            halign: 'left',
            valign: 'middle',
          },
          headStyles: {
            fillColor: [99, 102, 241], // Indigo color
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
            valign: 'middle',
            // Don't set halign here - let columnStyles handle it for proper alignment
          },
          alternateRowStyles: {
            fillColor: [243, 244, 246], // Slightly darker gray for better distinction
          },
          columnStyles: {
            0: { cellWidth: maxCategoryWidth, halign: 'left', valign: 'middle' }, // Category - dynamic width
            1: { cellWidth: maxAmountWidth, halign: 'right', valign: 'middle' }, // Amount - dynamic width, right aligned
            2: { cellWidth: maxPercentageWidth, halign: 'right', valign: 'middle' }, // Percentage - dynamic width, right aligned
          },
          didParseCell: (data: any) => {
            // Normalize text in cells for better Turkish character support
            if (data.cell && data.cell.text && Array.isArray(data.cell.text)) {
              data.cell.text = data.cell.text.map((text: any) => 
                encodeTextForPDF(String(text || ''))
              )
            } else if (data.cell && data.cell.text) {
              data.cell.text = [encodeTextForPDF(String(data.cell.text))]
            }
          },
        })
        
        // Get the end position of category table
        categoryTableEndY = (doc as any).lastAutoTable.finalY || categoryTableStartY + 20
        
        // Add total at the bottom of category distribution table
        const totalText = encodeTextForPDF(`Toplam: ${formatCurrencyForPDF(totalAmount, defaultCurrency)}`) || ''
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        // Position at the left margin, left-aligned
        doc.text(totalText, leftMargin, categoryTableEndY + 8, { align: 'left' })
        
        // Update end position to include total
        categoryTableEndY = categoryTableEndY + 12
      }

      // Prepare table data with properly encoded text
      const tableData = expenses.map((expense) => {
        const row: any[] = [
          encodeTextForPDF(formatDateShort(expense.date)),
          encodeTextForPDF(expense.horse?.name || 'Genel'),
        ]

        // Add stablemate column if trainer
        if (user?.role === 'TRAINER') {
          row.push(encodeTextForPDF(expense.horse?.stablemate?.name || '-'))
        }

        row.push(
          encodeTextForPDF(getCategoryLabel(expense)),
          encodeTextForPDF(formatCurrencyForPDF(getAmountValue(expense.amount), expense.currency)),
          encodeTextForPDF(expense.note || '-'),
          encodeTextForPDF(formatAddedBy(expense))
        )

        return row
      })

      // Table columns with properly encoded text
      const columns = [
        encodeTextForPDF('Tarih') || '',
        encodeTextForPDF('At') || '',
        ...(user?.role === 'TRAINER' ? [encodeTextForPDF('Eküri') || ''] : []),
        encodeTextForPDF('Kategori') || '',
        encodeTextForPDF('Tutar') || '',
        encodeTextForPDF('Detay') || '',
        encodeTextForPDF('Ekleyen') || '',
      ]

      // Force new page for detailed expenses table
      doc.addPage()
      
      // Add title for detailed expenses table
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      const detailedTableStartY = 20 // Same top margin as other tables on new page
      doc.text(encodeTextForPDF('Detayli Giderler') || '', leftMargin, detailedTableStartY)

      // Add main expenses table AFTER category distribution table
      autoTable(doc, {
        head: [columns],
        body: tableData,
        startY: detailedTableStartY + 7, // Start after title with some spacing
        margin: { left: tableMargin, right: tableMargin, top: 5 },
        tableWidth: 'auto', // Auto width to use full available space
        styles: {
          fontSize: 9,
          cellPadding: 3,
          font: 'helvetica',
          textColor: [0, 0, 0],
          halign: 'left',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [99, 102, 241], // Indigo color
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'left',
        },
        alternateRowStyles: {
          fillColor: [243, 244, 246], // Slightly darker gray for better distinction
        },
        // Ensure even rows are colored (rows are 0-indexed, so even = 0, 2, 4...)
        didDrawCell: (data: any) => {
          // This is handled by alternateRowStyles, but we can customize further if needed
        },
        // Ensure proper text rendering for Turkish characters
        didParseCell: (data: any) => {
          // Normalize text in cells for better Turkish character support
          if (data.cell && data.cell.text && Array.isArray(data.cell.text)) {
            data.cell.text = data.cell.text.map((text: any) => 
              encodeTextForPDF(String(text || ''))
            )
          } else if (data.cell && data.cell.text) {
            data.cell.text = [encodeTextForPDF(String(data.cell.text))]
          }
        },
        // Use UTF-8 encoding for better character support
        useCss: false,
        // Calculate column widths to fill full width
        // Landscape A4: ~297mm width, minus margins (20mm) = ~277mm available
        columnStyles: {
          0: { cellWidth: 'auto' }, // Date - auto width
          1: { cellWidth: 'auto' }, // Horse - auto width
          ...(user?.role === 'TRAINER' ? { 2: { cellWidth: 'auto' } } : {}), // Stablemate - auto width
          [user?.role === 'TRAINER' ? 3 : 2]: { cellWidth: 'auto' }, // Category - auto width
          [user?.role === 'TRAINER' ? 4 : 3]: { cellWidth: 'auto' }, // Amount - auto width
          [user?.role === 'TRAINER' ? 5 : 4]: { cellWidth: 'auto' }, // Detail - auto width
          [user?.role === 'TRAINER' ? 6 : 5]: { cellWidth: 'auto' }, // Added By - auto width
        },
      })


      // Add page numbers to all pages at bottom center
      const pageCount = doc.internal.pages.length - 1 // Subtract 1 because pages array includes a blank page
      const pageHeight = doc.internal.pageSize.getHeight()
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        const pageText = `${i}/${pageCount}`
        // Position page number at bottom center
        doc.text(pageText, pageWidth / 2, pageHeight - 10, { align: 'center' })
      }

      // Generate filename: <ekuri-name>-<monthYEAR>-gider-raporu.pdf
      // Extract month name and year from label (e.g., "Kasim 2025" -> "Kasim2025")
      const monthYear = monthLabel.replace(/\s+/g, '') // Remove spaces
      const stablemateNameForFile = stablemateName || 'Ekuri'
      // Sanitize stablemate name for filename (remove special characters, spaces)
      const sanitizedStablemateName = stablemateNameForFile
        .replace(/[^a-zA-Z0-9]/g, '-') // Replace special chars with dash
        .replace(/-+/g, '-') // Replace multiple dashes with single dash
        .toLowerCase()
      const filename = `${sanitizedStablemateName}-${monthYear}-gider-raporu.pdf`

      // Save PDF
      doc.save(filename)

      toast.success('PDF başarıyla oluşturuldu')
      onClose()
    } catch (error) {
      console.error('Export error:', error)
      toast.error('PDF oluşturulurken bir hata oluştu')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[320px] max-h-[90vh] overflow-y-auto bg-indigo-50/95 backdrop-blur-sm shadow-xl border border-gray-200/50 p-4">
        <DialogHeader className="text-center sm:text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <Download className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
            Giderleri Dışa Aktar
          </DialogTitle>
        </DialogHeader>
        <div className="w-[260px] mx-auto space-y-5">
          <ModalSelect
            label="Ay Seçin"
            required
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={isExporting}
            onMouseDown={guardPointerEvent}
            onTouchStart={guardPointerEvent}
            onFocus={guardFocusEvent}
            icon={<Calendar className="h-4 w-4" />}
          >
            <option value="">Ay seçin</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </ModalSelect>

          <ModalSelect
            label="At Seçin (İsteğe Bağlı)"
            value={selectedHorseId}
            onChange={(e) => setSelectedHorseId(e.target.value)}
            disabled={isExporting || isLoadingHorses}
            onMouseDown={guardPointerEvent}
            onTouchStart={guardPointerEvent}
            onFocus={guardFocusEvent}
            icon={<UserRound className="h-4 w-4" />}
            helperText="Boş bırakılırsa tüm atlar için giderler dışa aktarılır"
          >
            <option value="">Tüm Atlar</option>
            {horses.map((horse) => (
              <option key={horse.id} value={horse.id}>
                {horse.name}
              </option>
            ))}
          </ModalSelect>

          <div className="pt-2">
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isExporting}
                className="border-2 border-[#6366f1]/30 hover:bg-[#6366f1]/5 hover:border-[#6366f1]/50 text-[#6366f1]"
              >
                {TR.common.cancel}
              </Button>
              <Button
                type="button"
                onClick={handleExport}
                disabled={isExporting || !selectedMonth}
                className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Dışa Aktar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

