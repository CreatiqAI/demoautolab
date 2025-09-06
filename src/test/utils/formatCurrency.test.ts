import { describe, it, expect } from 'vitest'

// Mock the formatCurrency function from Orders.tsx
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR'
  }).format(amount)
}

describe('formatCurrency', () => {
  it('should format positive amounts correctly', () => {
    expect(formatCurrency(100)).toBe('RM 100.00')
    expect(formatCurrency(1234.56)).toBe('RM 1,234.56')
  })

  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toBe('RM 0.00')
  })

  it('should format decimal amounts correctly', () => {
    expect(formatCurrency(715.50)).toBe('RM 715.50')
    expect(formatCurrency(99.99)).toBe('RM 99.99')
  })

  it('should handle large amounts with proper formatting', () => {
    expect(formatCurrency(1000000)).toBe('RM 1,000,000.00')
    expect(formatCurrency(1234567.89)).toBe('RM 1,234,567.89')
  })
})