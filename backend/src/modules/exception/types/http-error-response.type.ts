export interface HttpErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  code: string;
  message: string;
  timestamp: string;
  path: string;
  details?: unknown;
  requestId?: string;
  stack?: string;
}
