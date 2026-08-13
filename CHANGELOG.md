# Changelog

All user-visible changes to SnapInsight are recorded here. Release entries are
finalized in the release pull request before the corresponding Git tag is
created.

Changelog headings use product versions without a `v` prefix. The `v` prefix
is reserved for Git tags, such as product version `0.2.7` and tag `v0.2.7`.

## [Unreleased]

### Added

- Added privacy-safe local timing for Prompt API readiness, session setup,
  cloning, first-token latency, and completion.
- Added explicit startup, first-token, and stalled-stream timeouts with clearer
  progressive loading feedback.
- Added an explicit cancel action for generation that has produced no visible
  output after an extended wait.

### Changed

- Reused a page-scoped keeper/template session and isolated cloned request
  sessions to reduce repeated Prompt API initialization during continuous use.
- Warmed the model only after a stable valid selection, with single-flight
  creation and automatic cleanup for unused warm-up, hidden, navigated, or
  closed pages.
- Kept a used keeper alive while its document is visible, added a five-minute
  hidden-page grace period, and retained the keeper while creating independent
  request sessions on Chrome implementations without session cloning.
- Added bounded readiness caching, quota backoff, and late-session cleanup for
  browser implementations that resolve session creation after cancellation.

## [0.2.7] - 2026-08-13

### Added

- Added CI for pull requests and pushes to `main`, including clean dependency
  installation, type checking, automated tests, production builds, and build
  artifacts.
- Added tag-driven GitHub Releases with version validation, extension ZIP
  packaging, SHA-256 generation, and release-asset uploads.

### Changed

- Made the build dependency lock reproducible across local macOS development
  and GitHub's Linux runners.

## [0.2.6] - 2026-08-13

### Added

- Added English and Simplified Chinese extension UI localization.
- Made generated explanations follow the Chrome UI language.

### Changed

- Kept explanation cards inside the viewport by placing them above or below
  the selection according to available space.
- Made card width responsive and recalculated card layout after window resize.

[Unreleased]: https://github.com/cogito0823/SnapInsight/compare/v0.2.7...HEAD
[0.2.7]: https://github.com/cogito0823/SnapInsight/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/cogito0823/SnapInsight/releases/tag/v0.2.6
