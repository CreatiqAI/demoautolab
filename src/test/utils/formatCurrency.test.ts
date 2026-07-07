import { describe, it, expect } from 'vitest'

// Mock the formatCurrency function from Orders.tsx
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR'
  }).format(amount)
}

// Intl inserts a non-breaking (U+00A0) or narrow no-break (U+202F) space
// between the currency symbol and the amount; the exact character varies by
// ICU version. Normalise to a regular space so assertions stay stable.
const fmt = (amount: number) => formatCurrency(amount).replace(/[\u00A0\u202F]/g, ' ')

describe('formatCurrency', () => {
  it('should format positive amounts correctly', () => {
    expect(fmt(100)).toBe('RM 100.00')
    expect(fmt(1234.56)).toBe('RM 1,234.56')
  })

  it('should format zero correctly', () => {
    expect(fmt(0)).toBe('RM 0.00')
  })

  it('should format decimal amounts correctly', () => {
    expect(fmt(715.50)).toBe('RM 715.50')
    expect(fmt(99.99)).toBe('RM 99.99')
  })

  it('should handle large amounts with proper formatting', () => {
    expect(fmt(1000000)).toBe('RM 1,000,000.00')
    expect(fmt(1234567.89)).toBe('RM 1,234,567.89')
  })
})