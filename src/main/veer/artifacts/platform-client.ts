import type { ArtifactAuthContext } from '../../artifacts/artifact-cloud-auth-helpers'
import type { 
  ArtifactCloudOptions, 
  ArtifactPlatformShareRequest
} from '../../../shared/artifacts'

export class VeerPlatformArtifactClient {
  constructor(private readonly apiUrl: string = 'https://api.veer.rahuljangir.work') {}

  async publishArtifact(id: string, options: ArtifactCloudOptions, withAuth: Function) {
    return withAuth(options, async (token: string, _: string, auth: ArtifactAuthContext) => {
      auth.assertCurrent()
      const response = await fetch(`${this.apiUrl}/v1/artifacts/${encodeURIComponent(id)}/publish`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to publish artifact to Veer Platform')
      return response.json()
    })
  }

  async unpublishArtifact(id: string, options: ArtifactCloudOptions, withAuth: Function) {
    return withAuth(options, async (token: string, _: string, auth: ArtifactAuthContext) => {
      auth.assertCurrent()
      const response = await fetch(`${this.apiUrl}/v1/artifacts/${encodeURIComponent(id)}/unpublish`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to unpublish artifact from Veer Platform')
      return response.json()
    })
  }

  async shareArtifact(id: string, request: ArtifactPlatformShareRequest, options: ArtifactCloudOptions, withAuth: Function) {
    return withAuth(options, async (token: string, _: string, auth: ArtifactAuthContext) => {
      auth.assertCurrent()
      const response = await fetch(`${this.apiUrl}/v1/artifacts/${encodeURIComponent(id)}/shares`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(request)
      })
      if (!response.ok) throw new Error('Failed to share artifact on Veer Platform')
      return response.json()
    })
  }

  async listShares(id: string, options: ArtifactCloudOptions, withAuth: Function) {
    return withAuth(options, async (token: string, _: string, auth: ArtifactAuthContext) => {
      auth.assertCurrent()
      const response = await fetch(`${this.apiUrl}/v1/artifacts/${encodeURIComponent(id)}/shares`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to list artifact shares from Veer Platform')
      return response.json()
    })
  }

  async listSharedWithMe(options: ArtifactCloudOptions, withAuth: Function) {
    return withAuth(options, async (token: string, _: string, auth: ArtifactAuthContext) => {
      auth.assertCurrent()
      const response = await fetch(`${this.apiUrl}/v1/shared-with-me`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to list shared-with-me artifacts from Veer Platform')
      return response.json()
    })
  }
}

export const veerPlatformClient = new VeerPlatformArtifactClient()
