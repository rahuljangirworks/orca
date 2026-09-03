import { z } from 'zod'
import {
  ARTIFACT_CLI_MAX_RPC_BYTES,
  artifactWriteRequestByteLength,
  ArtifactPlatformShareRequestSchema,
  ArtifactShareRequestSchema
} from '../../../../shared/artifacts'
import { defineMethod, type RpcAnyMethod } from '../core'

const CloudOptions = z
  .object({
    apiUrl: z.string().max(2_048).optional(),
    authToken: z.string().max(16_384).optional()
  })
  .strict()

const ListOptions = z
  .object({
    ...CloudOptions.shape,
    cursor: z.string().min(1).max(2_048).optional()
  })
  .strict()

const SourceRequest = z
  .object({
    sourceKey: z.string().min(1).max(32_768),
    ...CloudOptions.shape
  })
  .strict()

const WriteRequest = z
  .object({
    sourceKey: z.string().min(1).max(32_768),
    content: z.string().min(1).max(ARTIFACT_CLI_MAX_RPC_BYTES),
    contentType: z.enum(['text/html', 'text/markdown']),
    fileName: z.string().min(1).max(512),
    title: z.string().max(512).optional(),
    ...CloudOptions.shape
  })
  .refine((request) => artifactWriteRequestByteLength(request) <= ARTIFACT_CLI_MAX_RPC_BYTES, {
    message: 'Artifact request exceeds the local RPC size limit.'
  })

export const ARTIFACT_METHODS: readonly RpcAnyMethod[] = [
  defineMethod({
    name: 'artifacts.list',
    params: ListOptions,
    handler: (params, { runtime }) => runtime.listArtifacts(params)
  }),
  defineMethod({
    name: 'artifacts.getPublishedLink',
    params: SourceRequest,
    handler: (params, { runtime }) => runtime.getPublishedArtifactLink(params)
  }),
  defineMethod({
    name: 'artifacts.share',
    params: WriteRequest,
    handler: (params, { runtime }) => runtime.shareArtifact(params)
  }),
  defineMethod({
    name: 'artifacts.publish',
    params: WriteRequest,
    handler: (params, { runtime }) => runtime.publishArtifact(params)
  }),
  defineMethod({
    name: 'artifacts.update',
    params: WriteRequest,
    handler: (params, { runtime }) => runtime.updateArtifact(params)
  }),
  defineMethod({
    name: 'artifacts.unshare',
    params: SourceRequest,
    handler: (params, { runtime }) => runtime.unshareArtifact(params)
  }),
  defineMethod({
    name: 'artifacts.shareArtifactWith',
    params: z
      .object({
        id: z.string().min(1).max(32_768),
        request: ArtifactPlatformShareRequestSchema,
        options: CloudOptions
      })
      .strict(),
    handler: (params, { runtime }) =>
      runtime.shareArtifactWith(params.id, params.request, params.options)
  }),
  defineMethod({
    name: 'artifacts.shareArtifactLink',
    params: z
      .object({
        id: z.string().min(1).max(32_768),
        request: ArtifactShareRequestSchema,
        options: CloudOptions
      })
      .strict(),
    handler: (params, { runtime }) =>
      runtime.shareArtifactLink(params.id, params.request, params.options)
  }),
  defineMethod({
    name: 'artifacts.revokeArtifactShare',
    params: z
      .object({
        id: z.string().min(1).max(32_768),
        shareId: z.string().min(1).max(32_768),
        options: CloudOptions
      })
      .strict(),
    handler: (params, { runtime }) =>
      runtime.revokeArtifactShare(params.id, params.shareId, params.options)
  }),
  defineMethod({
    name: 'artifacts.listArtifactShares',
    params: z
      .object({
        id: z.string().min(1).max(32_768),
        options: CloudOptions
      })
      .strict(),
    handler: (params, { runtime }) => runtime.listArtifactShares(params.id, params.options)
  }),
  defineMethod({
    name: 'artifacts.listSharedWithMeArtifacts',
    params: CloudOptions,
    handler: (params, { runtime }) => runtime.listSharedWithMeArtifacts(params)
  }),
  defineMethod({
    name: 'artifacts.publishArtifactShare',
    params: z
      .object({
        id: z.string().min(1).max(32_768),
        options: CloudOptions
      })
      .strict(),
    handler: (params, { runtime }) => runtime.publishArtifactShare(params.id, params.options)
  }),
  defineMethod({
    name: 'artifacts.unpublishArtifactShare',
    params: z
      .object({
        id: z.string().min(1).max(32_768),
        options: CloudOptions
      })
      .strict(),
    handler: (params, { runtime }) => runtime.unpublishArtifactShare(params.id, params.options)
  })
]
