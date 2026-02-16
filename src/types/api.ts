export interface ApiResponse<T> {
  status: boolean
  message: string | null
  data?: T
}
