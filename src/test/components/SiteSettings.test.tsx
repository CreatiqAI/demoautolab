import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Footer from '@/components/Footer'
import { LegalDocument } from '@/components/LegalDocument'
import { toSchemaOpeningHours } from '@/hooks/useSiteSettings'
import type { SiteSettings } from '@/hooks/useSiteSettings'

// Footer and the legal pages read everything from site_settings. Stub the hook so
// these assert on the rendering, not on the network.
const settings: SiteSettings = {
  trading_name: 'Auto Lab',
  legal_name: 'Auto Lab Ebiz Sdn Bhd',
  description: '',
  phone: '+6014-309 8767',
  whatsapp: '+6014-309 8767',
  email: 'autolabebiz@gmail.com',
  address_line1: '17, Jalan 7/95B, Cheras Utama',
  address_city: 'Cheras',
  address_state: 'Wilayah Persekutuan Kuala Lumpur',
  address_postcode: '56100',
  office_hours: [
    { days: 'Monday – Friday', open: '9:30am', close: '6:00pm' },
    { days: 'Sunday', open: null, close: null },
  ],
  facebook_url: '',
  instagram_url: 'https://instagram.com/autolab',
  privacy_policy: '',
  terms_conditions: '',
  return_window_days: 7,
  free_return_shipping: true,
  return_policy_intro: '',
  updated_at: '2026-07-14T00:00:00Z',
}

vi.mock('@/hooks/useSiteSettings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useSiteSettings')>()
  return { ...actual, useSiteSettings: () => ({ settings, isLoading: false, error: null }) }
})

vi.mock('@/components/Header', () => ({ default: () => <header /> }))

const renderFooter = () =>
  render(
    <BrowserRouter>
      <Footer />
    </BrowserRouter>,
  )

describe('Footer', () => {
  it('shows the contact details from site settings', () => {
    renderFooter()
    expect(screen.getByText('+6014-309 8767')).toBeInTheDocument()
    expect(screen.getByText('autolabebiz@gmail.com')).toBeInTheDocument()
  })

  it('makes the phone number dialable and strips formatting', () => {
    renderFooter()
    expect(screen.getByText('+6014-309 8767').closest('a')).toHaveAttribute(
      'href',
      'tel:+60143098767',
    )
  })

  it('renders opening hours, and marks a day with no times as closed', () => {
    renderFooter()
    expect(screen.getByText('Monday – Friday: 9:30am - 6:00pm')).toBeInTheDocument()
    expect(screen.getByText('Sunday: Closed')).toBeInTheDocument()
  })

  it('hides social links that have no URL set', () => {
    renderFooter()
    expect(screen.queryByText('Facebook')).not.toBeInTheDocument()
    expect(screen.getByText('Instagram')).toBeInTheDocument()
  })

  it('links to the legal pages', () => {
    renderFooter()
    expect(screen.getByText('Privacy Policy').closest('a')).toHaveAttribute('href', '/privacy')
    expect(screen.getByText('Terms of Service').closest('a')).toHaveAttribute('href', '/terms')
  })
})

describe('LegalDocument', () => {
  const body = [
    'An opening paragraph.',
    '## Section One',
    'Body text under the first heading.',
    '- first item\n- second item',
  ].join('\n\n')

  const renderDoc = (props = {}) =>
    render(
      <BrowserRouter>
        <LegalDocument title="Privacy Policy" body={body} {...props} />
      </BrowserRouter>,
    )

  it('turns "## " lines into headings', () => {
    renderDoc()
    expect(screen.getByRole('heading', { level: 2, name: 'Section One' })).toBeInTheDocument()
  })

  it('renders paragraphs and bullet lists', () => {
    renderDoc()
    expect(screen.getByText('An opening paragraph.')).toBeInTheDocument()
    expect(screen.getByText('first item')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('tells the reader when the page has no content yet', () => {
    render(
      <BrowserRouter>
        <LegalDocument title="Terms" body="   " />
      </BrowserRouter>,
    )
    expect(screen.getByText(/hasn't been published yet/i)).toBeInTheDocument()
  })
})

// This feeds schema.org structured data. Wrong hours are worse than no hours,
// so anything ambiguous must be dropped rather than guessed at.
describe('toSchemaOpeningHours', () => {
  it('converts a day range and 12-hour times', () => {
    expect(
      toSchemaOpeningHours([{ days: 'Monday – Friday', open: '9:30am', close: '6:00pm' }]),
    ).toEqual(['Mo-Fr 09:30-18:00'])
  })

  it('handles a single day', () => {
    expect(
      toSchemaOpeningHours([{ days: 'Saturday', open: '9:30am', close: '1:30pm' }]),
    ).toEqual(['Sa 09:30-13:30'])
  })

  it('drops closed days', () => {
    expect(toSchemaOpeningHours([{ days: 'Sunday', open: null, close: null }])).toEqual([])
  })

  it('drops rows it cannot parse rather than emitting a guess', () => {
    expect(
      toSchemaOpeningHours([
        { days: 'By appointment', open: 'whenever', close: 'late' },
        { days: 'Monday', open: 'noon-ish', close: '6pm' },
      ]),
    ).toEqual([])
  })

  it('gets midnight and midday right', () => {
    expect(toSchemaOpeningHours([{ days: 'Monday', open: '12:00am', close: '12:00pm' }])).toEqual([
      'Mo 00:00-12:00',
    ])
  })
})
