module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true
  },
  root: true,
  extends: [
    'eslint:recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    "no-unused-vars": ["error", { "args": "none" }]
  }
}
