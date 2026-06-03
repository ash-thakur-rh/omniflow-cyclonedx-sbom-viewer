import type { NextConfig } from 'next';

// When bundled in the plugin JAR, assets are served at this base path.
// During local dev (`npm run dev`), leave basePath empty by setting
// NEXT_BUILD_FOR_JAR=1 only during the production build step.
const forJar = process.env.NEXT_BUILD_FOR_JAR === '1';

const config: NextConfig = {
  transpilePackages: ['@agnistack/omniflow-ui'],
  output: 'export',
  // basePath and assetPrefix match the host's /api/v1/plugins/{id}/ui/** route.
  basePath:    forJar ? '/api/v1/plugins/cyclonedx-sbom/ui' : '',
  assetPrefix: forJar ? '/api/v1/plugins/cyclonedx-sbom/ui' : '',
  // Disable image optimization — static export doesn't support it.
  images: { unoptimized: true },
  // Disable trailing slash so /api/plugins/.../ui/index.html is served correctly.
  trailingSlash: false,
};

export default config;
