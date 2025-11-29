# Pagination Analysis for Expenses & Notes Pages

## Current State

### Horse Detail Page - Expenses & Statistics

**Expenses:**
- ✅ Included in main query: `expenses: { take: 10 }` (line 61)
- ⚠️ **Issue**: Only 10 expenses are loaded, but the table might need more
- Statistics use `raceHistory`, `gallops`, and `expenses` that are already included

**Statistics:**
- ✅ Uses data already in the query (races, gallops, expenses)
- ✅ No additional API calls needed
- ✅ All data is available for chart calculations

**Recommendation:**
- Increase `take: 10` to `take: 100` or remove limit for expenses in horse detail
- Statistics are fine as-is

---

### General Expenses & Notes Pages

**Current Implementation:**
- `/api/expenses`: Default limit 1000 (owners), 10000 (trainers)
- `/api/notes`: Optional limit, max 25
- Both fetch ALL data at once
- Client-side filtering and search

**Current Flow:**
1. Fetch all expenses/notes on page load
2. Store in state
3. Apply filters/search in memory (client-side)
4. Display filtered results

**Pros:**
- Fast filtering (no API calls)
- Works offline after initial load
- Simple implementation

**Cons:**
- Slow initial load with many records (1000+)
- High memory usage
- Not scalable (breaks with 10,000+ records)

---

## Should We Add Pagination?

### Yes, if:
- Users have 500+ expenses/notes
- Initial load is slow
- Memory usage is a concern

### No, if:
- Users typically have < 200 expenses/notes
- Current performance is acceptable
- Users need to see all data at once for filtering

---

## Pagination Strategy with Search/Filtering

### Approach 1: Server-Side Pagination (Recommended)

**How it works:**
1. User searches/filters → Reset to page 1
2. Send search query + filters to API
3. API applies filters, then paginates filtered results
4. Return page 1 of filtered results
5. User clicks "Next" → Load page 2 of same filtered results

**API Changes:**
```typescript
// /api/expenses?page=1&limit=50&search=vet&category=ILAC&startDate=2024-01-01
const page = parseInt(searchParams.get('page') || '1')
const limit = parseInt(searchParams.get('limit') || '50')
const search = searchParams.get('search') // Search in note, customName, horse name
const category = searchParams.get('category')
const startDate = searchParams.get('startDate')
const endDate = searchParams.get('endDate')

// Apply all filters to WHERE clause
const where = {
  ...(search && {
    OR: [
      { note: { contains: search, mode: 'insensitive' } },
      { customName: { contains: search, mode: 'insensitive' } },
      { horse: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }),
  ...(category && { category }),
  ...(startDate && { date: { gte: new Date(startDate) } }),
  ...(endDate && { date: { lte: new Date(endDate) } }),
}

// Paginate filtered results
const expenses = await prisma.expense.findMany({
  where,
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { date: 'desc' },
})

const total = await prisma.expense.count({ where })

return { expenses, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
```

**Frontend Changes:**
```typescript
// When user searches/filters
const handleSearch = (query: string) => {
  setSearchQuery(query)
  setPage(1) // Reset to page 1
  fetchExpenses(1, query, filters) // Fetch with new search
}

// When user clicks "Next"
const handleNextPage = () => {
  setPage(page + 1)
  fetchExpenses(page + 1, searchQuery, filters) // Fetch next page with same filters
}

// Infinite scroll alternative
const handleScroll = () => {
  if (isNearBottom && hasMore && !isLoading) {
    fetchExpenses(page + 1, searchQuery, filters) // Load next page
  }
}
```

**Pros:**
- Scalable (works with millions of records)
- Fast initial load (only 50 items)
- Low memory usage
- Search/filter happens on server (faster for large datasets)

**Cons:**
- Requires API call for each page
- Requires API call when filtering/searching
- More complex implementation

---

### Approach 2: Hybrid (Client-Side Filter + Server-Side Pagination)

**How it works:**
1. Load first page (50 items) on initial load
2. User searches/filters → Apply to loaded items (client-side)
3. If filtered results < 50, load more pages until we have enough
4. User scrolls → Load next page, apply filters to new items

**Pros:**
- Fast filtering for loaded items
- Progressive loading
- Good UX (no loading spinner for simple filters)

**Cons:**
- Complex logic (when to load more?)
- Can still be slow with many records
- Inconsistent behavior

---

### Approach 3: Infinite Scroll (Recommended for Mobile)

**How it works:**
1. Load first page (50 items)
2. User scrolls to bottom → Auto-load next page
3. Search/filter → Reset and load page 1 of filtered results
4. Continue scrolling → Load more filtered results

