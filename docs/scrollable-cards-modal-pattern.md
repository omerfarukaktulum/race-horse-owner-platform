# Scrollable Cards in Modal Pattern

This document describes the pattern for creating scrollable card layouts in modals, particularly for mobile views. This pattern ensures cards are properly contained within the modal and scrollable when content exceeds the available height.

## Structure

The key is to use a nested flex container structure that properly constrains width and enables vertical scrolling:

```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="w-full max-w-7xl max-h-[90vh] p-0 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl overflow-hidden flex flex-col">
    <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
      {/* Header content */}
    </DialogHeader>
    
    <div className="flex-1 overflow-hidden flex flex-col min-w-0 w-full">
      <div className="flex flex-col w-full">
        {/* Mobile: Card Layout */}
        <div className="md:hidden mb-4 flex justify-center w-full px-6">
          <div className="w-full">
            <div 
              className="overflow-y-auto overflow-x-hidden px-2 py-2"
              style={{ maxHeight: '500px' }}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-indigo-50/30 border-0 p-4 mb-3 rounded-lg w-full box-border"
                  style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 -10px 15px -3px rgba(0, 0, 0, 0.1), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                >
                  {/* Card content */}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop: Table Layout */}
        <div className="hidden md:flex flex-1 flex-col min-h-0 w-full">
          {/* Desktop table content */}
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

## Key Components

### 1. DialogContent Container
```tsx
className="w-full max-w-7xl max-h-[90vh] p-0 ... overflow-hidden flex flex-col"
```
- `flex flex-col`: Creates a vertical flex container
- `overflow-hidden`: Prevents content from overflowing the modal
- `max-h-[90vh]`: Limits modal height to 90% of viewport

### 2. Main Content Container
```tsx
className="flex-1 overflow-hidden flex flex-col min-w-0 w-full"
```
- `flex-1`: Takes up remaining space after header
- `overflow-hidden`: Prevents overflow
- `min-w-0`: Critical for preventing flex items from overflowing
- `flex flex-col`: Maintains vertical layout

### 3. Wrapper Container
```tsx
className="flex flex-col w-full"
```
- Wraps both mobile and desktop layouts
- Ensures proper vertical stacking

### 4. Mobile Card Container
```tsx
className="md:hidden mb-4 flex justify-center w-full px-6"
```
- `md:hidden`: Only visible on mobile
- `flex justify-center`: Centers the content
- `w-full px-6`: Full width with horizontal padding

### 5. Inner Wrapper
```tsx
className="w-full"
```
- Simple full-width container
- No additional constraints needed

### 6. Scrollable Container
```tsx
className="overflow-y-auto overflow-x-hidden px-2 py-2"
style={{ maxHeight: '500px' }}
```
- `overflow-y-auto`: Enables vertical scrolling
- `overflow-x-hidden`: Prevents horizontal scrolling
- `maxHeight: '500px'`: Limits height, triggers scrolling when exceeded
- `px-2 py-2`: Internal padding for cards

### 7. Card Styling
```tsx
className="bg-indigo-50/30 border-0 p-4 mb-3 rounded-lg w-full box-border"
```
- `w-full`: Full width of container
- `box-border`: Ensures padding is included in width calculation
- `mb-3`: Margin between cards

## Important Notes

1. **Never use `flex justify-center` on the scrollable container** - This creates a flex row context that can cause horizontal overflow. Use it only on the outer container.

2. **Always include `min-w-0`** on flex containers to prevent overflow issues.

3. **Use `box-border`** on cards to ensure proper width calculation.

4. **The structure must be:**
   - Outer: `flex justify-center` (for centering)
   - Middle: `w-full` (for width constraint)
   - Inner: Scrollable container with `overflow-y-auto`

5. **Height calculation:** Use a fixed `maxHeight` (e.g., `500px`) or calculate based on viewport: `calc(90vh - 300px)` depending on header size.

## Common Pitfalls

❌ **Don't:** Use `flex justify-center` on the scrollable container
```tsx
<div className="overflow-y-auto flex justify-center">  // Wrong!
```

✅ **Do:** Use `flex justify-center` on the outer container only
```tsx
<div className="flex justify-center">
  <div className="w-full">
    <div className="overflow-y-auto">  // Correct!
```

❌ **Don't:** Skip the `w-full` wrapper
```tsx
<div className="flex justify-center">
  <div className="overflow-y-auto">  // Missing w-full wrapper
```

✅ **Do:** Include the `w-full` wrapper
```tsx
<div className="flex justify-center">
  <div className="w-full">
    <div className="overflow-y-auto">  // Correct structure
```

## Example: Complete Implementation

See `app/components/horse-detail/RaceHistoryTable.tsx` (RaceGallopsModal) and `app/components/modals/show-training-plans-modal.tsx` for complete working examples.

## Testing Checklist

- [ ] Cards appear below the modal title (not to the right)
- [ ] Cards are properly contained within modal bounds
- [ ] Vertical scrolling works when content exceeds maxHeight
- [ ] No horizontal overflow or scrolling
- [ ] Cards are centered on mobile
- [ ] Desktop layout (table) works correctly
- [ ] Empty state displays correctly

