import { expect, test } from 'bun:test'
import { Glob } from 'bun'
import { checkDefinition, identityOf, parseDefinition } from './checks'

const files = (await Array.fromAsync(new Glob('device-types/*/*').scan({ dot: true }))).sort()
const texts = new Map<string, string>()
const identities = new Map<string, string>()
const filesByType = new Map<string, string[]>()
for (const file of files) {
	const text = await Bun.file(file).text()
	texts.set(file, text)
	try {
		const definition = parseDefinition(text)
		if (definition) {
			const identity = identityOf(definition)
			identities.set(file, identity)
			filesByType.set(identity, [...(filesByType.get(identity) ?? []), file])
		}
	} catch {
		// Reported by the file's own check.
	}
}

test.each(files)('%s', (file) => {
	const sameType = filesByType.get(identities.get(file) ?? '') ?? [file]
	expect(checkDefinition(file, texts.get(file) ?? '', sameType)).toEqual([])
})
