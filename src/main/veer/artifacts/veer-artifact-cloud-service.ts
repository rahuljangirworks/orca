/**
 * VeerArtifactCloudService — Veer Platform artifact sharing extension.
 *
 * This subclass adds Veer Platform-specific sharing methods to the upstream
 * ArtifactCloudService base. All Veer logic is isolated here per the 90/10
 * fork rule; the base class remains upstream-mergeable without modification.
 *
 * Methods added:
 *   share            — create a share record for a given artifact id
 *   shareArtifact    — create a share record with platform-specific metadata
 *   publishArtifact  — publish an artifact link (returns shareUrl)
 *   unpublishArtifact — remove a published link
 *   unshare          — revoke a specific share record
 *   listShares       — list all share records for an artifact
 *   listSharedWithMe — list artifacts shared with the current user
 */
import type {
  ArtifactCloudOperation,
  ArtifactCloudOptions,
  ArtifactShareRequest,
  ArtifactShareRecord,
  ArtifactListSharesResult,
  ArtifactSharedWithMeResult,
  ArtifactPlatformShareRequest
} from '../../../shared/artifacts'
import { artifactRequest } from '../../artifacts/artifact-cloud-request'
import { ArtifactCloudService } from '../../artifacts/artifact-cloud-service'

export class VeerArtifactCloudService extends ArtifactCloudService {
  share(
    id: string,
    request: ArtifactShareRequest,
    options: ArtifactCloudOptions
  ): Promise<ArtifactCloudOperation<ArtifactShareRecord>> {
    return this.withAuth(options, (token, apiUrl, _auth) =>
      artifactRequest<ArtifactShareRecord>(apiUrl, token, `/${encodeURIComponent(id)}/shares`, {
        method: 'POST',
        body: request
      })
    )
  }

  shareArtifact(
    id: string,
    request: ArtifactPlatformShareRequest,
    options: ArtifactCloudOptions
  ): Promise<ArtifactCloudOperation<ArtifactShareRecord>> {
    return this.withAuth(options, (token, apiUrl, _auth) =>
      artifactRequest<ArtifactShareRecord>(apiUrl, token, `/${encodeURIComponent(id)}/shares`, {
        method: 'POST',
        body: request
      })
    )
  }

  publishArtifact(
    id: string,
    options: ArtifactCloudOptions
  ): Promise<ArtifactCloudOperation<{ shareUrl: string }>> {
    return this.withAuth(options, (token, apiUrl, _auth) =>
      artifactRequest<{ shareUrl: string }>(apiUrl, token, `/${encodeURIComponent(id)}/publish`, {
        method: 'POST'
      })
    )
  }

  unpublishArtifact(
    id: string,
    options: ArtifactCloudOptions
  ): Promise<ArtifactCloudOperation<void>> {
    return this.withAuth(options, (token, apiUrl, _auth) =>
      artifactRequest<void>(apiUrl, token, `/${encodeURIComponent(id)}/unpublish`, {
        method: 'POST'
      })
    )
  }

  unshare(
    id: string,
    shareId: string,
    options: ArtifactCloudOptions
  ): Promise<ArtifactCloudOperation<void>> {
    return this.withAuth(options, (token, apiUrl, _auth) =>
      artifactRequest<void>(
        apiUrl,
        token,
        `/${encodeURIComponent(id)}/shares/${encodeURIComponent(shareId)}`,
        { method: 'DELETE' }
      )
    )
  }

  listShares(
    id: string,
    options: ArtifactCloudOptions
  ): Promise<ArtifactCloudOperation<ArtifactListSharesResult>> {
    return this.withAuth(options, (token, apiUrl, _auth) =>
      artifactRequest<ArtifactListSharesResult>(apiUrl, token, `/${encodeURIComponent(id)}/shares`)
    )
  }

  listSharedWithMe(
    options: ArtifactCloudOptions
  ): Promise<ArtifactCloudOperation<ArtifactSharedWithMeResult>> {
    return this.withAuth(options, (token, apiUrl, _auth) =>
      artifactRequest<ArtifactSharedWithMeResult>(apiUrl, token, '/shared-with-me')
    )
  }
}
