// Re-syncs EXISTING en.json catalog values from their current source-code
// fallback text. verify-localization-catalog.mjs --fix only adds *missing*
// keys; it never overwrites existing ones, so after a source-level rebrand
// (Orca -> Veer in translate() fallbacks) the catalog goes stale. This walks
// the same source roots/AST logic and overwrites en.json entries whose
// fallback text differs from what's already in the catalog.
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript-api'

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'])
const SKIP_PATH_PARTS = new Set(['.git', 'dist', 'node_modules', 'out', '__snapshots__', 'assets'])
const LOCALIZATION_FUNCTION_NAMES = new Set(['t', 'translate', 'translateMain'])
const LOCALES_RELATIVE_DIR = path.join('src', 'renderer', 'src', 'i18n', 'locales')
const SOURCE_RELATIVE_ROOTS = [path.join('src', 'renderer', 'src'), path.join('src', 'main')]

function isSkippedFile(root, filePath) {
  const relative = path.relative(root, filePath).split(path.sep).join('/')
  if (
    relative.endsWith('.d.ts') ||
    relative.includes('.test.') ||
    relative.includes('.spec.') ||
    relative.includes('/__tests__/')
  ) {
    return true
  }
  return relative.split('/').some((part) => SKIP_PATH_PARTS.has(part))
}

async function collectSourceFiles(root, dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_PATH_PARTS.has(entry.name)) {
        files.push(...(await collectSourceFiles(root, fullPath)))
      }
      continue
    }
    if (
      entry.isFile() &&
      SOURCE_EXTENSIONS.has(path.extname(entry.name)) &&
      !isSkippedFile(root, fullPath)
    ) {
      files.push(fullPath)
    }
  }
  return files
}

function expressionNameText(node) {
  if (ts.isIdentifier(node)) {
    return node.text
  }
  if (ts.isPropertyAccessExpression(node)) {
    return `${expressionNameText(node.expression) ?? ''}.${node.name.text}`.replace(/^\./, '')
  }
  return undefined
}

function collectLocalizationKeyReferences(sourceText, filePath) {
  const sourceKind =
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    sourceKind
  )
  const references = []
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const name = expressionNameText(node.expression)
      const functionName = name?.split('.').at(-1)
      const firstArg = node.arguments[0]
      if (
        functionName &&
        LOCALIZATION_FUNCTION_NAMES.has(functionName) &&
        firstArg &&
        ts.isStringLiteralLike(firstArg)
      ) {
        const secondArg = node.arguments[1]
        if (secondArg && ts.isStringLiteralLike(secondArg)) {
          references.push({ key: firstArg.text, fallback: secondArg.text })
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return references
}

function getCatalogEntry(catalog, key) {
  return key.split('.').reduce((cursor, part) => cursor?.[part], catalog)
}

function setCatalogEntry(catalog, key, value) {
  const parts = key.split('.')
  let cursor = catalog
  for (const part of parts.slice(0, -1)) {
    if (typeof cursor[part] !== 'object' || cursor[part] === null || Array.isArray(cursor[part])) {
      cursor[part] = {}
    }
    cursor = cursor[part]
  }
  cursor[parts.at(-1)] = value
}

async function main() {
  const root = process.cwd()
  const localesDir = path.join(root, LOCALES_RELATIVE_DIR)
  const catalogPath = path.join(localesDir, 'en.json')
  const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'))

  const sourceRoots = SOURCE_RELATIVE_ROOTS.map((sourceRoot) => path.join(root, sourceRoot))
  const references = []
  for (const sourceRoot of sourceRoots) {
    const files = await collectSourceFiles(root, sourceRoot)
    for (const filePath of files) {
      references.push(
        ...collectLocalizationKeyReferences(await fs.readFile(filePath, 'utf8'), filePath)
      )
    }
  }

  // Dedup by key (first occurrence wins, matches existing catalog script's tie-break)
  const byKey = new Map()
  for (const ref of references) {
    if (!byKey.has(ref.key)) {
      byKey.set(ref.key, ref.fallback)
    }
  }

  // Why: source has diverged from en.json via unrelated content edits too
  // (not just the Orca->Veer rebrand), e.g. rewritten sign-in copy or added
  // words. Blindly overwriting en.json with the current source fallback
  // would silently merge in those unrelated, unreviewed changes alongside
  // the branding fix. Only apply a change when it is provably a pure
  // Orca->Veer (or "an Orca"->"a Veer") token substitution of the existing
  // catalog value -- i.e. reapplying the exact same transform used by the
  // rebrand script to the OLD value reproduces the NEW value byte-for-byte.
  // Everything else is unrelated drift: report it, don't touch the catalog.
  const AN_ORCA = /\b([Aa])n Orca\b/g
  const WORD_ORCA = /\bOrca\b/g
  function isPureBrandSwap(oldValue, newValue) {
    const transformed = oldValue
      .replace(AN_ORCA, (_, article) => `${article} Orca`)
      .replace(WORD_ORCA, 'Veer')
    return transformed === newValue
  }

  let changed = 0
  const brandChanges = []
  const unrelatedDrift = []
  for (const [key, fallback] of byKey) {
    const existing = getCatalogEntry(catalog, key)
    if (typeof existing === 'string' && existing !== fallback) {
      if (isPureBrandSwap(existing, fallback)) {
        brandChanges.push({ key, from: existing, to: fallback })
        setCatalogEntry(catalog, key, fallback)
        changed += 1
      } else {
        unrelatedDrift.push({ key, from: existing, to: fallback })
      }
    }
  }

  const dryRun = process.argv.includes('--dry-run')
  if (!dryRun) {
    await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
  }
  console.log(
    `${dryRun ? '[dry-run] ' : ''}Resynced ${changed} pure brand-swap en.json entries from source fallbacks.`
  )
  for (const c of brandChanges.slice(0, 10)) {
    console.log(`  ${c.key}\n    - ${JSON.stringify(c.from)}\n    + ${JSON.stringify(c.to)}`)
  }
  if (brandChanges.length > 10) {
    console.log(`  ...and ${brandChanges.length - 10} more brand-only changes`)
  }

  console.log(
    `\n${unrelatedDrift.length} UNRELATED content changes found (NOT applied -- needs human review):`
  )
  for (const c of unrelatedDrift) {
    console.log(`  ${c.key}\n    - ${JSON.stringify(c.from)}\n    + ${JSON.stringify(c.to)}`)
  }
}

main()
