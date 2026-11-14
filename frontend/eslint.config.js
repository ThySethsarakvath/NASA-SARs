import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'

export default defineConfigWithVueTs(
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'output/**'] },
  js.configs.recommended,
  ...vue.configs['flat/essential'],
  vueTsConfigs.recommended,
  { files: ['scripts/*.mjs'], languageOptions: { globals: { Buffer: 'readonly', console: 'readonly' } } },
)
