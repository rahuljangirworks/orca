// Full AST-based rebrand pass: rewrites Orca->Veer inside t()/translate()/
// translateMain() fallback STRING LITERALS across src/renderer/src AND
// src/main (the earlier grep-based pass only covered same-line matches in
// src/renderer/src and missed translateMain() entirely). Only touches the
// literal fallback text -- never identifiers, imports, or non-fallback code.
// Preserves compat identifiers by construction: \bOrca\b is case-sensitive
// and only matches the capitalized brand word, never "orca.yaml",
// "orca status", "orca-linear", "ORCA_*" env vars, or "orca-ide".
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript-api'

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'])
const SKIP_PATH_PARTS = new Set(['.git', 'dist', 'node_modules', 'out', '__snapshots__', 'assets'])
const LOCALIZATION_FUNCTION_NAMES = new Set(['t', 'translate', 'translateMain'])
const SOURCE_RELATIVE_ROOTS = [path.join('src', 'renderer', 'src'), path.join('src', 'main')]

const AN_ORCA = /\b([Aa])n Orca\b/g
const WORD_ORCA = /\bOrca\b/g
function rebrand(value) {
  return value.replace(AN_ORCA, (_, article) => `${article} Orca`).replace(WORD_ORCA, 'Veer')
}

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

// Returns [{ start, end, oldText, newText }] string-literal edits (byte
// offsets into the ORIGINAL source text) for fallback args needing rebrand.
function findFallbackEdits(sourceText, filePath) {
  const sourceKind =
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    sourceKind
  )
  const edits = []

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
        if (secondArg && ts.isStringLiteralLike(secondArg) && /\bOrca\b/.test(secondArg.text)) {
          const newText = rebrand(secondArg.text)
          if (newText !== secondArg.text) {
            // Rebuild the literal preserving its original quote style.
            const raw = secondArg.getText(sourceFile)
            const quote = raw[0]
            // Escape backslashes, the quote char, and control characters
            // (\n, \r, \t) so the re-emitted literal stays a single valid
            // line -- ts.StringLiteral.text is the DECODED value, so any
            // embedded newline must be re-escaped or it corrupts the source.
            const escaped = newText
              .replace(/\\/g, '\\\\')
              .replace(new RegExp(quote, 'g'), `\\${quote}`)
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t')
            edits.push({
              start: secondArg.getStart(sourceFile),
              end: secondArg.getEnd(),
              oldText: raw,
              newText: `${quote}${escaped}${quote}`,
              key: firstArg.text,
              oldFallback: secondArg.text,
              newFallback: newText
            })
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return edits
}

async function main() {
  const root = process.cwd()
  const dryRun = process.argv.includes('--dry-run')
  const sourceRoots = SOURCE_RELATIVE_ROOTS.map((sourceRoot) => path.join(root, sourceRoot))

  let totalEdits = 0
  let filesChanged = 0
  const report = []

  for (const sourceRoot of sourceRoots) {
    const files = await collectSourceFiles(root, sourceRoot)
    for (const filePath of files) {
      const original = await fs.readFile(filePath, 'utf8')
      const edits = findFallbackEdits(original, filePath)
      if (edits.length === 0) {
        continue
      }

      // Apply edits back-to-front so earlier offsets stay valid.
      edits.sort((a, b) => b.start - a.start)
      let text = original
      for (const edit of edits) {
        text = text.slice(0, edit.start) + edit.newText + text.slice(edit.end)
      }

      if (!dryRun) {
        await fs.writeFile(filePath, text, 'utf8')
      }
      filesChanged += 1
      totalEdits += edits.length
      report.push({ filePath: path.relative(root, filePath), edits })
    }
  }

  console.log(
    `${dryRun ? '[dry-run] ' : ''}${totalEdits} fallback edit(s) across ${filesChanged} file(s).`
  )
  for (const { filePath, edits } of report) {
    console.log(`\n${filePath}`)
    for (const edit of edits) {
      console.log(
        `  ${edit.key}\n    - ${JSON.stringify(edit.oldFallback)}\n    + ${JSON.stringify(edit.newFallback)}`
      )
    }
  }
}

main()
