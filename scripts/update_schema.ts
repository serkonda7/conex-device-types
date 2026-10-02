/** Refreshes the vendored schemas from NetBox's latest release and devicetype-library master. */
const release = (await (
	await fetch('https://api.github.com/repos/netbox-community/netbox/releases/latest')
).json()) as { tag_name: string }
const sources: Record<string, string> = {
	'generated_schema.json': `https://raw.githubusercontent.com/netbox-community/netbox/${release.tag_name}/contrib/generated_schema.json`,
}
for (const name of ['devicetype.json', 'components.json', 'reusable.json']) {
	sources[name] =
		`https://raw.githubusercontent.com/netbox-community/devicetype-library/master/schema/${name}`
}
for (const [name, url] of Object.entries(sources)) {
	const res = await fetch(url)
	if (!res.ok) {
		throw new Error(`GET ${url}: ${res.status}`)
	}
	await Bun.write(`schema/${name}`, await res.text())
}
console.log(`Schemas updated (NetBox ${release.tag_name}); review with git diff.`)

export {}
