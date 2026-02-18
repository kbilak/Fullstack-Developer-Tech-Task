/** Base shape returned by every API endpoint — contains operation status and optional error message. */
export interface ApiResult {
  status: boolean
  message: string | null
}

/** Response from create/update endpoints — extends ApiResult with the ID of the created/updated resource. */
export interface CreateResult extends ApiResult {
  id: number
}
