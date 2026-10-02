/**
 * YAML lint following devicetype-library's yamllint config. Stopgap until
 * Biome 2.6 formats YAML.
 */
import { Glob } from 'bun'
import { isCollection, isMap, isScalar, LineCounter, type Node, parseDocument, visit } from 'yaml'

function lint(text: string): { line: number; message: string }[] {
	const found: { line: number; message: string }[] = []
	const lines = text.split('\n')
	if (!text.startsWith('---\n')) {
		found.push({ line: 1, message: 'missing document start "---"' })
	}
	if (!text.endsWith('\n') || text.endsWith('\n\n')) {
		found.push({ line: lines.length, message: 'file must end with exactly one newline' })
	}
	for (const [i, line] of lines.entries()) {
		if (/\s$/.test(line)) {
			found.push({ line: i + 1, message: 'trailing whitespace' })
		}
		if (line === '' && lines[i + 1] === '' && i + 2 < lines.length - 1) {
			found.push({ line: i + 1, message: 'more than one blank line' })
		}
	}

	const lineCounter = new LineCounter()
	const doc = parseDocument(text, { lineCounter, prettyErrors: false })
	const lineOf = (offset: number): number => lineCounter.linePos(offset).line
	const colOf = (offset: number): number => lineCounter.linePos(offset).col - 1
	for (const e of [...doc.errors, ...doc.warnings]) {
		found.push({ line: lineOf(e.pos[0]), message: e.message.split('\n')[0] })
	}
	if (doc.errors.length > 0) {
		return found
	}
	visit(doc, (_, node, path) => {
		if (isCollection(node) && !node.flow && node.range) {
			// Two spaces per level; sequences indented under their key.
			const parent = path.findLast((p) => isCollection(p)) as Node | undefined
			const expected = parent?.range ? colOf(parent.range[0]) + 2 : 0
			if (colOf(node.range[0]) !== expected) {
				found.push({
					line: lineOf(node.range[0]),
					message: `expected indentation ${expected}`,
				})
			}
		}
		if (isMap(node) && !node.flow) {
			for (const { key, value } of node.items as { key: Node | null; value: Node | null }[]) {
				if (!key?.range) {
					continue
				}
				if (
					isScalar(value) &&
					value.value === null &&
					value.range?.[0] === value.range?.[1]
				) {
					found.push({ line: lineOf(key.range[0]), message: 'empty value' })
				} else if (value?.range) {
					const gap = text.slice(key.range[1], value.range[0])
					if (!gap.includes('\n') && gap !== ': ') {
						found.push({
							line: lineOf(key.range[0]),
							message: 'expected exactly ": " after key',
						})
					}
				}
			}
		}
	})
	return found
}

const files =
	process.argv.length > 2
		? process.argv.slice(2)
		: (await Array.fromAsync(new Glob('**/*.{yaml,yml}').scan({ dot: true })))
				.filter((f) => !f.startsWith('node_modules/'))
				.sort()
let count = 0
for (const file of files) {
	for (const { line, message } of lint(await Bun.file(file).text()).sort(
		(a, b) => a.line - b.line,
	)) {
		console.log(`${file}:${line}: ${message}`)
		count++
	}
}
process.exit(count > 0 ? 1 : 0)
