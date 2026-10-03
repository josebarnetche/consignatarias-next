import { jsonLd } from '@/lib/seo/json-ld'
import { consignatariaProfilePath } from '@/lib/data/consignataria-slugs'
import {
  SITE,
  ORG_ID,
  ORG_REF,
  WEBSITE_ID,
  MARCA,
  RAZON_SOCIAL,
  buildBreadcrumbList,
  buildDataset,
  buildRemateEvent,
  buildRematesItemList,
  buildRemateVideo,
  finDelAnioSiguiente,
  type BreadcrumbNodo,
  type DatasetInput,
  type RemateEventInput,
  type RemateEventOpts,
} from '@/lib/seo/schemas'

// Server components: ninguno usa hooks ni estado. Sin 'use client' el JSON-LD sale
// una sola vez en el HTML (con 'use client' los props viajaban además en el payload
// RSC: cada FAQ, cada remate, dos veces). La lógica de cada schema vive en
// src/lib/seo/schemas.ts, que es lo que se testea.

function Ld({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
}

interface OrganizationSchemaProps {
  url?: string;
  logo?: string;
  description?: string;
  email?: string;
}

/**
 * LA Organization del sitio, con `@id` estable (`/#org`). La emite solo el layout
 * raíz; el resto de los schemas la referencian con `{ '@id': ORG_ID }` en
 * publisher/author/creator en vez de repetirla con un nombre distinto cada vez.
 * Marca: "consignatarias.com.ar". Razón social: legalName.
 */
export function OrganizationSchema({
  url = SITE,
  logo = `${SITE}/logo.png`,
  description = 'Plataforma de inteligencia del mercado ganadero argentino. Calendario unificado de remates, directorio de frigoríficos y precios INMAG.',
  email = 'agro@memola.com.ar',
}: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: MARCA,
    legalName: RAZON_SOCIAL,
    taxID: '30-71863222-2',
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
    areaServed: {
      '@type': 'Country',
      name: 'Argentina',
    },
    sameAs: [
      'https://twitter.com/consignatarias',
      'https://www.linkedin.com/company/memola-medios',
    ],
    // Señal de autoridad de entidad para el knowledge-graph / motores de IA: sobre
    // QUÉ es autoridad este sitio. Linkea a los entes de Wikidata para que la IA
    // reconozca la entidad, no solo el string. Refuerza la citación en GEO/AEO.
    knowsAbout: [
      { '@type': 'DefinedTerm', name: 'INMAG', alternateName: 'Índice Novillo Mercado Agroganadero', url: `${SITE}/mercado/inmag` },
      { '@type': 'DefinedTerm', name: 'Índice Novillo Arrendamiento', url: `${SITE}/mercado/arrendamiento` },
      { '@type': 'Thing', name: 'Precio del novillo en Argentina' },
      { '@type': 'Thing', name: 'Mercado Agroganadero de Cañuelas' },
      { '@type': 'Thing', name: 'Arrendamiento rural en Argentina' },
      { '@type': 'Thing', name: 'Consignataria de hacienda' },
      { '@type': 'Thing', name: 'Mercado ganadero bovino argentino' },
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email,
      availableLanguage: ['Spanish'],
    },
  };

  return <Ld data={schema} />;
}

interface WebSiteSchemaProps {
  url?: string;
  name?: string;
}

export function WebSiteSchema({
  url = SITE,
  name = MARCA,
}: WebSiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url,
    name,
    description: 'Calendario unificado de remates ganaderos argentinos',
    publisher: ORG_REF,
    inLanguage: 'es-AR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/remates?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return <Ld data={schema} />;
}

/**
 * Dataset. `license` es OBLIGATORIA (antes todos heredaban CC-BY, que contradecía
 * /licencia-datos):
 * - compilación o índice propio → LICENCIA_PROPIA;
 * - publicado declaradamente abierto (/valor-tierra.json) → LICENCIA_CC_BY;
 * - serie ajena (INMAG, MAG) → `null` + `fuente={FUENTE_MAG}`: se cita, no se licencia.
 *
 * Campos que lo hacen citable: variableMeasured (con unitText), temporalCoverage,
 * distribution. `dateModified` es la fecha REAL del dato; sin ella se omite.
 */
