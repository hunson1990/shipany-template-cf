import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
 baseDirectory: __dirname,
});

const config = [
 {
 ignores: [
 'node_modules/**',
 '.next/**',
 '**/.next/**',
 '.open-next/**',
 '**/.open-next/**',
 '.source/**',
 '**/.source/**',
 'next-env.d.ts',
 ],
 },
 {
 linterOptions: {
 reportUnusedDisableDirectives: 'off',
 },
 },
 ...compat.extends('next/core-web-vitals', 'next/typescript'),
 {
 rules: {
 '@typescript-eslint/no-explicit-any': 'off',
 '@typescript-eslint/triple-slash-reference': 'off',
 '@typescript-eslint/no-empty-object-type': 'off',
 '@typescript-eslint/ban-ts-comment': 'off',
 '@typescript-eslint/no-unused-vars': 'off',
 '@next/next/no-assign-module-variable': 'off',
 '@next/next/no-img-element': 'off',
 'react-hooks/rules-of-hooks': 'off',
 'react-hooks/exhaustive-deps': 'off',
 'react/display-name': 'off',
 'jsx-a11y/alt-text': 'off',
 'prefer-const': 'off',
 },
 },
];

export default config;

