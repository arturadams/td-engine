# Assets

The engine resolves sprites through an asset manager. Each entity looks up an image using a
key like `assetManager.getImage(key)` and stores the returned image on the instance.

## Tower sprites

Tower images live under a `towers/` directory and use the element id in lowercase. The engine
will automatically look for a file matching the tower id:

- `towers/archer.svg`
- `towers/siege.svg`
- `towers/fire.svg`
- `towers/ice.svg`
- `towers/light.svg`
- `towers/poison.svg`
- `towers/earth.svg`
- `towers/wind.svg`
- `towers/arcane.svg`

## Creep sprites

Creep images live under a `creeps/` directory and are named after the creep type:

- `creeps/grunt.svg`
- `creeps/runner.svg`
- `creeps/tank.svg`
- `creeps/shield.svg`
- `creeps/boss.svg`

All file names are lowercase. The engine supports both `.svg` and `.png`; SVG is recommended
for clarity in this repo's sample assets. Custom assets should follow the same pattern so the
engine can load them.

Sample placeholder SVGs can be found under `docs/sample-assets/`.
