import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Header from '../../components/Header'

// Mock the hooks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    signOut: vi.fn(),
  }),
}))

vi.mock('../../hooks/useCartDB', () => ({
  useCart: () => ({
    getTotalItems: () => 0,
  }),
}))

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Header Component', () => {
  it('should render company contact information', () => {
    renderWithRouter(<Header />)
    
    expect(screen.getByText('03-4297 7668')).toBeInTheDocument()
    expect(screen.getByText('Cheras, Kuala Lumpur')).toBeInTheDocument()
  })

  it('should render company logo and name', () => {
    renderWithRouter(<Header />)
    
    expect(screen.getByText('Autolab')).toBeInTheDocument()
    expect(screen.getByText('Car Parts & More')).toBeInTheDocument()
  })

  it('should render free shipping message', () => {
    renderWithRouter(<Header />)
    
    expect(screen.getByText(/Free shipping on orders over RM 200/)).toBeInTheDocument()
  })

  it('should be accessible with proper ARIA labels', () => {
    renderWithRouter(<Header />)
    
    const logo = screen.getByText('Autolab').closest('div')
    expect(logo).toHaveClass('cursor-pointer')
  })
})