# Roadmap

Review-derived backlog after v0.21.3 (orthogonal connection reverse-direction fix)
and v0.22.0 (DrawboardEffect dotDark style). All items below are landed; the
file is kept as a record of what each piece touched.

## 1. Direct follow-ups to the recent releases

### A — `curved` reverse-direction overshoot ✅
`src/scene/2d/element/connectionRouter.ts` (curved branch)

The control-point offset `k = max(stub*2, dist*0.4)` previously used raw
Euclidean distance and amplified in the wrong direction when an anchor faced
away from the target, producing the orange swoop in the original bug
screenshot. The offset is now scaled per-anchor by how well its outward
direction agrees with the line toward the other endpoint (alignment in
`[-1, +1]` → factor in `[0.1, 1]`). Facing-toward keeps the original
smooth-S; facing-away pulls the control point in to a small stub instead.
Regression test pins the bezier within ~25 % of the s-e distance on each
side.

### B — orthogonal router collinear-degenerate guard ✅
`src/scene/2d/element/connectionRouter.ts` (`elbow`, same-axis non-facing
branches)

When the perpendicular-split midpoint coincided with both stub coords
(two right-pointing anchors at the same y), the route flattened to a
backtrack. The split coord now detects collinearity and steps one stub
off the line so it loops around instead. Two regression tests (horizontal +
vertical) assert the route leaves the straight axis.

### C — `DrawboardEffect` dot colors as properties ✅
`src/scene/effects/DrawboardEffect.ts`

`dotBaseColor` / `dotColor` / `dotZoomDiff` are now optional `@property`
fields. Each falls back to the light or dark preset chosen by
`checkerboardStyle`, so existing callers need no changes; consumers that
want a fully custom theme can set any subset.

## 2. Connection feature gaps

### D — arrowheads / endpoint markers ✅
`src/scene/2d/element/Element2DOutline.ts`

`outline.headEnd` / `outline.tailEnd` (`HeadEnd` / `TailEnd` from
`modern-idoc`) are surfaced on the outline. When the parent element carries
a routed local path, `Element2DOutline.draw()` fills a triangle marker at
the head / tail oriented by the path's terminal tangent. Size scales with
outline width via `LineEndSize` (`sm`/`md`/`lg`). Other `LineEndType`s
(`stealth`/`arrow`/`diamond`/`oval`) currently fall back to the triangle
shape — the data model accepts them, the renderer only differentiates
triangles for now. The `connection` playground row shows the arrowhead.

### E — obstacle-aware orthogonal routing ✅ *(endpoint-only)*
`src/scene/2d/element/connectionRouter.ts`

`ConnectionEndpoint` gains an optional `bbox`; `Element2DConnection.resolveEndpoint`
now supplies each anchor's `globalAabb`. In the perpendicular-split
branches of `elbow`, the connecting segment's mid-coord is pushed past the
union of the obstacle ranges plus a stub margin, so the cross-segment
doesn't cut through the source / target body. Only the two endpoint boxes
are considered — full obstacle-graph routing is still out of scope.

### F — auto-positioned connection label ✅ *(helper API + demo)*
`src/scene/2d/element/Element2DConnection.ts`

Added a `labelPosition` `@property` (default `0.5`) and a
`getLabelPoint()` helper that returns the world-space point at that
fraction along the current route (`Path2D.getPointAt`). Callers can anchor
a child `Element2D` (or any node) to that point; the `connection`
playground row demonstrates a small pill label following each line's
midpoint each frame. Auto-rendering a built-in label was left out — text
needs the `Element2DText` pipeline, which is heavier than the helper this
unlocks for consumers.

## 3. Engineering / tooling

### G — `pnpm lint` covers `playground` + `test` ✅
`package.json`: `lint` now runs `eslint src playground test`. Two
pre-existing antfu-rule issues surfaced (a type-only import in
`hit-test.ts`, an import sort order in `Element2DCulling.test.ts`) and
were auto-fixed during this pass.

### H — pre-release test gate ✅
`package.json`: the `release` script is now
`pnpm typecheck && pnpm lint && pnpm test --run && bumpp ...`. A red type
check, lint error, or test blocks the bump+push+tag step explicitly,
without relying on pnpm-specific npm-lifecycle behaviour.

### J — `DrawboardEffect` CPU-side tests ✅
`test/DrawboardEffect.test.ts`

Mock renderer + spied `QuadUvGeometry.draw` asserts: (1) each style
('grid'/'gridDark'/'dot'/'dotDark') maps to its shader constant, (2) light
vs dark dot presets produce different uniforms, (3) explicit dot colour
props override the preset, (4) every shader-driving property change calls
`requestRender`.

## 4. Longer-term TODO

### I — injectable WebGL2 context provider ✅ *(provider abstraction)*
`src/core/shared/dom.ts` adds `setGlContextProvider` /
`getGlContextProvider` (`GlContextProvider` type).
`WebGLRenderer._setupContext` consults the provider before falling back to
`canvas.getContext('webgl2')`, so headless consumers (`headless-gl`, etc.)
can supply a context without monkey-patching the canvas. The
`webglcontextlost` / `restored` listeners are now wired only when the
canvas actually supports `addEventListener`, so headless contexts don't
crash on hookup. End-to-end validation against a real headless GL
implementation hasn't been done in this repo — that needs the consumer's
toolchain.
