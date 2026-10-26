export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  retryAfterSeconds?: number;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Support HTTP-only session cookies
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : null;

    if (res.status === 429) {
      const retryHeader = res.headers.get('Retry-After');
      const retryAfterSeconds = retryHeader ? parseInt(retryHeader, 10) : 60;
      return {
        success: false,
        error: 'rate_limited',
        message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ trước khi thử lại.',
        retryAfterSeconds: isNaN(retryAfterSeconds) ? 60 : retryAfterSeconds,
      };
    }

    if (!res.ok) {
      return {
        success: false,
        error: data?.error || `HTTP ${res.status}`,
        message: data?.message || data?.error || 'Đã có lỗi xảy ra',
      };
    }

    return {
      success: true,
      message: data?.message,
      data: data?.data ?? data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'network_error',
      message: 'Không thể kết nối đến máy chủ API. Vui lòng kiểm tra kết nối mạng.',
    };
  }
}
