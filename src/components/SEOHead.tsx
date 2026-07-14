import { Helmet } from 'react-helmet-async';
import { useSiteSettings, toSchemaOpeningHours } from '@/hooks/useSiteSettings';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noindex?: boolean;
}

const SITE_NAME = '12V';
const SITE_URL = 'https://autolabs.my';

export default function SEOHead({
  title,
  description,
  keywords,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  noindex = false
}: SEOHeadProps) {
  const { settings } = useSiteSettings();

  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const openingHours = toSchemaOpeningHours(settings.office_hours);

  // Contact and address come from Site Settings so the store's structured data,
  // the footer and the invoices can't drift apart.
  const schema = {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    "name": SITE_NAME,
    "legalName": settings.legal_name || undefined,
    "description": settings.description ||
      "Premium car parts and automotive accessories in Malaysia. Located in Cheras, Kuala Lumpur.",
    "url": SITE_URL,
    "telephone": settings.phone || undefined,
    "email": settings.email || undefined,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": settings.address_line1,
      "addressLocality": settings.address_city,
      "addressRegion": settings.address_state,
      "postalCode": settings.address_postcode,
      "addressCountry": "MY"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "3.0738",
      "longitude": "101.7285"
    },
    ...(openingHours.length > 0 && { "openingHours": openingHours }),
    "priceRange": "$$",
    "image": [`${SITE_URL}/12v-icon.png`],
    "sameAs": [settings.facebook_url, settings.instagram_url].filter(Boolean),
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:image" content={ogImage || `${SITE_URL}/og-default.jpg`} />
      <meta property="og:url" content={canonical || SITE_URL} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle || fullTitle} />
      <meta name="twitter:description" content={ogDescription || description} />
      <meta name="twitter:image" content={ogImage || `${SITE_URL}/og-default.jpg`} />

      {/* Local Business Schema */}
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
