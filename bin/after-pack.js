// [nocturne] electron-builder afterPack hook.
// 1. Copies the V8 startup snapshot for the packaged architecture (upstream Hyper behaviour).
// 2. On macOS builds without a Developer ID certificate, applies an ad-hoc signature so the
//    arm64 binary stays launchable after electron-builder rewrites Info.plist. This is NOT a
//    substitute for Developer ID signing + notarization: Gatekeeper still treats the app as
//    coming from an unidentified developer.
const {execFileSync} = require('child_process');
const path = require('path');

const copySnapshot = require('./cp-snapshot').default;

exports.default = async (context) => {
  await copySnapshot(context);

  if (context.electronPlatformName !== 'darwin') {
    return;
  }
  if (process.env.CSC_LINK || process.env.CSC_NAME) {
    // A real identity is configured; electron-builder signs the bundle after this hook.
    return;
  }

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  console.log(`  • ad-hoc signing unsigned development build: ${appPath}`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {stdio: 'inherit'});
};
