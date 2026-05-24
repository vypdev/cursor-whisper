#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'src', 'presentation', 'webview');
const targetDir = path.join(__dirname, '..', 'out', 'presentation', 'webview');
const toolkitSource = path.join(
  __dirname,
  '..',
  'node_modules',
  '@vscode',
  'webview-ui-toolkit',
  'dist',
  'toolkit.min.js'
);

const extensions = ['.html', '.css'];

if (!fs.existsSync(sourceDir)) {
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const file of fs.readdirSync(sourceDir)) {
  if (extensions.some(ext => file.endsWith(ext))) {
    fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
  }
}

if (fs.existsSync(toolkitSource)) {
  fs.copyFileSync(toolkitSource, path.join(targetDir, 'toolkit.min.js'));
  console.log('Copied webview UI toolkit to out/presentation/webview');
} else {
  console.warn('Warning: @vscode/webview-ui-toolkit not found; webview controls may not render');
}

console.log('Copied webview assets to out/presentation/webview');
