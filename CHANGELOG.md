# Changelog

All user-visible changes to SnapInsight are recorded here. Release Please
generates version entries from Conventional Commits and maintains the release
pull request before creating the corresponding Git tag.

Changelog headings use product versions without a `v` prefix. The `v` prefix
is reserved for Git tags, such as product version `0.2.7` and tag `v0.2.7`.

## [0.3.4](https://github.com/cogito0823/SnapInsight/compare/v0.3.3...v0.3.4) (2026-08-21)


### Bug Fixes

* **extension:** hide retry while model setup is required ([#10](https://github.com/cogito0823/SnapInsight/issues/10)) ([6f6f982](https://github.com/cogito0823/SnapInsight/commit/6f6f98246de108e738c9b50286f79fae490115d9))

## [0.3.3](https://github.com/cogito0823/SnapInsight/compare/v0.3.2...v0.3.3) (2026-08-21)


### Bug Fixes

* **extension:** clarify slow local model request feedback ([16a9d86](https://github.com/cogito0823/SnapInsight/commit/16a9d86c47462999bf5ba404ff32f2a188d5f9cd))
* **extension:** clarify slow local model request feedback ([536938f](https://github.com/cogito0823/SnapInsight/commit/536938f91424f03bc39df3fbcfac38fe9d24bebd))

## [0.3.2](https://github.com/cogito0823/SnapInsight/compare/v0.3.1...v0.3.2) (2026-08-20)


### Bug Fixes

* **extension:** improve on-device model setup status ([49f34a7](https://github.com/cogito0823/SnapInsight/commit/49f34a7723a4c32017e37e2e9413817df4ef7f08))

## [0.3.1](https://github.com/cogito0823/SnapInsight/compare/v0.3.0...v0.3.1) (2026-08-13)


### Bug Fixes

* **extension:** retain Prompt keeper across hidden tabs ([#5](https://github.com/cogito0823/SnapInsight/issues/5)) ([b853854](https://github.com/cogito0823/SnapInsight/commit/b8538543dbfc18efa2bea1308963eb5c7a5236c2))

## [0.3.0](https://github.com/cogito0823/SnapInsight/compare/v0.2.7...v0.3.0) (2026-08-13)


### Features

* **extension:** keep Prompt API model ready ([3b69ad1](https://github.com/cogito0823/SnapInsight/commit/3b69ad1d85175fb52420acf9daa56879f429e73a))

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
