# React + TypeScript + Vite

이 템플릿은 HMR 및 일부 ESLint 규칙과 함께 Vite에서 React를 실행하는 최소 설정을 제공합니다.

현재 두 가지 공식 플러그인을 사용할 수 있습니다:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) - Fast Refresh를 위해 [Babel](https://babeljs.io/)을 사용합니다 ([rolldown-vite](https://vite.dev/guide/rolldown)에서는 [oxc](https://oxc.rs) 사용)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) - Fast Refresh를 위해 [SWC](https://swc.rs/)를 사용합니다

## React Compiler

React Compiler는 개발 및 빌드 성능에 미치는 영향으로 인해 이 템플릿에서 활성화되지 않습니다. 추가하려면 [이 문서](https://react.dev/learn/react-compiler/installation)를 참조하세요.

## ESLint 설정 확장

프로덕션 애플리케이션을 개발 중인 경우 타입 인식 린트 규칙을 활성화하도록 설정을 업데이트하는 것을 권장합니다:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // 다른 설정...

      // tseslint.configs.recommended를 제거하고 이것으로 교체합니다
      tseslint.configs.recommendedTypeChecked,
      // 또는 더 엄격한 규칙을 사용하세요
      tseslint.configs.strictTypeChecked,
      // 선택적으로 스타일 규칙을 추가할 수 있습니다
      tseslint.configs.stylisticTypeChecked,

      // 다른 설정...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // 기타 옵션...
    },
  },
])
```

React 관련 린트 규칙을 위해 [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) 및 [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom)을 설치할 수 있습니다:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // 다른 설정...
      // React 린트 규칙 활성화
      reactX.configs['recommended-typescript'],
      // React DOM 린트 규칙 활성화
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // 기타 옵션...
    },
  },
])
```
