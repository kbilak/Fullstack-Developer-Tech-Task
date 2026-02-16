export interface ApiResult {
  status: boolean
  message: string | null
}

export interface CreateResult extends ApiResult {
  id: number
}
