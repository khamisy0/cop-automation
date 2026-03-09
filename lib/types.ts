// Stub file - types

export interface ProcessingResult {
  success: boolean;
  data?: any;
  errors?: ProcessingError[];
}

export interface ProcessingError {
  message: string;
  code?: string;
  type?: string;
}