type DatasetSchemaProps = DatasetInput & {
  variableMeasured?: DatasetInput['variableMeasured'];
  temporalCoverage?: DatasetInput['temporalCoverage'];
  distribution?: DatasetInput['distribution'];
};

export function DatasetSchema(props: DatasetSchemaProps) {
  return <Ld data={buildDataset(props)} />;
}

/**
 * Event de un remate. Toda la regla (URL única de la ficha, -03:00, endDate con
 * aritmética de fecha, dirección sin campos vacíos, modo mixto con VirtualLocation
 * cuando hay transmisión) vive en buildRemateEvent.
 */
export function EventSchema({ remate, ...opts }: { remate: RemateEventInput } & RemateEventOpts) {
  const organizerUrl = opts.organizerUrl ?? `${SITE}${consignatariaProfilePath(remate.consignatariaSlug)}`;
  return <Ld data={{ '@context': 'https://schema.org', ...buildRemateEvent(remate, { ...opts, organizerUrl }) }} />;
}

interface LocalBusinessSchemaProps {
  name: string;
  description?: string;
  address: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
  };
  telephone?: string;
  url?: string;
  image?: string;
  logo?: string;
  /** Sitio propio, redes: solo URLs http(s); el resto se descarta. */
  sameAs?: Array<string | null | undefined>;
  areaServed?: string;
  cuit?: string; // se emite como identifier PropertyValue (señal de autoridad de entidad)
}

const esHttpUrl = (u: string | null | undefined): u is string => !!u && /^https?:\/\/[^\s]+$/i.test(u.trim());

export function LocalBusinessSchema({
  name,
  description,
  address,
  telephone,
  url,
  image,
  logo,
  sameAs,
  areaServed,
  cuit,
}: LocalBusinessSchemaProps) {
  const links = (sameAs ?? []).filter(esHttpUrl).map((u) => u.trim());
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    name,
    description,
    ...(image || logo ? { image: image || logo } : {}),
    ...(logo ? { logo } : {}),
    // Sin campos vacíos: un addressLocality "" es peor que no declararlo.
    address: {
      '@type': 'PostalAddress',
      ...(address.streetAddress?.trim() ? { streetAddress: address.streetAddress.trim() } : {}),
      ...(address.addressLocality?.trim() ? { addressLocality: address.addressLocality.trim() } : {}),
      ...(address.addressRegion?.trim() ? { addressRegion: address.addressRegion.trim() } : {}),
      addressCountry: 'AR',
    },
    ...(areaServed ? { areaServed: { '@type': 'AdministrativeArea', name: areaServed } } : {}),
    ...(cuit ? { identifier: { '@type': 'PropertyValue', propertyID: 'CUIT', value: cuit } } : {}),
    ...(telephone?.trim() ? { telephone: telephone.trim() } : {}),
    ...(links.length ? { sameAs: links } : {}),
    url,
  };

  return <Ld data={schema} />;
}

/**
 * BreadcrumbList. El último nivel (la página actual) puede ir sin `url`: Google lo
 * acepta, y es mejor que repetir la home.
 */
export function BreadcrumbSchema({ items }: { items: BreadcrumbNodo[] }) {
  return <Ld data={buildBreadcrumbList(items)} />;
}

// FAQ Page Schema — SIEMPRE junto con <FaqList items={...} /> (mismo array): el
// markup tiene que describir preguntas que el usuario ve.
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

  return <Ld data={schema} />;
}

// (QAPageSchema se eliminó: QAPage es para foros con respuestas de usuarios, y acá
// se armaba a mano con upvoteCount/answerCount fijos. Esas páginas usan FAQPageSchema.)

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

  return <Ld data={schema} />;
}

/**
 * Breadcrumb de sección: Inicio → sección. En una página que NO es la sección
 * (una guía que cuelga de /campos, /mercado/arrendamiento/liniers, …) pasá
 * `pageName` + `pagePath`: agrega el nivel de la propia página. Sin eso, la ruta
 * terminaba en la sección padre como si la página fuera esa sección.
 */
