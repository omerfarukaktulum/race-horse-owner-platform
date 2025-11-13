# EKÜRİM Design System

## Brand Identity

- **Brand Name**: EKÜRİM
- **Primary Colors**: Indigo/Blue gradient (`#6366f1` to `#4f46e5`)
- **Hover States**: Slightly darker gradient (`#5558e5` to `#4338ca`)

## Color Palette

### Primary Colors
- **Primary Gradient**: `from-[#6366f1] to-[#4f46e5]` (indigo-600 to indigo-700)
- **Primary Hover**: `hover:from-[#5558e5] hover:to-[#4338ca]`
- **Primary Text**: `text-[#6366f1]` or gradient text with `bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]`

### Background Colors
- **Page Background**: `bg-gradient-to-br from-indigo-50 via-white to-indigo-50`
- **Card Background**: `bg-white/90 backdrop-blur-sm` or `bg-white/80 backdrop-blur-sm`
- **Card Border**: `border border-gray-200/50` or `border border-indigo-100/50`

### Feature Card Colors (for variety)
- **At Yönetimi**: Indigo/Purple (`from-indigo-500 to-purple-600`)
- **Gider Takibi**: Emerald/Teal (`from-emerald-500 to-teal-600`)
- **İstatistikler**: Amber/Orange (`from-amber-500 to-orange-600`)
- **TJK Senkronizasyon**: Rose/Pink (`from-rose-500 to-pink-600`)

## Typography

- **Headings**: Bold with gradient text for main titles
- **Card Titles**: `text-2xl font-bold` with gradient or solid color
- **Body Text**: `text-gray-600` or `text-gray-700`
- **Small Text**: `text-xs` or `text-sm`

## Components

### Buttons

#### Primary Button
```tsx
<Button className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl">
  Button Text
</Button>
```

#### Secondary/Outline Button
```tsx
<Button variant="outline" className="border-2 border-[#6366f1]/30 hover:bg-[#6366f1]/5 hover:border-[#6366f1]/50 text-[#6366f1]">
  Button Text
</Button>
```

#### Ghost Button
```tsx
<Button variant="ghost" className="text-gray-600 hover:text-gray-900">
  Button Text
</Button>
```

### Cards

#### Standard Card
```tsx
<Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
  {/* Content */}
</Card>
```

#### Feature Card (with hover effects)
```tsx
<Card className="bg-white/80 backdrop-blur-sm rounded-lg border border-indigo-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
  {/* Content */}
</Card>
```

#### Feature Highlight Card (small, centered)
```tsx
<div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
  <div className="text-center">
    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div className="text-2xl font-bold text-indigo-600 mb-1">Number/Text</div>
    <div className="text-sm font-bold text-indigo-600">Title</div>
    <div className="text-xs text-gray-700 font-bold mt-1">Subtitle</div>
  </div>
</div>
```

### Icons

#### Icon Badge (circular gradient)
```tsx
<div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
  <Icon className="h-8 w-8 text-white" />
</div>
```

#### Icon Badge (small, in cards)
```tsx
<div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
  <Icon className="h-6 w-6 text-white" />
</div>
```

### Common Icons by Context
- **Authentication**: `LogIn` (sign in), `UserPlus` (register)
- **Horse Management**: `LayoutGrid` (listing/grid view)
- **Expenses**: `DollarSign`
- **Statistics**: `BarChart3` or `TrendingUp`
- **Settings**: `Settings`
- **Database/Sync**: `Database`

## Spacing & Layout

- **Container**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Section Padding**: `py-8` or `py-16` or `py-20`
- **Card Padding**: `p-4 sm:p-6` or `p-6`
- **Grid Gaps**: `gap-4` or `gap-6`

## Effects & Animations

- **Hover Scale**: `hover:scale-105`
- **Shadow**: `shadow-lg hover:shadow-xl`
- **Transitions**: `transition-all duration-300`
- **Backdrop Blur**: `backdrop-blur-sm`

## Page Structure

### Landing/Auth Pages
- Background: `bg-gradient-to-br from-indigo-50 via-white to-indigo-50`
- Centered card with `max-w-md` or `max-w-2xl`
- Icon badge at top
- Gradient title text
- Form or content below

### App Pages (Authenticated)
- Background: `bg-gradient-to-br from-indigo-50 via-white to-indigo-50`
- Navbar at top (sticky)
- Main content: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`
- Card-based layouts with consistent spacing

## Examples

### Feature Highlights Section (Homepage style)
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
    <div className="text-center">
      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
        <LayoutGrid className="h-6 w-6 text-white" />
      </div>
      <div className="text-2xl font-bold text-indigo-600 mb-1">Tüm Atlarınız</div>
      <div className="text-sm font-bold text-indigo-600">At Yönetimi</div>
      <div className="text-xs text-gray-700 font-bold mt-1">tek platformda</div>
    </div>
  </div>
</div>
```

### Action Card (Homepage style)
```tsx
<Link href="/app/horses">
  <Card className="p-4 sm:p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-white shadow-lg border border-blue-100 cursor-pointer">
    <div className="flex-1 min-w-0 mb-4">
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
        {TR.nav.horses}
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">
        Atlarınızı görüntüleyin ve yönetin
      </p>
    </div>
    <div className="flex justify-center my-4 sm:my-6">
      <LayoutGrid className="h-12 w-12 text-[#6366f1]" />
    </div>
    <Button className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] shadow-lg hover:shadow-xl text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg w-full transition-all duration-300 text-sm sm:text-base">
      Atlara Git
    </Button>
  </Card>
</Link>
```

