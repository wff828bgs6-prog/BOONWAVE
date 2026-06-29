# BOONWAVE Production Bootstrap Migration

## Active entry

`index.html` loads only the modular `app.js` runtime.

Runtime chain:

`index.html → app.js → bootstrap/boonwave-bootstrap.js`

The bootstrap owns one instance of each interactive system:

- `TypedWorkspaceController`;
- `TransactionalNodeController`;
- `LinkController`;
- `ZoomController`.

The old monolithic `boonwave.v8.js` is not loaded by `index.html`.

## Legacy rollback

The unchanged v8 build remains available through `legacy-v8.html`.

Rollback keeps access to:

- legacy metadata in `localStorage` keys `bw8_data_*`;
- active legacy session key `bw8_session`;
- legacy media in IndexedDB database `boonwave-media-v8`.

Do not delete these legacy stores until migration has been verified on real user data and a separate backup/export exists.

## Automatic migration

On Web startup, when the canonical workspace is empty, BOONWAVE:

1. locates the active v8 snapshot, or the newest compatible snapshot;
2. reads compatible media blobs from `boonwave-media-v8`;
3. converts five supported node types and v8 `from/to` links;
4. writes cards, links, media metadata, blobs and migration marker in one IndexedDB transaction;
5. leaves all legacy storage untouched.

Migration never overlays a non-empty canonical workspace.

Marker key: `legacy-v8-migration`.

## Failure behavior

If conversion or persistence fails:

- the canonical import transaction is aborted;
- no partial migration marker is written;
- old v8 storage remains unchanged;
- the startup screen exposes the `Legacy v8` fallback link.

## Verification

CI covers:

- public entry does not reference `boonwave.v8.js`;
- rollback entry still references the unchanged v8 assets;
- preview delegates to the same `app.js` runtime and contains no demo seeding;
- legacy conversion of nodes, view modes, links and media ownership;
- non-destructive source behavior;
- atomic IndexedDB rollback and successful commit;
- modular import graph and architecture boundaries.

## Remaining device checks

Before merging to `main`, verify on iPhone Safari:

- opening an existing v8 session;
- migrated card and link count;
- legacy images and documents where available;
- create/edit/delete after migration;
- reload and offline restart;
- explicit opening of `legacy-v8.html`;
- PWA update behavior with the new service-worker cache.