export function SectionBreadcrumbSchema({
  section,
  sectionName,
  pageName,
  pagePath,
}: {
  section: string;
  sectionName: string;
  pageName?: string;
  /** Ruta de la página (`/como-vender-un-campo`), o URL absoluta. */
  pagePath?: string;
}) {
  const items: BreadcrumbNodo[] = [
    { name: 'Inicio', url: SITE },
    { name: sectionName, url: `${SITE}/${section}` },
  ];
  if (pageName) {
    items.push({
      name: pageName,
      url: pagePath ? (pagePath.startsWith('http') ? pagePath : `${SITE}${pagePath}`) : null,
    });
  }
  return <Ld data={buildBreadcrumbList(items)} />;
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
  description,
  telephone,
  email,
}: ConsignatariaProfileSchemaProps) {
  const url = `${SITE}/consignatarias/${slug}`;
  const ciudad = (localidad || '').split(',')[0].trim();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    name,
    description: description || `${name} - Consignataria de hacienda en ${ciudad || provincia}, Argentina. ${totalRemates} remates publicados.`,
    url,
    address: {
      '@type': 'PostalAddress',
      ...(ciudad ? { addressLocality: ciudad } : {}),
      ...(provincia && provincia !== 'Argentina' ? { addressRegion: provincia } : {}),
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
        provider: { '@id': url },
      },
    },
    // Industry classification
    additionalType: 'https://www.wikidata.org/wiki/Q728937', // Livestock auction
  };

  return <Ld data={schema} />;
}

/**
 * VideoObject de la transmisión de un remate (YouTube). Sin ID de video real no se
 * emite. Reglas en buildRemateVideo: sin contentUrl (no es el archivo), sin duration
 * inventada, uploadDate nunca futuro, isLiveBroadcast solo el día y en horario.
 */
export function VideoObjectSchema(props: {
  name: string;
  description: string;
  youtubeUrl?: string | null;
  date: string;
  time?: string | null;
  publisherName?: string;
}) {
  const video = buildRemateVideo(props);
  return video ? <Ld data={video} /> : null;
}

/** Un remate para el ItemList: el Auction de remates.json sirve tal cual. */
type RemateListItem = RemateEventInput & {
  /** undefined → la ficha del remate; null → sin url. */
  url?: string | null;
  organizerUrl?: string;
};

/**
 * ItemList de Events. `name` según el contexto (próximos / anteriores / en vivo…),
 * `numberOfItems` = los que se emiten (máx. `max`), y cada Event con la URL de SU
 * ficha y el perfil de la consignataria como organizer.url.
 */
export function RematesListSchema({
  remates,
  name = 'Próximos remates ganaderos en Argentina',
  description,
  max = 10,
}: {
  remates: RemateListItem[];
  name?: string;
  description?: string;
  max?: number;
}) {
  const schema = buildRematesItemList(
    remates.map((r) => ({
      remate: r,
      opts: {
        url: r.url,
        organizerUrl: r.organizerUrl ?? `${SITE}${consignatariaProfilePath(r.consignatariaSlug)}`,
      },
    })),
    { name, description, max },
  );
  return <Ld data={schema} />;
}

// SaaS Product/Pricing Schema for /planes page
interface PricingPlan {
  name: string;
  description: string;
  price: number;
  currency?: string;
  billingPeriod?: string;
  features: string[];
  custom?: boolean; // plan "a medida": price es piso (desde), no precio fijo
}

