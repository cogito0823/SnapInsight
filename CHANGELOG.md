# Changelog

All user-visible changes to SnapInsight are recorded here. Release Please
generates version entries from Conventional Commits and maintains the release
pull request before creating the corresponding Git tag.

Changelog headings use product versions without a `v` prefix. The `v` prefix
is reserved for Git tags, such as product version `0.2.7` and tag `v0.2.7`.

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

[0.2.7]: https://github.com/cogito0823/SnapInsight/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/cogito0823/SnapInsight/releases/tag/v0.2.6
