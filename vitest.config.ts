import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary'],
        /**
         * 规划里的门槛是「核心数据 / 工具 / 筛选逻辑 ≥ 70%」。
         * 只把这些目录纳入统计：视图与布局组件的覆盖靠人工与 E2E 保，
         * 拿它们的低覆盖去拖累核心逻辑的红线，只会让人去写没意义的用例。
         */
        include: [
          'src/utils/**/*.ts',
          'src/stores/**/*.ts',
          'src/theme/**/*.ts',
          'src/components/map/*-option.ts',
        ],
        // 当前实测 94% 行 / 85% 分支，70 的门槛留了余地：新增代码掉到 70 以下会直接失败
        thresholds: {
          statements: 70,
          branches: 70,
          functions: 70,
          lines: 70,
        },
      },
    },
  }),
)
