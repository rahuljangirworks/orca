/**
 * Internal helpers for ArtifactCloudService auth context construction.
 * Extracted to keep artifact-cloud-service.ts within the 300-line limit.
 */
import { createHash } from 'node:crypto'
import { ensureActiveOrcaProfile } from '../orca-profiles/profile-index-store'
import type { ActiveOrcaProfileState } from '../orca-profiles/profile-index-store'
import {
  type ArtifactShareScope,
  captureArtifactShareLifecycle,
  isArtifactShareLifecycleCurrent
} from './artifact-share-record-store'
import { artifactRequest } from './artifact-cloud-request'
import { OrcaCloudRequestError } from '../orca-profiles/profile-cloud-client'

export type ArtifactAuthContext = {
  profileId: string
  scope: ArtifactShareScope
  assertCurrent: () => void
}

export async function deleteArtifactRequest(
  apiUrl: string,
  token: string,
  path: string,
  editToken?: string
): Promise<void> {
  try {
    await artifactRequest<void>(apiUrl, token, path, {
      method: 'DELETE',
      ...(editToken ? { editToken } : {})
    })
  } catch (error) {
    if (
      !(error instanceof OrcaCloudRequestError) ||
      error.statusCode !== 404 ||
      error.errorCode !== 'artifact_not_found'
    ) {
      throw error
    }
  }
}

export function tokenFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function buildAuthContext(
  active: ActiveOrcaProfileState,
  scope: ArtifactShareScope,
  userDataPath: string,
  expectedCloud?: { userId: string; profileId: string; organizationId: string }
): ArtifactAuthContext {
  const lifecycleGeneration = captureArtifactShareLifecycle(active.profile.id, userDataPath)
  return {
    profileId: active.profile.id,
    scope,
    assertCurrent: () => {
      const current = ensureActiveOrcaProfile(userDataPath)
      const cloudCurrent =
        !expectedCloud ||
        (current.profile.cloud?.userId === expectedCloud.userId &&
          current.profile.cloud.cloudProfileId === expectedCloud.profileId &&
          (current.profile.cloud.activeOrgId ?? '') === expectedCloud.organizationId)
      if (
        current.profile.id !== active.profile.id ||
        !cloudCurrent ||
        !isArtifactShareLifecycleCurrent(active.profile.id, userDataPath, lifecycleGeneration)
      ) {
        throw new Error(
          'The signed-in Orca account changed while the artifact request was running.'
        )
      }
    }
  }
}

export function storedSessionAuthContext(
  active: ActiveOrcaProfileState,
  apiOrigin: string,
  userDataPath: string
): ArtifactAuthContext {
  if (!active.profile.cloud) {
    throw new Error('The active Orca profile is not linked to a cloud account.')
  }
  return buildAuthContext(
    active,
    {
      cloudUserId: active.profile.cloud.userId,
      cloudProfileId: active.profile.cloud.cloudProfileId,
      cloudOrganizationId: active.profile.cloud.activeOrgId ?? '',
      apiOrigin
    },
    userDataPath,
    {
      userId: active.profile.cloud.userId,
      profileId: active.profile.cloud.cloudProfileId,
      organizationId: active.profile.cloud.activeOrgId ?? ''
    }
  )
}

export function explicitTokenAuthContext(
  active: ActiveOrcaProfileState,
  apiOrigin: string,
  token: string,
  userDataPath: string
): ArtifactAuthContext {
  const fingerprint = tokenFingerprint(token)
  return buildAuthContext(
    active,
    {
      cloudUserId: `token:${fingerprint}`,
      cloudProfileId: `token:${fingerprint}`,
      cloudOrganizationId: `token:${fingerprint}`,
      apiOrigin
    },
    userDataPath
  )
}
