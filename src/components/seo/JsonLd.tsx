'use client';

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  email?: string;
}

export function OrganizationSchema({
  name = 'Consignatarias.com.ar',
  url = 'https://www.consignatarias.com.ar',
  logo = 'https://www.consignatarias.com.ar/logo.png',
  description = 'Plataforma de inteligencia del mercado ganadero argentino. Calendario unificado de remates, directorio de frigoríficos y precios INMAG.',
  email = 'agro@memola.com.ar',
}: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo: {
      '@type': 'ImageObject',
      url: logo,
      width: 512,
      height: 512,
    },
    description,
    email,
    foundingDate: '2024',
    founder: {
      '@type': 'Person',
      name: 'José Barnetche',
    },
    parentOrganization: {
      '@type': 'Organization',
      name: 'Memola Medios S.A.S.',
      url: 'https://memola.com.ar',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Argentina',
    },
    sameAs: [
      'https://twitter.com/consignatarias',
      'https://www.linkedin.com/company/memola-medios',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email,
      availableLanguage: ['Spanish'],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface WebSiteSchemaProps {
  url?: string;
  name?: string;
}

export function WebSiteSchema({
  url = 'https://www.consignatarias.com.ar',
  name = 'Consignatarias.com.ar',
}: WebSiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url,
    name,
    description: 'Calendario unificado de remates ganaderos argentinos',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/remates?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface DatasetSchemaProps {
  name: string;
  description: string;
  url: string;
  keywords?: string[];
  dateModified?: string;
  creator?: string;
}

export function DatasetSchema({
  name,
  description,
  url,
  keywords = [],
  dateModified = new Date().toISOString().slice(0, 10),
  creator = 'Memola Medios SAS',
}: DatasetSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url,
    keywords: keywords.join(', '),
    dateModified,
    creator: {
      '@type': 'Organization',
      name: creator,
    },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    spatialCoverage: {
      '@type': 'Place',
      name: 'Argentina',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface EventSchemaProps {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address: string;
  };
  organizer?: string;
  url?: string;
  eventAttendanceMode?: 'offline' | 'online' | 'mixed';
}

export function EventSchema({
  name,
  description,
  startDate,
  endDate,
  location,
  organizer,
  url,
  eventAttendanceMode = 'offline',
}: EventSchemaProps) {
  const attendanceModeMap = {
    offline: 'https://schema.org/OfflineEventAttendanceMode',
    online: 'https://schema.org/OnlineEventAttendanceMode',
    mixed: 'https://schema.org/MixedEventAttendanceMode',
  };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    description,
    startDate,
    endDate: endDate || startDate,
    eventAttendanceMode: attendanceModeMap[eventAttendanceMode],
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      // Place.name requerido: si la firma no cargó ciudad, caemos a la dirección
      // (que ya incluye provincia/país) o a 'Argentina'. Nunca vacío.
      name: location.name?.trim() || location.address?.trim() || 'Argentina',
      address: {
        '@type': 'PostalAddress',
        addressLocality: location.address,
        addressCountry: 'AR',
      },
    },
    organizer: organizer
      ? {
          '@type': 'Organization',
          name: organizer,
        }
      : undefined,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface LocalBusinessSchemaProps {
  name: string;
  description?: string;
  address: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion: string;
  };
  telephone?: string;
  url?: string;
}

export function LocalBusinessSchema({
  name,
  description,
  address,
  telephone,
  url,
}: LocalBusinessSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    name,
    description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.streetAddress,
      addressLocality: address.addressLocality,
      addressRegion: address.addressRegion,
      addressCountry: 'AR',
    },
    telephone,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Breadcrumb Schema
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// FAQ Page Schema
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQPageSchema({ items }: { items: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// DefinedTermSet — the glossary as a machine-readable set of citable entities.
// Each term becomes a schema.org DefinedTerm with a stable @id (URL#term) so AI
// answer engines and search can resolve "qué es X" to a canonical definition here.
export interface DefinedTermItem {
  name: string;
  description: string;
  url?: string; // optional canonical page for the term (e.g. INMAG → /mercado/inmag)
}

export function DefinedTermSetSchema({
  name,
  description,
  url,
  terms,
}: {
  name: string;
  description: string;
  url: string;
  terms: DefinedTermItem[];
}) {
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': `${url}#set`,
    name,
    description,
    url,
    hasDefinedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm',
      '@id': `${url}#${slugify(t.name)}`,
      name: t.name,
      description: t.description,
      inDefinedTermSet: `${url}#set`,
      ...(t.url ? { url: t.url } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Section Breadcrumb Schema — reusable for top-level section pages
export function SectionBreadcrumbSchema({ section, sectionName }: { section: string; sectionName: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: 'https://www.consignatarias.com.ar',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: sectionName,
        item: `https://www.consignatarias.com.ar/${section}`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Consignataria Profile Schema — for individual /consignatarias/[slug] pages
interface ConsignatariaProfileSchemaProps {
  name: string;
  slug: string;
  provincia: string;
  localidad?: string;
  totalRemates: number;
  isPro?: boolean;
  description?: string;
  telephone?: string;
  email?: string;
}

export function ConsignatariaProfileSchema({
  name,
  slug,
  provincia,
  localidad,
  totalRemates,
  isPro = false,
  description,
  telephone,
  email,
}: ConsignatariaProfileSchemaProps) {
  const url = `https://www.consignatarias.com.ar/consignatarias/${slug}`;
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    name,
    description: description || `${name} - Consignataria de hacienda en ${localidad || provincia}, Argentina. ${totalRemates} remates publicados.`,
    url,
    address: {
      '@type': 'PostalAddress',
      addressLocality: localidad || provincia,
      addressRegion: provincia,
      addressCountry: 'AR',
    },
    ...(telephone && { telephone }),
    ...(email && { email }),
    // B2B service schema
    makesOffer: {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Remates Ganaderos',
        description: `Servicios de consignación y remate de hacienda en ${provincia}`,
        provider: {
          '@type': 'Organization',
          name,
        },
      },
    },
    // Industry classification
    additionalType: 'https://www.wikidata.org/wiki/Q728937', // Livestock auction
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// VideoObject Schema for live-streamed auctions
interface VideoObjectSchemaProps {
  name: string;
  description: string;
  thumbnailUrl?: string;
  uploadDate: string;
  contentUrl?: string;
  embedUrl?: string;
  duration?: string; // ISO 8601 format: PT2H for 2 hours
  publisher?: string;
  isLive?: boolean;
}

export function VideoObjectSchema({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  contentUrl,
  embedUrl,
  duration = 'PT2H', // Default 2 hours for livestock auctions
  publisher,
  isLive = false,
}: VideoObjectSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name,
    description,
    thumbnailUrl: thumbnailUrl || 'https://www.consignatarias.com.ar/og.png',
    uploadDate,
    duration,
    contentUrl,
    embedUrl,
    publication: isLive ? {
      '@type': 'BroadcastEvent',
      isLiveBroadcast: true,
      startDate: uploadDate,
    } : undefined,
    publisher: publisher ? {
      '@type': 'Organization',
      name: publisher,
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.consignatarias.com.ar/logo.png',
      },
    } : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ItemList Schema for remates listing (helps Google understand it's a list of events)
interface RemateListItem {
  id: string | number;
  name: string;
  date: string;
  time?: string;
  location: string;
  province: string;
  consignatariaName: string;
  type: string;
  estimatedHeads?: number;
  url?: string;
}

export function RematesListSchema({ remates }: { remates: RemateListItem[] }) {
  // Only include first 10 remates to keep schema size reasonable
  const topRemates = remates.slice(0, 10);
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Próximos Remates Ganaderos en Argentina',
    description: `Calendario de ${remates.length} remates ganaderos programados`,
    numberOfItems: remates.length,
    itemListElement: topRemates.map((remate, index) => {
      const startDateTime = remate.time
        ? `${remate.date}T${remate.time}:00`
        : `${remate.date}T10:00:00`;

      // Place.name es requerido por schema.org. Muchas firmas no cargan `location`
      // (solo la provincia) → sin fallback, JSON.stringify dropea el campo y GSC
      // avisa "Falta el campo name (en location)". Fallback para el NOMBRE: ciudad →
      // provincia → país. Para la localidad NO inventamos "Argentina" (no es una
      // localidad): se omite si no hay ciudad/provincia real.
      const cityOrProvince = remate.location?.trim() || remate.province?.trim() || undefined;
      const placeName = cityOrProvince || 'Argentina';

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Event',
          name: `Remate ${remate.type} - ${remate.consignatariaName}`,
          description: `Remate de ${remate.type} organizado por ${remate.consignatariaName}${remate.estimatedHeads ? ` (~${remate.estimatedHeads} cabezas)` : ''}`,
          startDate: startDateTime,
          eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
          eventStatus: 'https://schema.org/EventScheduled',
          location: {
            '@type': 'Place',
            name: placeName,
            address: {
              '@type': 'PostalAddress',
              addressLocality: cityOrProvince,
              addressRegion: remate.province?.trim() || undefined,
              addressCountry: 'AR',
            },
          },
          organizer: {
            '@type': 'Organization',
            name: remate.consignatariaName,
          },
          url: remate.url || `https://www.consignatarias.com.ar/remates`,
        },
      };
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// SaaS Product/Pricing Schema for /planes page
interface PricingPlan {
  name: string;
  description: string;
  price: number;
  currency?: string;
  billingPeriod?: string;
  features: string[];
}

export function SaaSPricingSchema({ plans }: { plans: PricingPlan[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://www.consignatarias.com.ar/planes',
    name: 'Planes y Precios - Consignatarias.com.ar',
    description: 'Planes de suscripción para consignatarias y frigoríficos argentinos',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: plans.map((plan, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: `Plan ${plan.name}`,
          description: plan.description,
          brand: {
            '@type': 'Organization',
            name: 'Consignatarias.com.ar',
          },
          offers: {
            '@type': 'Offer',
            price: plan.price,
            priceCurrency: plan.currency || 'ARS',
            priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            availability: 'https://schema.org/InStock',
            url: 'https://www.consignatarias.com.ar/planes',
          },
        },
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Speakable Schema for voice search optimization (Google Assistant, etc.)
interface SpeakableSchemaProps {
  url: string;
  headline: string;
  cssSelectors?: string[];
}

export function SpeakableSchema({
  url,
  headline,
  cssSelectors = ['h1', '.speakable-content'],
}: SpeakableSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': url,
    name: headline,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: cssSelectors,
    },
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// HowTo Schema for instructional content
interface HowToStep {
  name: string;
  text: string;
  url?: string;
  image?: string;
}

export function HowToSchema({
  name,
  description,
  steps,
  totalTime,
}: {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    ...(totalTime && { totalTime }),
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.url && { url: step.url }),
      ...(step.image && { image: step.image }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// TechArticle Schema for technical documentation (API docs, developer guides)
interface TechArticleSchemaProps {
  name: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  proficiencyLevel?: 'Beginner' | 'Expert';
  /** Named author (editorial byline). Falls back to the org author. */
  authorName?: string;
  /** Sources the content is based on — signals provenance to AI answer engines. */
  citations?: { name: string; url?: string }[];
}

export function TechArticleSchema({
  name,
  description,
  url,
  datePublished = '2024-01-01',
  dateModified = new Date().toISOString().split('T')[0],
  proficiencyLevel = 'Beginner',
  authorName,
  citations,
}: TechArticleSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: name,
    description,
    url,
    datePublished,
    dateModified,
    proficiencyLevel,
    inLanguage: 'es-AR',
    author: authorName
      ? {
          '@type': 'Person',
          name: authorName,
          worksFor: { '@type': 'Organization', name: 'Consignatarias.com.ar' },
        }
      : {
          '@type': 'Organization',
          name: 'Consignatarias.com.ar',
          url: 'https://www.consignatarias.com.ar',
        },
    publisher: {
      '@type': 'Organization',
      name: 'Memola Medios S.A.S.',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.consignatarias.com.ar/logo.png',
      },
    },
    ...(citations && citations.length
      ? {
          citation: citations.map((c) => ({
            '@type': 'CreativeWork',
            name: c.name,
            ...(c.url ? { url: c.url } : {}),
          })),
        }
      : {}),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// WebApplication Schema for interactive tools (calculators, comparators)
interface WebApplicationSchemaProps {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  features?: string[];
}

export function WebApplicationSchema({
  name,
  description,
  url,
  applicationCategory = 'UtilityApplication',
  features = [],
}: WebApplicationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url,
    applicationCategory,
    operatingSystem: 'Web browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'ARS',
    },
    ...(features.length > 0 && {
      featureList: features.join(', '),
    }),
    provider: {
      '@type': 'Organization',
      name: 'Consignatarias.com.ar',
      url: 'https://www.consignatarias.com.ar',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
