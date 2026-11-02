# conex-device-types
Device type definitions for [conex](https://github.com/serkonda7/conex): one
YAML file per model in `device-types/<Manufacturer>/<model>.yaml`.

Definitions are validated with the rules conex imports by, from
[`@serkonda7/conex-device-schema`](https://github.com/serkonda7/conex/tree/main/packages/device-schema).
Conex ignores keys it doesn't know, but this repo refuses them. `console-ports` is accepted as an alias of `ports`.

```yaml
---
manufacturer: Generic
model: Example Switch 8
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

Differences from NetBox:
- `u_height` must be a whole number from 0 to 60.
- Port names must be unique, with at most 50 characters.
  Rear and front ports have their own namespace per side.
- `interfaces`, `rear-ports`, `front-ports`, `ports` and `console-ports` only take the
  types conex knows, listed in the package's constants; conex refuses the other NetBox types.
- `power-ports` and `power-outlets` take any type. Conex imports an unknown one as a
  generic connector, and adds the type `dc-barrel`.
- A front port needs a free position of a rear port in the same file.
- `poe_type` needs `poe_mode`.
- `default_device_role`: role preselected for devices of this type. The name must
  exist in the conex instance, or the import fails.
- `spec_url`: link to the datasheet, at most 200 characters.
- `eol_date`: last supported day, as `YYYY-MM-DD`.

This repo also checks that the manufacturer matches the directory, the file name matches the
model or part number, and a model exists once. Update the package to pick up changed conex rules.


## Development
```sh
bun install   # also installs the pre-commit hook
bun run check # YAML lint, Biome, definition tests
```

Import into conex via Device Types → Import.


## License
[CC0 1.0](LICENSE.txt).
