// BLACKBOX shared types

export type Store = "amazon" | "temu" | "falabella";

export type Availability = "in_stock" | "low_stock" | "out_of_stock";

export type Classification =
  | "excellent"
  | "good"
  | "regular"
  | "not_recommended";

export type AiTone = "simple" | "tecnico" | "vendedor" | "neutral";

export interface Offer {
  id: string;
  productId: string;
  store: Store;
  price: number;
  originalPrice: number | null;
  affiliateLink: string;
  shippingTime: string;
  shippingCost: number;
  availability: Availability;
  rating: number | null;
  reviewCount: number;
  updatedAt: string;
}

export interface AiScore {
  id: string;
  productId: string;
  score: number;
  classification: Classification;
  reasoning: string;
  recommendation: string | null;
  bestStore: string | null;
  summary: string | null;
  updatedAt: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string | null;
  images: string[];
  features: string[];
  specs: Record<string, string>;
  isActive: boolean;
  isViral: boolean;
  // V2 sourcing & SEO
  sourceUrl?: string | null;
  sourceStore?: string | null;
  slug?: string | null;
  isFeatured: boolean;
  lastFetchedAt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  // V2 AI analysis (real data only)
  advantages: string[];
  disadvantages: string[];
  useCases: string[];
  faqs: Faq[];
  createdAt: string;
  updatedAt: string;
  offers?: Offer[];
  aiScore?: AiScore | null;
}

export interface PriceHistoryPoint {
  id: string;
  productId: string;
  store: string;
  price: number;
  currency: string;
  recordedAt: string;
}

export interface HomeSection {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  isActive: boolean;
  order: number;
  config: Record<string, unknown>;
}

export interface AffiliateLink {
  id: string;
  store: string;
  baseUrl: string;
  tagParam: string | null;
  tagValue: string | null;
  isActive: boolean;
}

// Used by API when returning products (parsed JSON fields)
export interface ProductWithRelations extends Omit<Product, "images" | "features" | "specs"> {
  images: string[];
  features: string[];
  specs: Record<string, string>;
}
