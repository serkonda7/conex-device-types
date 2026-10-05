# conex-device-types

Device type definitions for [conex](https://github.com/serkonda7/conex): one
YAML file per model in `device-types/<Manufacturer>/<model>.yaml`.

The format is the [NetBox devicetype-library](https://github.com/netbox-community/devicetype-library)
format, so definitions can be copied from there. Conex imports `u_height`,
`is_full_depth`, `description`, `comments`, and the port lists `interfaces`,
`ports`, `power-ports`, `power-outlets` and `display-ports`, and ignores everything else.
`console-ports` is accepted as an alias of `ports`.

```yaml
---
manufacturer: Generic
model: Example Switch 8
slug: generic-example-switch-8
u_height: 1
is_full_depth: false
interfaces:
  - name: eth1
    type: 1000base-t
power-ports:
  - name: psu1
    type: iec-60320-c14
display-ports: # conex only: hdmi, displayport, vga, dvi
  - name: hdmi1
    type: hdmi
```

Conex adds these rules on top of NetBox's:

- `u_height` must be a whole number from 0 to 60.
- Port names must be unique, with at most 50 letters, digits, space, `.`, `-`, or `_`.

## Development

```sh
bun install             # also installs the pre-commit hook
bun run check           # YAML lint, Biome, definition tests
bun run update-schema   # refresh schema/ from NetBox
```

Import into conex via Device Types → Import.

## License

[CC0 1.0](LICENSE.txt), as upstream.
