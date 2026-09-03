import { randomUUID } from 'node:crypto'
import type {
  ArtifactCloudOperation,
  ArtifactCloudOptions,
  ArtifactListOptions,
  ArtifactListPage,
  ArtifactListItem,
  ArtifactPublishedLink,
  ArtifactPublishResult,
  ArtifactWriteRequest
} from '../../shared/artifacts'
import { assertArtifactSharingAllowed } from '../../shared/artifact-sharing-gate'
import { ensureActiveOrcaProfile } from '../orca-profiles/profile-index-store'
import { getOrcaCloudAuthConfig } from '../orca-profiles/profile-cloud-auth-config'
import { prepareArtifactCloudUse } from '../orca-profiles/profile-artifact-cloud-cleanup'
import { runWithFreshOrcaCloudSession } from '../orca-profiles/profile-cloud-session-refresh'
import {
  allowsArtifactCloudAuthOverride,
  resolveArtifactCloudApiUrl
} from './artifact-cloud-config'
import {
  getArtifactShareRecord,
  refreshArtifactShareRecordExpiration,
  removeArtifactShareRecords
} from './artifact-share-record-store'
import { artifactRequest, artifactWriteBody } from './artifact-cloud-request'
import { ArtifactPublisher } from './artifact-publisher'
import {
  type ArtifactAuthContext,
  deleteArtifactRequest,
  storedSessionAuthContext,
  explicitTokenAuthContext
} from './artifact-cloud-auth-helpers'

export class ArtifactCloudService {
  private readonly publisher: ArtifactPublisher

  /**
   * `isSharingEnabled` is the publish capability gate. It is read per call, never cached, so
   * revoking it in Settings takes effect on the next request. List, unshare, and delete stay
   * ungated: a user who turns publishing off must still be able to audit and revoke old links.
   */
  constructor(
    private readonly userDataPath: string,
    private readonly isSharingEnabled: () => boolean
  ) {
    this.publisher = new ArtifactPublisher(userDataPath)
  }

  list(options: ArtifactListOptions): Promise<ArtifactCloudOperation<ArtifactListPage>> {
    return this.withAuth(options, async (token, apiUrl) => {
      const query = options.cursor ? `?cursor=${encodeURIComponent(options.cursor)}` : ''
      return artifactRequest<ArtifactListPage>(apiUrl, token, query)
    })
  }

  getPublishedLink(
    request: ArtifactCloudOptions & { sourceKey: string }
  ): Promise<ArtifactCloudOperation<ArtifactPublishedLink | null>> {
    return this.withAuth(request, async (_token, _apiUrl, auth) => {
      const record = getArtifactShareRecord(
        auth.profileId,
        this.userDataPath,
        request.sourceKey,
        auth.scope
      )
      return record ? { shareUrl: record.shareUrl } : null
    })
  }

  async shareLegacy(
    request: ArtifactWriteRequest
  ): Promise<ArtifactCloudOperation<ArtifactListItem>> {
    assertArtifactSharingAllowed(this.isSharingEnabled)
    const idempotencyKey = randomUUID()
    return this.withAuth(request, (token, apiUrl, auth) =>
      this.publisher.share(request, token, apiUrl, auth, idempotencyKey)
    )
  }

  async publish(
    request: ArtifactWriteRequest
  ): Promise<ArtifactCloudOperation<ArtifactPublishResult>> {
    assertArtifactSharingAllowed(this.isSharingEnabled)
    const idempotencyKey = randomUUID()
    return this.withAuth(request, (token, apiUrl, auth) =>
      this.publisher.publish(request, token, apiUrl, auth, idempotencyKey)
    )
  }

