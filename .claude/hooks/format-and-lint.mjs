import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
// Best-effort: quita espacios en blanco, formatea con Prettier y corrige con ESLint. Siempre termina con exit 0.
const PRETTIER_EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'css', 'md', 'mdx']);
const ESLINT_EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs']);
// Md/mdx se excluyen: las líneas en blanco son significativas en Markdown.
const COMPACT_EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'css']);
// Debe coincidir con .prettierignore.
const SKIP_DIRS = [
  'node_modules',
  '.next',
  'out',
  'build',
  'references',
  '.playwright-screenshots',
  'public',
];
const SKIP_FILES = ['package-lock.json'];
function compact(file) {
  const original = readFileSync(file, 'utf8');
  const compacted = original
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line !== '')
    .join('\n');
  const result = compacted ? `${compacted}\n` : '';
  if (result !== original) writeFileSync(file, result);
}
function run(cmd, args, cwd, label) {
  const result = spawnSync(cmd, args, { cwd, shell: true, encoding: 'utf8' });
  if (result.status !== 0) {
    const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    console.error(
      `[format-and-lint] ${label} falló (exit ${result.status}) en ${args.at(-1)}:\n${detail}`,
    );
  }
}
try {
  const input = JSON.parse(readFileSync(0, 'utf8').replace(/^﻿/, '') || '{}');
  const filePath = input?.tool_input?.file_path;
  const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  if (filePath) {
    const absolute = path.resolve(projectDir, filePath);
    const relative = path.relative(projectDir, absolute);
    const outside = relative.startsWith('..') || path.isAbsolute(relative);
    const skipped =
      relative.split(path.sep).some((part) => SKIP_DIRS.includes(part)) ||
      SKIP_FILES.includes(path.basename(absolute)) ||
      absolute.endsWith('.lock');
    if (!outside && !skipped && existsSync(absolute)) {
      const ext = path.extname(absolute).slice(1).toLowerCase();
      const target = `"${absolute}"`;
      if (COMPACT_EXTS.has(ext)) compact(absolute);
      if (PRETTIER_EXTS.has(ext))
        run('npx', ['prettier', '--write', target], projectDir, 'Prettier');
      if (ESLINT_EXTS.has(ext)) run('npx', ['eslint', '--fix', target], projectDir, 'ESLint');
    }
  }
} catch (error) {
  console.error(`[format-and-lint] error inesperado: ${error?.message ?? error}`);
}
process.exit(0);
