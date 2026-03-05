---
name: write-test
description: Generate unit tests (Vitest + React Testing Library) or E2E tests (Playwright) for components, hooks, or user flows
user-invocable: true
disable-model-invocation: false
---

Write tests for the specified AutoLab component, hook, or feature.

Target to test: $ARGUMENTS

## Determine Test Type

### For Unit/Component Tests (Vitest + React Testing Library)
Place in: `src/test/components/<Name>.test.tsx` or `src/test/utils/<name>.test.ts`

Follow the patterns in:
- `src/test/components/Header.test.tsx` (component with mocked hooks)
- `src/test/utils/formatCurrency.test.ts` (pure utility function)

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ComponentName from '../../components/ComponentName'

// Mock hooks used by the component
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}))

vi.mock('../../hooks/useCartDB', () => ({
  useCart: () => ({
    cartItems: [],
    getTotalItems: () => 0,
    getTotalPrice: () => 0,
  }),
}))

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: {}, error: null })) })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('ComponentName', () => {
  it('should render correctly', () => {
    renderWithRouter(<ComponentName />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle user interactions', async () => {
    renderWithRouter(<ComponentName />)
    fireEvent.click(screen.getByRole('button', { name: /action/i }))
    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument()
    })
  })
})
```

### For E2E Tests (Playwright)
Place in: `src/e2e/<feature-name>.spec.ts`

Follow the pattern in `src/e2e/invoice-generation.spec.ts`:

```tsx
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/page-url')
  })

  test('should display expected content', async ({ page }) => {
    await expect(page.locator('text=Expected Text')).toBeVisible()
  })

  test('should handle user interaction', async ({ page }) => {
    await page.click('[data-testid="button-name"]')
    await expect(page.locator('text=Result')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('text=Expected Text')).toBeVisible()
  })
})
```

## Test Configuration Reference
- Vitest config: `vitest.config.ts` (jsdom environment, globals: true, setup: `src/test/setup.ts`)
- Playwright config: `playwright.config.ts` (baseURL: http://localhost:5173, multi-browser)
- Run unit tests: `npm test`
- Run E2E tests: `npm run test:e2e`

## Important
- Always mock `@/lib/supabase`, `@/hooks/useAuth`, and any other external dependencies
- Use `data-testid` attributes for E2E selectors where possible
- Test loading states, error states, and empty states
- Test accessibility basics (ARIA labels, keyboard navigation)
- For currency, expect MYR format: "RM 1,234.56"
