# Windows Release Checklist

## Pre-Release

- [ ] `npm ci` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] `npm run release:local` generates installer in `release/`
- [ ] Installer can install, launch, and uninstall
- [ ] Core flow smoke test passes (create thesis, add version, edit/delete, open file)
- [ ] Data persists after restart

## GitHub Release

- [ ] `package.json` version updated
- [ ] Git tag `vX.Y.Z` created and pushed
- [ ] GitHub Release created from same tag
- [ ] Installer `.exe` uploaded
- [ ] Release notes mention this is an unsigned build

## Post-Release

- [ ] Download installer from GitHub Releases and install on a clean machine/user profile
- [ ] Record release metadata below

### Release Record

- Version:
- Tag:
- Release URL:
- Build Date:
- Notes:
