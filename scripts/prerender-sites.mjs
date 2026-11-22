import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createServer } from 'vite'

const root = process.cwd()
const distDir = path.join(root, 'dist')
const templatePath = path.join(distDir, 'index.html')

if (!existsSync(templatePath)) {
  console.error('dist/index.html 不存在，先跑 pnpm build-only')
  process.exit(1)
}

const siteUrl = `${(process.env.SITE_URL ?? 'http://localhost:4173/').replace(/\/+$/, '')}/`
const absoluteAsset = (assetPath) => `${siteUrl}${assetPath.replace(/^\/+/, '')}`
const ogImage = absoluteAsset('/og-cover.jpg')
const template = await readFile(templatePath, 'utf8')

const vite = await createServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

let sites
try {
  ;({ sites } = await vite.ssrLoadModule('/src/data/sites.ts'))
} finally {
  await vite.close()
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function jsonLdScript(data) {
  const json = JSON.stringify(data).replaceAll('<', '\\u003c')
  return `    <script type="application/ld+json">${json}</script>`
}

function metaBlock({ title, description, url, type, image, imageAlt, jsonLd }) {
  return [
    '    <!-- prerender:meta:start -->',
    `    <link rel="canonical" href="${escapeHtml(url)}" />`,
    `    <meta property="og:type" content="${type}" />`,
    '    <meta property="og:site_name" content="乡遇安徽" />',
    `    <meta property="og:title" content="${escapeHtml(title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(description)}" />`,
    `    <meta property="og:url" content="${escapeHtml(url)}" />`,
    `    <meta property="og:image" content="${escapeHtml(image)}" />`,
    '    <meta property="og:image:type" content="image/jpeg" />',
    '    <meta property="og:image:width" content="1200" />',
    '    <meta property="og:image:height" content="630" />',
    `    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
    '    <meta name="twitter:card" content="summary_large_image" />',
    `    <meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `    <meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`,
    jsonLdScript(jsonLd),
    '    <!-- prerender:meta:end -->',
  ].join('\n')
}

function applyMeta(html, meta) {
  let next = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
  next = next.replace(
    /<meta\s+name="description"[\s\S]*?>/,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
  )
  next = next.replace(/\s*<!-- prerender:meta:start -->[\s\S]*?<!-- prerender:meta:end -->\n?/g, '')
  return next.replace('</head>', `${metaBlock(meta)}\n  </head>`)
}

const homeTitle = '乡遇安徽 · 在地图上发现安徽文旅项目'
const homeDescription = `在安徽省地图上浏览 ${sites.length} 个古镇、非遗、红色、自然、演艺、乡村与场馆项目，按 16 个地级市划分。`
const homeMeta = {
  title: homeTitle,
  description: homeDescription,
  url: siteUrl,
  type: 'website',
  image: ogImage,
  imageAlt: '乡遇安徽：在地图上发现安徽文旅项目',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '乡遇安徽',
    url: siteUrl,
    description: homeDescription,
    inLanguage: 'zh-CN',
  },
}

await writeFile(templatePath, applyMeta(template, homeMeta), 'utf8')

let count = 0
for (const site of sites) {
  const url = `${siteUrl}site/${site.id}/`
  const title = `${site.name} · 乡遇安徽`
  const imagePath = site.shareImage ?? '/og-cover.jpg'
  if (!existsSync(path.join(distDir, imagePath.replace(/^\/+/, '')))) {
    throw new Error(`${site.id}: shareImage 文件不存在：${imagePath}`)
  }
  const image = absoluteAsset(imagePath)
  const meta = {
    title,
    description: site.summary,
    url,
    type: 'article',
    image,
    imageAlt: `${site.name} · ${site.city} · 乡遇安徽`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TouristAttraction',
      name: site.name,
      description: site.summary,
      image,
      url,
      address: {
        '@type': 'PostalAddress',
        addressRegion: site.province,
        addressLocality: site.city,
        addressCountry: 'CN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: site.location.lat,
        longitude: site.location.lng,
      },
    },
  }

  const outDir = path.join(distDir, 'site', site.id)
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'index.html'), applyMeta(template, meta), 'utf8')
  count += 1
}

console.log(`pre-rendered ${count} detail pages + home (${siteUrl})`)
