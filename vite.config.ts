import { execFileSync } from 'node:child_process'

import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

const gitCommitHash = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
})()

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [preact()],
  define: {
    'import.meta.env.VITE_GIT_COMMIT_HASH': JSON.stringify(gitCommitHash),
  },
})
