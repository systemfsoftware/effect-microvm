# Changesets

One intent file per change to a publishable package, named by its frontmatter
(`"<pkg>": <none|patch|minor|major>`) and followed by a line for a consumer.
The Release workflow consumes the pending intents into a version PR, writes each
package's `CHANGELOG.md`, and on merge pushes the `<pkg>@vX.Y.Z` tags and
creates the GitHub Releases. Nothing is published to an npm registry; consumers
take this repository's flake outputs at a release commit.
