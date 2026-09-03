import { z } from 'zod'

export const ARTIFACT_CLI_MAX_RPC_BYTES = 800 * 1024

export const ArtifactShareRequestSchema = z
  .object({
    granteeUserId: z.string().min(1).optional(),
    granteeMachineId: z.string().min(1).optional(),
    granteeTeamId: z.string().min(1).optional(),
    permission: z.enum(['view', 'edit']).optional(),
    shareMethod: z.enum(['link', 'direct', 'machine', 'team']).optional(),
    expiresInSeconds: z.number().int().positive().optional()
  })
  .strict()

export const ArtifactPlatformShareRequestSchema = z
  .object({
    shareWith: z.string().min(1),
    permissionLevel: z.enum(['view', 'edit']),
    shareType: z.enum(['user', 'machine', 'team'])
  })
  .strict()

export function artifactWriteRequestByteLength(request: ArtifactWriteRequest): number {
  return new TextEncoder().encode(JSON.stringify(request)).byteLength
}

export type ArtifactMetadata = {
  version: 1
  slug: string
  title: string | null
  originalFileName: string | null
  sourceContentType: string
  renderedContentType: 'text/html'
  createdAt: string
  updatedAt: string
  expiresAt: string
  byteSize: number
  deletedAt: string | null
}

export type ArtifactListItem = {
  artifact: ArtifactMetadata
  shareUrl: string
}

export type ArtifactListPage = {
  artifacts: readonly ArtifactListItem[]
  nextCursor?: string
}

export type ArtifactWriteRequest = {
  sourceKey: string
  content: string
  contentType: 'text/html' | 'text/markdown'
  fileName: string
  title?: string
  apiUrl?: string
  authToken?: string
}

export type ArtifactPublishResult = {
  change: 'created' | 'updated'
  item: ArtifactListItem
}

export type ArtifactPublishedLink = {
  shareUrl: string
}

export type ArtifactCloudOptions = {
  apiUrl?: string
  authToken?: string
}

export type ArtifactListOptions = ArtifactCloudOptions & {
  cursor?: string
}

export type ArtifactCloudOperation<T> =
  | { status: 'ok'; value: T }
  | { status: 'reconnect-required' }
  | { status: 'unconfigured'; message: string }

export type ArtifactShareRequest = {
  granteeUserId?: string
  granteeMachineId?: string
  granteeTeamId?: string
  permission?: 'view' | 'edit'
  shareMethod?: 'link' | 'direct' | 'machine' | 'team'
  expiresInSeconds?: number
}

export type ArtifactShareRecord = {
  id: string
  artifact_id: string
  owner_user_id: string
  grantee_user_id: string | null
  grantee_machine_id: string | null
  grantee_team_id: string | null
  permission: 'view' | 'edit'
  share_method: 'link' | 'direct' | 'machine' | 'team'
  share_code: string | null
  is_active: number
  created_at: number
  expires_at: number | null
}

export type ArtifactListSharesResult = {
  shares: readonly ArtifactShareRecord[]
}

export type ArtifactSharedWithMeRecord = ArtifactShareRecord & {
  artifact_name: string
  content_type: string
  size_bytes: number
  sha256: string
}

export type ArtifactSharedWithMeResult = {
  shares: readonly ArtifactSharedWithMeRecord[]
}

export type ArtifactPlatformShareRequest = {
  shareWith: string
  permissionLevel: 'view' | 'edit'
  shareType: 'user' | 'machine' | 'team'
}
