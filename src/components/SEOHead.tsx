import { Helmet } from 'react-helmet-async';

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
  const siteUrl = 'https://autolabs.my'; // Update with your actual domain
  const fullTitle = title.includes('AUTO LABS') ? title : `${title} | AUTO LABS`;
  
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
      <meta property="og:image" content={ogImage || `${siteUrl}/og-default.jpg`} />
      <meta property="og:url" content={canonical || window.location.href} />
      <meta property="og:site_name" content="AUTO LABS" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle || fullTitle} />
      <meta name="twitter:description" content={ogDescription || description} />
      <meta name="twitter:image" content={ogImage || `${siteUrl}/og-default.jpg`} />
      
      {/* Local Business Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AutoPartsStore",
          "name": "AUTO LABS SDN BHD",
          "description": "Premium car parts and automotive parts in Malaysia. Located in Cheras, Kuala Lumpur.",
          "url": siteUrl,
          "telephone": "03-4297 7668",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "17, Jalan 7/95B, Cheras Utama",
            "addressLocality": "Cheras",
            "addressRegion": "Wilayah Persekutuan",
            "postalCode": "56100",
            "addressCountry": "MY"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": "3.0738",  // Update with actual coordinates
            "longitude": "101.7285" // Update with actual coordinates
          },
          "openingHours": "Mo-Sa 09:00-18:00",
          "priceRange": "$$",
          "image": [`${siteUrl}/shop-front.jpg`],
          "serviceArea": {
            "@type": "GeoCircle",
            "geoMidpoint": {
              "@type": "GeoCoordinates",
              "latitude": "3.0738",
              "longitude": "101.7285"
            },
            "geoRadius": "50000" // 50km radius
          }
        })}
      </script>
    </Helmet>
  );
}