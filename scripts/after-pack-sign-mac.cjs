const { execFileSync } = require('child_process')
const path = require('path')

exports.default = async function afterPackSignMac(context) {
  if (context.electronPlatformName !== 'darwin') {
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)

  console.log(`Ad-hoc signing macOS app bundle: ${appPath}`)
  execFileSync('/usr/bin/codesign', [
    '--force',
    '--deep',
    '--sign',
    '-',
    appPath,
  ], { stdio: 'inherit' })

  execFileSync('/usr/bin/codesign', [
    '--verify',
    '--deep',
    '--strict',
    '--verbose=2',
    appPath,
  ], { stdio: 'inherit' })
}
