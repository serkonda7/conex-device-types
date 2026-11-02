/**
 * Definition checks: what conex would refuse comes from the conex rules
 * themselves, the rest is what only this repo cares about.
 */
import { unknownDeviceTypeKeys, validateDeviceType } from '@serkonda7/conex-device-schema'

// biome-ignore lint/suspicious/noExplicitAny: parsed YAML of unknown shape
type Definition = Record<string, any>

/** File name form of a model: NetBox's library rules, simplified to one replacement table. */
export function slugify(value: string): string {
	let out = value.toLowerCase()
	for (const [from, to] of [
		[' ', '-'],
		['sfp+', 'sfpp'],
		['poe+', 'poep'],
		['-+', '-plus'],
		['+', '-plus-'],
		['_', '-'],
		['&', '-and-'],
		['/', '-'],
		['.', '-'],
		['*', '-'],
		['!', ''],
		[',', ''],
		["'", ''],
		['(', ''],
		[')', ''],
		[';', ''],
	]) {
		out = out.replaceAll(from, to)
	}
	return out.replace(/-+$/, '')
}

/** Parses like the conex importer, so a file means here what it means there. */
export function parseDefinition(text: string): Definition | null {
	const parsed = Bun.YAML.parse(text)
	return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
		? (parsed as Definition)
		: null
}

/** conex's identity of a type: names match case-insensitively, a model per manufacturer. */
export function identityOf(def: Definition): string {
	return `${def.manufacturer}/${def.model}`.trim().toLowerCase()
}

/** Returns every problem in one file; `sameType` lists all files defining its type. */
export function checkDefinition(file: string, text: string, sameType: string[]): string[] {
	const [, manufacturerDir, base] = file.split('/')
	if (!/\.ya?ml$/.test(base)) {
		return [`${file}: extension must be .yaml or .yml`]
	}
	let def: Definition | null
	try {
		def = parseDefinition(text)
	} catch (err) {
		return [`${file}: invalid YAML: ${(err as Error).message}`]
	}
	if (!def) {
		return [`${file}: must be a mapping`]
	}

	const refusal = validateDeviceType(def)
	if (refusal !== null) {
		return [`${file}: ${refusal}`]
	}

	const errors = unknownDeviceTypeKeys(def).map((problem) => `${file}: ${problem}`)
	if (def.manufacturer !== manufacturerDir) {
		errors.push(`${file}: manufacturer "${def.manufacturer}" does not match its directory`)
	}
	if (sameType.length > 1) {
		errors.push(
			`${file}: model is also defined by ${sameType.filter((f) => f !== file).join(', ')}`,
		)
	}
	const model = slugify(def.model)
	const partNumber = slugify(def.part_number ?? '')
	const filename = base.replace(/\.ya?ml$/, '').toLowerCase()
	if (![model, partNumber, String(def.part_number ?? '').toLowerCase()].includes(filename)) {
		errors.push(`${file}: file name must be "${model}.yaml" (or the part number)`)
	}
	return errors
}
