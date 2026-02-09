import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;
}

const SITE_NAME = "MediCare+";
const DOMAIN = "https://medicareplus.app";
const DEFAULT_OG_IMAGE = `${DOMAIN}/logo-medicare.png`;

export function SEOHead({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  jsonLd,
  noindex = false,
}: SEOHeadProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const fullCanonical = canonicalUrl ? `${DOMAIN}${canonicalUrl}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {fullCanonical && <link rel="canonical" href={fullCanonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      {fullCanonical && <meta property="og:url" content={fullCanonical} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd)}
        </script>
      )}
    </Helmet>
  );
}

// Reusable JSON-LD generators
export const seoSchemas = {
  organization: () => ({
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: "MediCare+",
    alternateName: ["Medicare Plus Software", "MediCare Plus App", "Medicare+ Clinic System", "MediCarePlus"],
    url: "https://medicareplus.app",
    logo: "https://medicareplus.app/logo-medicare.png",
    description: "Smart healthcare appointment management system with AI-powered symptom analysis. Book doctor appointments online, manage clinic operations, and access AI health tools.",
    medicalSpecialty: [
      "GeneralPractice", "Cardiology", "Neurology", "Pediatrics",
      "Ophthalmology", "Orthopedics", "Dentistry"
    ],
    availableService: {
      "@type": "MedicalService",
      name: "Online Doctor Appointment Booking",
      description: "Book appointments with top-rated doctors online. Instant confirmation, digital prescriptions, and health tracking.",
    },
    areaServed: {
      "@type": "Country",
      name: "Pakistan",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["English", "Urdu"],
    },
  }),

  physician: (doctor: {
    name: string;
    specialty: string;
    rating?: number | null;
    reviewCount?: number;
    fee?: number;
    city?: string | null;
    bio?: string | null;
    imageUrl?: string | null;
    profileUrl: string;
  }) => ({
    "@context": "https://schema.org",
    "@type": "Physician",
    name: `Dr. ${doctor.name}`,
    medicalSpecialty: doctor.specialty,
    description: doctor.bio || `Experienced ${doctor.specialty} available for online appointments at MediCare+.`,
    url: `https://medicareplus.app${doctor.profileUrl}`,
    ...(doctor.imageUrl && { image: doctor.imageUrl }),
    ...(doctor.city && {
      address: {
        "@type": "PostalAddress",
        addressLocality: doctor.city,
        addressCountry: "PK",
      },
    }),
    ...(doctor.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: doctor.rating,
        bestRating: 5,
        ratingCount: doctor.reviewCount || 1,
      },
    }),
    ...(doctor.fee && {
      priceRange: `Rs ${doctor.fee}`,
    }),
  }),

  medicalService: (service: { name: string; description: string; url: string }) => ({
    "@context": "https://schema.org",
    "@type": "MedicalService",
    name: service.name,
    description: service.description,
    url: `https://medicareplus.app${service.url}`,
    provider: {
      "@type": "MedicalOrganization",
      name: "MediCare+",
    },
  }),

  breadcrumb: (items: { name: string; url: string }[]) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `https://medicareplus.app${item.url}`,
    })),
  }),
};
