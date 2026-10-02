import { expect, test } from 'bun:test'
import { Glob } from 'bun'
import { checkDefinition, parseDefinition } from './checks'

const files = (await Array.fromAsync(new Glob('device-types/*/*').scan({ dot: true }))).sort()
const texts = new Map<string, string>()
const slugOf = new Map<string, string>()
const filesBySlug = new Map<string, string[]>()
for (const file of files) {
	const text = await Bun.file(file).text()
	texts.set(file, text)
	try {
		const slug = parseDefinition(text)?.slug
		if (typeof slug === 'string') {
			slugOf.set(file, slug)
			filesBySlug.set(slug, [...(filesBySlug.get(slug) ?? []), file])
		}
	} catch {
		// Reported by the file's own check.
	}
}

test.each(files)('%s', (file) => {
	const sameSlug = filesBySlug.get(slugOf.get(file) ?? '') ?? [file]
	expect(checkDefinition(file, texts.get(file) ?? '', sameSlug)).toEqual([])
})
