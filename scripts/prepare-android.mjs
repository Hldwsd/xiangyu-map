import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const androidDir = join(root, 'src-tauri', 'gen', 'android')

if (!existsSync(androidDir)) {
  console.error('缺少 src-tauri/gen/android，请先运行：pnpm exec tauri android init --ci')
  process.exit(1)
}

// 1) Gradle 的 Rust 构建任务默认在 src-tauri 下调用 pnpm，找不到根目录的 tauri。
//    改成从当前目录逐级向上找 package.json，再以项目根为工作目录。
const buildTask = join(
  androidDir,
  'buildSrc',
  'src',
  'main',
  'java',
  'com',
  'xiangyu',
  'anhui',
  'kotlin',
  'BuildTask.kt',
)
if (existsSync(buildTask)) {
  let source = readFileSync(buildTask, 'utf8')
  if (!source.includes('!File(workDir, "package.json").exists()')) {
    source = source.replace(
      `        execOperations.exec {
            workingDir(File(projectDir, rootDirRel))
            executable(executable)`,
      `        var workDir = File(projectDir, rootDirRel)
        while (workDir.parentFile != null && !File(workDir, "package.json").exists()) {
            workDir = workDir.parentFile
        }

        execOperations.exec {
            workingDir(workDir)
            executable(executable)`,
    )
    writeFileSync(buildTask, source)
    console.log('已修正 Android Gradle Rust 任务的工作目录')
  }
}

// 2) 生成并复制 Android 图标（Tauri init 不会自动带入）
const resDir = join(androidDir, 'app', 'src', 'main', 'res')
execFileSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'tauri', 'icon', 'design/logo/derived/logo-red-solid.png', '--fit', 'contain'],
  { cwd: root, stdio: 'inherit' },
)
const iconsDir = join(root, 'src-tauri', 'icons', 'android')
if (existsSync(iconsDir)) {
  cpSync(iconsDir, resDir, { recursive: true })
  console.log('已复制 Android 图标到 res/')
}