  async update(request: ArtifactWriteRequest): Promise<ArtifactCloudOperation<ArtifactListItem>> {
    assertArtifactSharingAllowed(this.isSharingEnabled)
    return this.withAuth(request, (token, apiUrl, auth) =>
      this.publisher.runForSource(request.sourceKey, auth, async () => {
        auth.assertCurrent()
        const record = getArtifactShareRecord(
          auth.profileId,
          this.userDataPath,
          request.sourceKey,
          auth.scope
        )
        if (!record) {
          throw new Error('This file has not been shared from the active Orca profile.')
        }
        return this.publisher.runForSlug(record.slug, auth, async () => {
          auth.assertCurrent()
          const response = await artifactRequest<ArtifactListItem>(
            apiUrl,
            token,
            `/${record.slug}`,
            {
              method: 'PUT',
              editToken: record.editToken,
              body: artifactWriteBody(request)
            }
          )
          auth.assertCurrent()
          refreshArtifactShareRecordExpiration(
            auth.profileId,
            this.userDataPath,
            request.sourceKey,
            auth.scope,
            record,
            response.artifact.expiresAt
          )
          return response
        })
      })
    )
  }

  unshareLegacy(
    request: ArtifactCloudOptions & { sourceKey: string }
  ): Promise<ArtifactCloudOperation<void>> {
    return this.withAuth(request, (token, apiUrl, auth) =>
      this.publisher.runForSource(request.sourceKey, auth, async () => {
        auth.assertCurrent()
        const record = getArtifactShareRecord(
          auth.profileId,
          this.userDataPath,
          request.sourceKey,
          auth.scope
        )
        if (!record) {
          throw new Error('This file has not been shared from the active Orca profile.')
        }
        return this.publisher.runForSlug(record.slug, auth, async () => {
          auth.assertCurrent()
          await deleteArtifactRequest(apiUrl, token, `/${record.slug}`, record.editToken)
          auth.assertCurrent()
          removeArtifactShareRecords(auth.profileId, this.userDataPath, auth.scope, {
            sourceKey: request.sourceKey,
            slug: record.slug
          })
        })
      })
    )
  }

  delete(id: string, options: ArtifactCloudOptions): Promise<ArtifactCloudOperation<void>> {
    return this.withAuth(options, (token, apiUrl, auth) =>
      this.publisher.runForSlug(id, auth, async () => {
        auth.assertCurrent()
        await deleteArtifactRequest(apiUrl, token, `/${encodeURIComponent(id)}`)
        auth.assertCurrent()
        removeArtifactShareRecords(auth.profileId, this.userDataPath, auth.scope, { slug: id })
      })
    )
  }

  protected async withAuth<T>(
    options: ArtifactCloudOptions,
    operation: (token: string, apiUrl: string, auth: ArtifactAuthContext) => Promise<T>
  ): Promise<ArtifactCloudOperation<T>> {
    const apiUrl = resolveArtifactCloudApiUrl(options.apiUrl)
    const active = ensureActiveOrcaProfile(this.userDataPath)
    prepareArtifactCloudUse(active.profile, this.userDataPath)
    if (options.authToken?.trim()) {
      if (!allowsArtifactCloudAuthOverride()) {
        throw new Error(
          'Artifact authentication overrides are available only in development builds.'
        )
      }
      const token = options.authToken.trim()
      const auth = explicitTokenAuthContext(active, apiUrl, token, this.userDataPath)
      const value = await operation(token, apiUrl, auth)
      auth.assertCurrent()
      return {
        status: 'ok',
        value
      }
    }
    const config = getOrcaCloudAuthConfig()
    if (!config.configured) {
      return { status: 'unconfigured', message: config.setupMessage }
    }
    if (!active.profile.cloud) {
      return { status: 'reconnect-required' }
    }
    const result = await runWithFreshOrcaCloudSession(
      config.config,
      active,
      this.userDataPath,
      async (session) => {
        const auth = storedSessionAuthContext(active, apiUrl, this.userDataPath)
        const value = await operation(session.accessToken, apiUrl, auth)
        auth.assertCurrent()
        return value
      }
    )
    return result.status === 'ok'
      ? { status: 'ok', value: result.value }
      : { status: 'reconnect-required' }
  }
}
