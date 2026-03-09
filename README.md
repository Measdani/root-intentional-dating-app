# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Community Modules

This project now supports a modular community architecture (shared code, isolated sessions/logins per community area).

- Architecture guide: `docs/MODULAR_COMMUNITY_ARCHITECTURE.md`
- Auth tabs:
  - `[ Rooted Hearts ]` -> `core` pool
  - `[ Rooted Hearts LGBTQ+ ]` -> `lgbtq` pool
- Quick switch:
  - `/?community=rooted`
  - `/?community=lgbtq`

## Rooted Hearts AI Ops Docs

AI moderation and support build docs for the current five-agent scope:

- Canonical scope: `docs/ROOTED_HEARTS_AI_AGENT_SYSTEM_SPEC.md`
- Prompt pack: `docs/ROOTED_HEARTS_AGENT_PROMPT_PACK.md`
- Moderation matrix: `docs/MODERATION_POLICY_MATRIX.md`
- API contracts: `docs/AI_AGENT_API_CONTRACTS.md`
- Edge-case tests: `docs/EDGE_CASE_TEST_SCENARIOS.md`
- Admin dashboard copy: `docs/ADMIN_DASHBOARD_WIREFRAME_COPY.md`
- SQL schema migration: `supabase/migrations/20260308_rooted_hearts_ai_ops.sql`
- First message safety function setup: `docs/FIRST_MESSAGE_SAFETY_EDGE_FUNCTION_SETUP.md`
- Profile quality function setup: `docs/PROFILE_QUALITY_EDGE_FUNCTION_SETUP.md`

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
