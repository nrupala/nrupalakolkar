# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- "Built with Muse" blog at `/blog/` — field notes distilling useful patterns,
  tips, and tricks from work built with Muse (no conversational details).
  First post: fixing a Firefox-only SSL error via a one-time Cloudflare API
  token. Every post carries PayPal and Buy Me a Coffee support links.
### Added
- **Portfolio certification rollout.** New `CONTRIBUTING.md`
  documenting the PR-flow discipline (draft PR → checks green →
  owner merges; every PR adds a CHANGELOG entry under Unreleased
  and bumps the semver patch version; releases tagged `vX.Y.Z`).
  New `ATTRIBUTION.md`. Version bumped `1.0.0` → `1.0.1`. README
  deploy docs corrected to the GitHub Actions workflow.
### Changed
- Links page (`/links`) is now a three-panel layout: Pages menu on the left,
  the link cards in the center, Infrastructure subdomains on the right.
  Stacks to a single column on narrow screens.
