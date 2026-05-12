#!/usr/bin/env node
/**
 * Ensures .next/dev/server/middleware-manifest.json and .next/dev/routes-manifest.json
 * exist before/during next dev, so the dev server does not throw MODULE_NOT_FOUND
 * when handling the first request (Next 16 webpack dev does not write middleware-manifest
 * until after the first compile).
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

function ensureManifests() {
  try {
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }
    const middlewarePath = path.join(serverDir, 'middleware-manifest.json');
    if (!fs.existsSync(middlewarePath)) {
      fs.writeFileSync(middlewarePath, JSON.stringify(MINIMAL_MIDDLEWARE_MANIFEST, null, 2));
    }
    const routesPath = path.join(devDir, 'routes-manifest.json');
    if (!fs.existsSync(routesPath)) {
      fs.writeFileSync(routesPath, JSON.stringify(MINIMAL_ROUTES_MANIFEST, null, 2));
    }
  } catch {
    // ignore
  }
}

// Pre-create so they exist before next dev starts (if next dev does not wipe .next/dev)
ensureManifests();

const child = spawn('npx', ['next', 'dev', '--webpack'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' },
});

// Keep ensuring middleware-manifest exists for a while (in case next dev wipes dev dir)
let count = 0;
const interval = setInterval(() => {
  ensureManifests();
  count += 1;
  if (count > 150) clearInterval(interval); // ~30s
}, 200);

child.on('exit', (code, signal) => {
  clearInterval(interval);
  process.exit(code ?? (signal ? 1 : 0));
});
