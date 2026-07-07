import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Header from '@/components/Header'

// --- Navigation ---------------------------------------------------------
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

// --- Hooks --------------------------------------------------------------
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}))

vi.mock('@/hooks/useCartDB', () => ({
  useCart: () => ({ getTotalItems: () => 0, cartItems: [] }),
}))

// --- Supabase (mega-menu fetch) ----------------------------------------
// Header fetches categories + brands on mount; return empty results so the
// component mounts without hitting the network.
vi.mock('@/lib/supabase', () => {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    not: () => chain,
    limit: () => Promise.resolve({ data: [], error: null }),
  }
  return {
    supabase: {
      from: () => chain,
      rpc: () => Promise.resolve({ data: [], error: null }),
    },
  }
})

// --- Heavy children stubbed to keep this a Header unit test -------------
vi.mock('@/components/CartDrawer', () => ({ default: () => null }))
vi.mock('@/components/ProfileModal', () => ({ default: () => null }))

const renderHeader = () =>
  render(
    <BrowserRouter>
      <Header />
    </BrowserRouter>
  )

describe('Header', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders the 12V logo and Auto Lab attribution', () => {
    renderHeader()
    expect(screen.getByAltText('12V')).toBeInTheDocument()
    expect(screen.getByText('by Auto Lab')).toBeInTheDocument()
  })

  it('renders the primary navigation links', () => {
    renderHeader()
    // Labels appear in both the desktop nav and the mobile menu.
    expect(screen.getAllByText('Catalog').length).toBeGreaterThan(0)
    expect(screen.getAllByText('New Arrivals').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Find Shops').length).toBeGreaterThan(0)
    expect(screen.getAllByText('About Us').length).toBeGreaterThan(0)
  })

  it('shows a Login action when the user is signed out', () => {
    renderHeader()
    expect(screen.getAllByText('Login').length).toBeGreaterThan(0)
  })

  it('navigates home when the logo is clicked', () => {
    renderHeader()
    fireEvent.click(screen.getByAltText('12V'))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('renders the logo inside a clickable container', () => {
    renderHeader()
    const logoContainer = screen.getByAltText('12V').closest('div')
    expect(logoContainer).toHaveClass('cursor-pointer')
  })
})
