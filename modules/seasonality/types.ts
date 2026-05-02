export interface ValidationInputItem {
  id: string; // Internal temporary ID array map
  mancode: string;
  colorCode: string;
  country?: string; // Optional because fallback logic exists
}

export type ValidationStatus = "Found" | "Not Found";

export interface ValidationResultItem {
  mancode: string;
  colorCode: string;
  country: string;
  correctSeason: string | null;
  priorityUsed: number | null;
  status: ValidationStatus;
}

export interface ValidationEngineResponse {
  results: ValidationResultItem[];
  summary: {
    total: number;
    found: number;
    notFound: number;
  };
}
