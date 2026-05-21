export interface ValidationInputItem {
  id: string;
  mancode: string;
  colorCode: string;
  brandCode: string;
  country?: string;
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