export function SaaSPricingSchema({ plans }: { plans: PricingPlan[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://www.consignatarias.com.ar/planes',
    name: `Planes y Precios - ${MARCA}`,
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
          image: 'https://www.consignatarias.com.ar/og-image.png',
          brand: ORG_REF,
          // Plan "a medida": price es piso → priceSpecification.minPrice, no un
          // precio fijo (evita mostrar un precio engañoso). Los demás, precio fijo.
          offers: {
            '@type': 'Offer',
            priceCurrency: plan.currency || 'ARS',
            availability: 'https://schema.org/InStock',
            url: `${SITE}/planes`,
            seller: ORG_REF,
            ...(plan.custom
              ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: plan.price, priceCurrency: plan.currency || 'ARS' } }
              : { price: plan.price, priceValidUntil: finDelAnioSiguiente() }), // fin del año siguiente: nunca vence solo
          },
        },
      })),
    },
  };

  return <Ld data={schema} />;
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

  return <Ld data={schema} />;
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

  return <Ld data={schema} />;
}

// TechArticle Schema for technical documentation (API docs, developer guides)
interface TechArticleSchemaProps {
  name: string;
  description: string;
  url: string;
  /** Fecha real de publicación. Sin ella se omite (antes '2024-01-01' por defecto). */
  datePublished?: string;
  /**
   * OBLIGATORIA y explícita: la última edición REAL del texto (una constante en la
   * página). Nunca la fecha del build ni la del precio del día: eso simula frescura.
   */
  dateModified: string;
  /** Imagen de la sección (su og). Por defecto, la og genérica. */
  image?: string;
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
  datePublished,
  dateModified,
  image = `${SITE}/og-image.png`,
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
    image,
    ...(datePublished ? { datePublished } : {}),
    dateModified,
    proficiencyLevel,
    inLanguage: 'es-AR',
    author: authorName
      ? {
          '@type': 'Person',
          name: authorName,
          worksFor: ORG_REF,
        }
      : ORG_REF,
    publisher: ORG_REF,
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

  return <Ld data={schema} />;
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
    provider: ORG_REF,
  };

  return <Ld data={schema} />;
}

/* ------------------------------------------------------------------ */
/*  GUÍA PAGA — Product + Offer                                        */
/* ------------------------------------------------------------------ */

interface GuiaPremiumSchemaProps {
  name: string;
  description: string;
  url: string;
  price: number;
  pages: number;
  edicion: string;
  fechaActualizacion: string;
  /** Normas que la guía cita: le dice al buscador (y a la IA) de qué habla de verdad. */
  citations?: { name: string; url?: string }[];
}

/**
 * Product + Offer de la guía paga, más el Book/DigitalDocument que describe qué
 * se entrega. Un `Product` pelado con precio es lo mínimo para que aparezca el
 * precio en el SERP; el `Book` con numberOfPages y datePublished es lo que hace
 * que un motor de IA pueda decir QUÉ es y CUÁN actualizada está — que es el
 * argumento de venta entero.
 */
export function GuiaPremiumSchema({
  name,
  description,
  url,
  price,
  pages,
  edicion,
  fechaActualizacion,
  citations = [],
}: GuiaPremiumSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#producto`,
    name,
    description,
    url,
    image: `${SITE}/og-image.png`,
    brand: ORG_REF,
    category: 'Guía profesional — ganadería y comercialización de hacienda',
    inLanguage: 'es-AR',
    releaseDate: fechaActualizacion,
    isRelatedTo: {
      '@type': 'Book',
      name,
      bookFormat: 'https://schema.org/EBook',
      numberOfPages: pages,
      inLanguage: 'es-AR',
      datePublished: fechaActualizacion,
      version: edicion,
      author: ORG_REF,
      publisher: ORG_REF,
      ...(citations.length > 0 && {
        citation: citations.map((c) => ({
          '@type': 'Legislation',
          name: c.name,
          ...(c.url && { url: c.url }),
        })),
      }),
    },
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'ARS',
      availability: 'https://schema.org/InStock',
      url,
      // Compra única: sin renovación ni suscripción que declarar.
      category: 'https://schema.org/Purchase',
      seller: ORG_REF,
      priceValidUntil: finDelAnioSiguiente(),
      eligibleRegion: { '@type': 'Country', name: 'Argentina' },
    },
    audience: {
      '@type': 'BusinessAudience',
      name: 'Martilleros, consignatarios de hacienda y productores ganaderos',
    },
  };

  return <Ld data={schema} />;
}
