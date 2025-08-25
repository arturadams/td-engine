# Sprite naming convention

The canvas renderer can automatically load images for creeps and towers when a
`spritePath` (default `sprites/`) is available.  Image files are resolved by
lower-casing the entity id and appending `.svg`.

Examples:

- a creep of type `Runner` → `sprites/runner.svg`
- a tower of element `FIRE` → `sprites/fire.svg`

If a matching file cannot be found, the renderer falls back to
`creep.svg` or `tower.svg` in the same directory.

Custom `img` properties on entities still take precedence and can point to any
image.
