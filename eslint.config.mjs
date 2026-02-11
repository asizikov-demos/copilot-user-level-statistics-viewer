import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'data-utils/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
)
