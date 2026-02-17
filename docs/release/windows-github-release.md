# Windows GitHub Release Runbook

This runbook describes how to build and publish the Windows installer to the current GitHub repository.

## 1. Build Locally

```bash
npm ci
npm run release:local
```

Expected output:
- Build artifacts generated
- NSIS installer `.exe` generated under `release/`
- Script uses `--config.win.signAndEditExecutable=false` to avoid local `winCodeSign` symlink extraction failures.

## 2. Create Git Tag

```bash
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version for release"
git tag v<new-version>
git push origin <branch>
git push origin v<new-version>
```

## 3. Publish GitHub Release

1. Open repository `Releases` page and create a new GitHub Release from `v<new-version>`.
2. Upload installer file from `release/*.exe`.
3. Add release notes.
4. Include warning that this is an `unsigned` installer build.

## 4. Packaging Permission Fix (Windows)

If packaging fails with a `Cannot create symbolic link` error while extracting `winCodeSign` (for example when running custom builder commands without the script flag):

1. Run terminal as Administrator and retry `npm run release:local`, or
2. Enable Windows Developer Mode, then retry.

## 5. Smoke Test Before Publish

1. Install the generated `.exe`.
2. Launch app and create thesis/version data.
3. Restart app and verify data persists.
4. Uninstall app.

## 6. Data Directory Behavior

1. 默认先尝试写入程序目录下的 `data` 文件夹（程序目录）。
2. 如果程序目录不可写，应用会自动回退到 `userData/data`（自动回退）。
3. 在侧边栏 `设置` 中可执行：
   - 选择目录
   - 恢复默认
   - 打开当前目录