**Implementation:**
```typescript
useEffect(() => {
  const handleScroll = () => {
    if (
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000
      && !isLoading
      && hasMore
    ) {
      loadNextPage()
    }
  }
  
  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [isLoading, hasMore])
```

**Pros:**
- Great UX (no pagination buttons)
- Works well on mobile
- Progressive loading

**Cons:**
- Harder to jump to specific page
- Can load too much if user scrolls fast

---

## Recommendation

### For Horse Detail Page Expenses:
- ✅ **Increase limit**: Change `take: 10` to `take: 100` or `take: 200`
- ✅ **Statistics are fine**: Already using included data

### For General Expenses/Notes Pages:

**Option A: Add Server-Side Pagination (Best for scalability)**
- Add `?page=1&limit=50` to API
- Move search/filter to server-side
- Use infinite scroll or "Load More" button
- **When to load next page**: On scroll to bottom OR click "Load More"

**Option B: Keep Current (If performance is OK)**
- Only add pagination if users report slowness
- Monitor with 500+ records

**My Recommendation:**
- Start with **Option A** for expenses (users can have many)
- Keep **Option B** for notes (typically fewer, max 25 limit already)

---

## Implementation Plan

### Phase 1: Horse Detail Expenses
1. Increase `take: 10` → `take: 100` in `/api/horses/[id]/route.ts`
2. Test with horses that have 50+ expenses

### Phase 2: General Expenses Page (If needed)
1. Add pagination params to `/api/expenses`
2. Move search/filter to server-side
3. Add infinite scroll or "Load More" button
4. Reset to page 1 when search/filter changes

### Phase 3: General Notes Page (If needed)
1. Similar to expenses, but lower priority (already has limit)

---

## Search/Filter with Pagination - Decision Flow

```
User Action → What Happens
─────────────────────────────────
1. User types in search box
   → Debounce (wait 500ms)
   → Reset page to 1
   → Fetch page 1 with search query
   → Display results

2. User applies filter
   → Reset page to 1
   → Fetch page 1 with filter + existing search
   → Display results

3. User scrolls to bottom (infinite scroll)
   → Check if hasMore && !isLoading
   → Fetch next page with same search + filters
   → Append to existing results

4. User clicks "Next" button (if using buttons)
   → Increment page
   → Fetch next page with same search + filters
   → Replace results (or append for infinite scroll)
```

---

## Code Example: Server-Side Pagination with Search

```typescript
// API: /api/expenses
const { searchParams } = new URL(request.url)
const page = parseInt(searchParams.get('page') || '1')
const limit = parseInt(searchParams.get('limit') || '50')
const search = searchParams.get('search')
const category = searchParams.get('category')
// ... other filters

const where: any = {
  // ... existing role-based filters
}

// Add search filter
if (search) {
  where.OR = [
    { note: { contains: search, mode: 'insensitive' } },
    { customName: { contains: search, mode: 'insensitive' } },
    { horse: { name: { contains: search, mode: 'insensitive' } } },
  ]
}

// Add other filters
if (category) where.category = category
// ... etc

// Get paginated results
const [expenses, total] = await Promise.all([
  prisma.expense.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { date: 'desc' },
    // ... includes
  }),
  prisma.expense.count({ where }),
])

return NextResponse.json({
  expenses,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  },
})
```

```typescript
// Frontend: expenses/page.tsx
const [page, setPage] = useState(1)
const [allExpenses, setAllExpenses] = useState<Expense[]>([])
const [hasMore, setHasMore] = useState(true)

const fetchExpenses = async (pageNum: number, search: string, filters: any) => {
  const params = new URLSearchParams({
    page: pageNum.toString(),
    limit: '50',
    ...(search && { search }),
    ...(filters.category && { category: filters.category }),
    // ... other filters
  })
  
  const response = await fetch(`/api/expenses?${params}`)
  const data = await response.json()
  
  if (pageNum === 1) {
    setAllExpenses(data.expenses) // Replace for first page
  } else {
    setAllExpenses([...allExpenses, ...data.expenses]) // Append for next pages
  }
  
  setHasMore(data.pagination.hasMore)
}

// Search handler
const handleSearch = debounce((query: string) => {
  setSearchQuery(query)
  setPage(1)
  fetchExpenses(1, query, currentFilters)
}, 500)

// Infinite scroll
useEffect(() => {
  const handleScroll = () => {
    if (isNearBottom && hasMore && !isLoading) {
      setPage(p => {
        fetchExpenses(p + 1, searchQuery, currentFilters)
        return p + 1
      })
    }
  }
  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [hasMore, isLoading, searchQuery])
```

