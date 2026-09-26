export interface HomeCategory {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  resourceCount: number;
  topProvider: { name: string; verified: boolean } | null;
}

export interface HomeResource {
  id: string;
  name: string;
  category: string;
  provider: string;
  providerVerified: boolean;
  location: string;
  price: number;
  unit: string;
  rating: number | null;
  reviews: number;
  imageUrl: string | null;
}

export interface HomeStats {
  verifiedBusinesses: number;
  providers: number;
  resources: number;
  avgFulfillmentRate: number;
}

export interface Procurement {
  months: number;
  totalSpend: number;
  resourcesAcquired: number;
  providersUsed: number;
  fulfillmentRate: number;
  deltas: {
    spend: number | null;
    resources: number | null;
    providers: number | null;
    fulfillment: number | null;
  };
  monthly: { label: string; amount: number }[];
  categoryDistribution: { name: string; amount: number; share: number }[];
}

export interface HomeData {
  categories: HomeCategory[];
  featured: HomeResource[];
  locations: string[];
  stats: HomeStats;
  procurement: Procurement;
}
