import type {
  HorseRegisteredEmailData,
  HorseDeclaredEmailData,
  NewTrainingEmailData,
  NewExpenseEmailData,
  NewNoteEmailData,
  NewRaceEmailData,
} from './types'
import { TR } from '@/lib/constants/tr'

/**
 * Format date for email display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/**
 * Format currency for email display
 */
function formatCurrency(amount: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Base email template wrapper
 */
function baseTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #1a1a1a; margin: 0 0 10px 0; font-size: 24px;">${title}</h1>
  </div>
  <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
    ${content}
  </div>
  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center;">
    <p>Bu e-posta Ekurim.com.tr tarafından otomatik olarak gönderilmiştir.</p>
    <p>Bildirim ayarlarınızı değiştirmek için uygulamaya giriş yapabilirsiniz.</p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Horse Registered email template
 */
export function horseRegisteredTemplate(data: HorseRegisteredEmailData): string {
  const content = `
    <p>Merhaba ${data.recipient.name || 'Değerli Kullanıcı'},</p>
    
    <p><strong>${data.horseName}</strong> adlı atınız için yeni bir kayıt oluşturuldu.</p>
    
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Kayıt Tarihi:</strong> ${formatDate(data.registrationDate)}</p>
      ${data.raceDate ? `<p style="margin: 5px 0;"><strong>Yarış Tarihi:</strong> ${formatDate(data.raceDate)}</p>` : ''}
      ${data.city ? `<p style="margin: 5px 0;"><strong>Şehir:</strong> ${data.city}</p>` : ''}
      ${data.distance ? `<p style="margin: 5px 0;"><strong>Mesafe:</strong> ${data.distance} m</p>` : ''}
      ${data.addedByName ? `<p style="margin: 5px 0;"><strong>Ekleyen:</strong> ${data.addedByRole === 'TRAINER' ? 'Antrenör' : `At Sahibi (${data.addedByName})`}</p>` : ''}
    </div>
    
    <p style="margin-top: 20px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ekurim.com.tr'}/app/horses/${data.horseId}" 
         style="background-color: #007bff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        At Detaylarını Görüntüle
      </a>
    </p>
  `

  return baseTemplate('Yeni At Kaydı', content)
}

/**
 * Horse Declared email template
 */
export function horseDeclaredTemplate(data: HorseDeclaredEmailData): string {
  const content = `
    <p>Merhaba ${data.recipient.name || 'Değerli Kullanıcı'},</p>
    
    <p><strong>${data.horseName}</strong> adlı atınız için yeni bir deklarasyon yapıldı.</p>
    
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Deklarasyon Tarihi:</strong> ${formatDate(data.declarationDate)}</p>
      <p style="margin: 5px 0;"><strong>Yarış Tarihi:</strong> ${formatDate(data.raceDate)}</p>
      ${data.city ? `<p style="margin: 5px 0;"><strong>Şehir:</strong> ${data.city}</p>` : ''}
      ${data.distance ? `<p style="margin: 5px 0;"><strong>Mesafe:</strong> ${data.distance} m</p>` : ''}
      ${data.jockeyName ? `<p style="margin: 5px 0;"><strong>Jokey:</strong> ${data.jockeyName}</p>` : ''}
      ${data.addedByName ? `<p style="margin: 5px 0;"><strong>Ekleyen:</strong> ${data.addedByRole === 'TRAINER' ? 'Antrenör' : `At Sahibi (${data.addedByName})`}</p>` : ''}
    </div>
    
    <p style="margin-top: 20px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ekurim.com.tr'}/app/horses/${data.horseId}" 
         style="background-color: #007bff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        At Detaylarını Görüntüle
      </a>
    </p>
  `

  return baseTemplate('Yeni At Deklarasyonu', content)
}

/**
 * New Training email template
 */
export function newTrainingTemplate(data: NewTrainingEmailData): string {
  const content = `
    <p>Merhaba ${data.recipient.name || 'Değerli Kullanıcı'},</p>
    
    <p><strong>${data.horseName}</strong> adlı atınız için yeni bir idman kaydı eklendi.</p>
    
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>İdman Tarihi:</strong> ${formatDate(data.trainingDate)}</p>
      ${data.distance ? `<p style="margin: 5px 0;"><strong>Mesafe/Tip:</strong> ${data.distance}</p>` : ''}
      ${data.racecourse ? `<p style="margin: 5px 0;"><strong>Hipodrom:</strong> ${data.racecourse}</p>` : ''}
      ${data.note ? `<p style="margin: 5px 0;"><strong>Not:</strong> ${data.note}</p>` : ''}
      ${data.addedByName ? `<p style="margin: 5px 0;"><strong>Ekleyen:</strong> ${data.addedByRole === 'TRAINER' ? 'Antrenör' : `At Sahibi (${data.addedByName})`}</p>` : ''}
    </div>
    
    <p style="margin-top: 20px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ekurim.com.tr'}/app/horses/${data.horseId}" 
         style="background-color: #007bff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        At Detaylarını Görüntüle
      </a>
    </p>
  `

  return baseTemplate('Yeni İdman Kaydı', content)
}

/**
 * New Expense email template
 */
export function newExpenseTemplate(data: NewExpenseEmailData): string {
  const content = `
    <p>Merhaba ${data.recipient.name || 'Değerli Kullanıcı'},</p>
    
    <p><strong>${data.horseName}</strong> adlı atınız için yeni bir gider kaydı eklendi.</p>
    
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Tarih:</strong> ${formatDate(data.expenseDate)}</p>
      <p style="margin: 5px 0;"><strong>Kategori:</strong> ${TR.expenseCategories[data.category as keyof typeof TR.expenseCategories] || data.category}</p>
      <p style="margin: 5px 0;"><strong>Tutar:</strong> ${formatCurrency(data.amount, data.currency)}</p>
      ${data.note ? `<p style="margin: 5px 0;"><strong>Not:</strong> ${data.note}</p>` : ''}
      ${data.addedByName ? `<p style="margin: 5px 0;"><strong>Ekleyen:</strong> ${data.addedByRole === 'TRAINER' ? 'Antrenör' : `At Sahibi (${data.addedByName})`}</p>` : ''}
    </div>
    
    <p style="margin-top: 20px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ekurim.com.tr'}/app/horses/${data.horseId}" 
         style="background-color: #007bff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        At Detaylarını Görüntüle
      </a>
    </p>
  `

  return baseTemplate('Yeni Gider Kaydı', content)
}

/**
 * New Note email template
 */
export function newNoteTemplate(data: NewNoteEmailData): string {
  const content = `
    <p>Merhaba ${data.recipient.name || 'Değerli Kullanıcı'},</p>
    
    <p><strong>${data.horseName}</strong> adlı atınız için yeni bir not eklendi.</p>
    
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Tarih:</strong> ${formatDate(data.noteDate)}</p>
      ${data.kiloValue ? `<p style="margin: 5px 0;"><strong>Kilo:</strong> ${data.kiloValue} kg</p>` : ''}
      <p style="margin: 5px 0;"><strong>Not:</strong></p>
      <p style="margin: 10px 0; padding: 10px; background-color: #ffffff; border-left: 3px solid #007bff;">${data.note}</p>
      ${data.addedByName ? `<p style="margin: 5px 0;"><strong>Ekleyen:</strong> ${data.addedByRole === 'TRAINER' ? 'Antrenör' : `At Sahibi (${data.addedByName})`}</p>` : ''}
    </div>
    
    <p style="margin-top: 20px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ekurim.com.tr'}/app/horses/${data.horseId}" 
         style="background-color: #007bff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        At Detaylarını Görüntüle
      </a>
    </p>
  `

  return baseTemplate('Yeni Not', content)
}

/**
 * New Race email template
 */
export function newRaceTemplate(data: NewRaceEmailData): string {
  const content = `
    <p>Merhaba ${data.recipient.name || 'Değerli Kullanıcı'},</p>
    
    <p><strong>${data.horseName}</strong> adlı atınız için yeni bir yarış sonucu eklendi.</p>
    
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Yarış Tarihi:</strong> ${formatDate(data.raceDate)}</p>
      ${data.position ? `<p style="margin: 5px 0;"><strong>Sıralama:</strong> ${data.position}. sıra</p>` : ''}
      ${data.city ? `<p style="margin: 5px 0;"><strong>Şehir:</strong> ${data.city}</p>` : ''}
      ${data.distance ? `<p style="margin: 5px 0;"><strong>Mesafe:</strong> ${data.distance} m</p>` : ''}
      ${data.surface ? `<p style="margin: 5px 0;"><strong>Pist:</strong> ${data.surface}</p>` : ''}
      ${data.prizeMoney ? `<p style="margin: 5px 0;"><strong>İkramiye:</strong> ${formatCurrency(data.prizeMoney)}</p>` : ''}
      ${data.addedByName ? `<p style="margin: 5px 0;"><strong>Ekleyen:</strong> ${data.addedByRole === 'TRAINER' ? 'Antrenör' : data.addedByRole === 'SYSTEM' ? 'Sistem' : `At Sahibi (${data.addedByName})`}</p>` : ''}
    </div>
    
    <p style="margin-top: 20px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ekurim.com.tr'}/app/horses/${data.horseId}" 
         style="background-color: #007bff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        At Detaylarını Görüntüle
      </a>
    </p>
  `

  return baseTemplate('Yeni Yarış Sonucu', content)
}

