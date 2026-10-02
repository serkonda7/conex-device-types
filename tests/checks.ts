/**
 * Definition checks: the NetBox devicetype-library rules that matter for data
 * conex imports, plus what the conex importer accepts
 * (server/src/db/csv_transfer.ts importDeviceTypeDefinition).
 */
import Ajv2020 from 'ajv/dist/2020'
import { parse } from 'yaml'

// biome-ignore lint/suspicious/noExplicitAny: parsed YAML of unknown shape
type Definition = Record<string, any>

/** Lists conex turns into interface stubs; names share one namespace per type. */
const PORT_KEYS = ['interfaces', 'console-ports', 'power-ports', 'display-ports']
/** conex InterfacePrefixSchema. */
const PORT_NAME = /^[A-Za-z0-9_.-]{1,50}$/
/** Keys validated by schema/conex.json instead of the NetBox schema. */
const CONEX_KEYS = ['display-ports']

const ajv = new Ajv2020({ allErrors: true, multipleOfPrecision: 6 })
for (const name of ['reusable', 'generated_schema', 'components', 'devicetype', 'conex']) {
	ajv.addSchema(await Bun.file(`schema/${name}.json`).json())
}
// biome-ignore lint/style/noNonNullAssertion: registered above
const netboxSchema = ajv.getSchema('urn:devicetype-library:device-type')!
// biome-ignore lint/style/noNonNullAssertion: registered above
const conexSchema = ajv.getSchema('urn:conex-device-types:conex')!

/** NetBox library slug rules, simplified to one replacement table. */
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

export function parseDefinition(text: string): Definition | null {
	const parsed = parse(text)
	return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
}

function validate(file: string, schema: typeof netboxSchema, data: unknown): string[] {
	if (schema(data)) {
		return []
	}
	return (schema.errors ?? []).map((e) => {
		const detail = e.params.allowedValues ?? e.params.additionalProperty ?? ''
		return `${file}: ${e.instancePath || '/'} ${e.message}${detail ? ` (${detail})` : ''}`
	})
}

function hasEmptyString(value: unknown): boolean {
	if (value === '') {
		return true
	}
	if (value && typeof value === 'object') {
		return Object.values(value).some(hasEmptyString)
	}
	return false
}

/** Returns every problem in one file; `slugFiles` lists all files declaring its slug. */
export function checkDefinition(file: string, text: string, slugFiles: string[]): string[] {
	const [, manufacturerDir, base] = file.split('/')
	if (!/\.ya?ml$/.test(base)) {
		return [`${file}: extension must be .yaml or .yml`]
	}
	if ([...text].some((c) => c.charCodeAt(0) > 127)) {
		return [`${file}: contains non-ASCII characters`]
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

	const pick = (keep: boolean): Definition =>
		Object.fromEntries(Object.entries(def).filter(([k]) => CONEX_KEYS.includes(k) === keep))
	const errors = [
		...validate(file, netboxSchema, pick(false)),
		...validate(file, conexSchema, pick(true)),
	]
	if (errors.length > 0) {
		return errors
	}

	if (def.manufacturer !== manufacturerDir) {
		errors.push(`${file}: manufacturer "${def.manufacturer}" does not match its directory`)
	}
	const model = slugify(def.model)
	const partNumber = slugify(def.part_number ?? '')
	if (slugFiles.length > 1) {
		errors.push(
			`${file}: slug "${def.slug}" is also used by ${slugFiles.filter((f) => f !== file).join(', ')}`,
		)
	} else if (
		!def.slug.startsWith(`${slugify(def.manufacturer)}-`) ||
		!(def.slug.endsWith(model) || (partNumber && def.slug.endsWith(partNumber)))
	) {
		errors.push(
			`${file}: slug must be "${slugify(def.manufacturer)}-${model}" (or end with the part number)`,
		)
	}
	const filename = base.replace(/\.ya?ml$/, '').toLowerCase()
	if (![model, partNumber, String(def.part_number ?? '').toLowerCase()].includes(filename)) {
		errors.push(`${file}: file name must be "${model}.yaml" (or the part number)`)
	}
	if (!Number.isInteger(def.u_height) || def.u_height > 60) {
		errors.push(`${file}: u_height must be a whole number between 0 and 60`)
	}
	const names = new Set<string>()
	for (const key of PORT_KEYS) {
		for (const { name } of (def[key] ?? []) as Definition[]) {
			if (!PORT_NAME.test(name)) {
				errors.push(
					`${file}: ${key} "${name}": at most 50 letters, digits, dot, dash, or underscore`,
				)
			}
			if (names.has(name)) {
				errors.push(`${file}: ${key} "${name}": duplicate port name`)
			}
			names.add(name)
		}
	}
	if (hasEmptyString(def)) {
		errors.push(`${file}: contains empty strings`)
	}
	return errors
}
