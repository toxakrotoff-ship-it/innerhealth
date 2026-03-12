#!/usr/bin/env node
/**
 * Ensures .next/dev/ and .next/dev/server/ manifest files exist before/during next dev,
 * so the dev server does not throw ENOENT when handling the first request (Next 16 webpack
 * dev does not write these manifests until after the first compile).
 * Creates: middleware-manifest, routes-manifest, prerender-manifest, next-font-manifest.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const devDir = path.join(projectRoot, '.next', 'dev');
const serverDir = path.join(devDir, 'server');

const MINIMAL_MIDDLEWARE_MANIFEST = {
  version: 3,
  middleware: {},
  functions: {},
  sortedMiddleware: [],
};

/** Minimal routes manifest so getRoutesManifest() does not throw. */
const MINIMAL_ROUTES_MANIFEST = {
  version: 3,
  pages404: true,
  appType: 'app',
  caseSensitive: false,
  basePath: '',
  redirects: [],
  headers: [],
  rewrites: { beforeFiles: [], afterFiles: [], fallback: [] },
  dynamicRoutes: [],
  staticRoutes: [],
  rsc: {
    header: 'rsc',
    varyHeader: 'rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch',
    prefetchHeader: 'next-router-prefetch',
    didPostponeHeader: 'x-nextjs-postponed',
    contentTypeHeader: 'text/x-component',
    suffix: '.rsc',
    prefetchSegmentHeader: 'next-router-segment-prefetch',
    prefetchSegmentSuffix: '.segment.rsc',
    prefetchSegmentDirSuffix: '.segments',
    clientParamParsing: false,
    dynamicRSCPrerender: false,
  },
  rewriteHeaders: {
    pathHeader: 'x-nextjs-rewritten-path',
    queryHeader: 'x-nextjs-rewritten-query',
  },
};

/** Minimal prerender manifest so dev server does not throw ENOENT. */
const MINIMAL_PRERENDER_MANIFEST = {
  version: 4,
  routes: {},
  dynamicRoutes: {},
  notFoundRoutes: [],
  preview: {
    previewModeId: '',
    previewModeSigningKey: '',
    previewModeEncryptionKey: '',
  },
};

/** Minimal font manifest so dev server does not throw ENOENT. */
const MINIMAL_NEXT_FONT_MANIFEST = {
  pages: {},
  app: {},
  appUsingSizeAdjust: false,
};

/**
 * Always (re)create .next/dev and .next/dev/server, then write all four manifest files.
 * Recreating dirs ensures we recover when Next wipes .next/dev during compile.
 */
function ensureManifests() {
  try {
    fs.mkdirSync(devDir, { recursive: true });
    fs.mkdirSync(serverDir, { recursive: true });
    fs.writeFileSync(
      path.join(serverDir, 'middleware-manifest.json'),
      JSON.stringify(MINIMAL_MIDDLEWARE_MANIFEST, null, 2)
    );
    fs.writeFileSync(
      path.join(devDir, 'routes-manifest.json'),
      JSON.stringify(MINIMAL_ROUTES_MANIFEST, null, 2)
    );
    fs.writeFileSync(
      path.join(devDir, 'prerender-manifest.json'),
      JSON.stringify(MINIMAL_PRERENDER_MANIFEST, null, 2)
    );
    fs.writeFileSync(
      path.join(serverDir, 'next-font-manifest.json'),
      JSON.stringify(MINIMAL_NEXT_FONT_MANIFEST, null, 2)
    );
  } catch (_) {
    // ignore
  }
}

// Create manifests before next dev starts
ensureManifests();

const child = spawn('npx', ['next', 'dev', '--webpack'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' },
});

// Repopulate every 30ms for 30s so manifests exist even when Next wipes .next/dev during compile
let count = 0;
const interval = setInterval(() => {
  ensureManifests();
  count += 1;
  if (count >= 1000) clearInterval(interval);
}, 30);

// Extra runs right after spawn to cover the moment Next may wipe the dir
setImmediate(ensureManifests);
setTimeout(ensureManifests, 50);
setTimeout(ensureManifests, 200);
setTimeout(ensureManifests, 500);

child.on('exit', (code, signal) => {
  clearInterval(interval);
  process.exit(code ?? (signal ? 1 : 0));
});
