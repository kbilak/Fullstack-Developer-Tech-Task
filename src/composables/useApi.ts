import axios from 'axios'
import type { AxiosError, AxiosInstance } from 'axios'
import type { ApiResult } from '@/types/api'

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResult>) => {
    const message = error.response?.data?.message ?? error.message
    console.error(`[API] ${error.config?.method?.toUpperCase()} ${error.config?.url}: ${message}`)
    return Promise.reject(error)
  },
)

/**
 * @method useApi
 * @summary Composable providing a pre-configured Axios instance for REST API communication
 * @returns {{ apiClient: AxiosInstance }} Object containing the Axios instance with baseURL from VITE_API_URL, JSON headers, 10s timeout, and error-logging response interceptor
 */
export function useApi() {
  return { apiClient }
}
