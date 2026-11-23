/**
 * 首屏：省界地图、地标点与逐字入场的标题。
 *
 * 地图不是装饰图：70 个点是真链接，16 个市点悬停会亮出该市范围，
 * 这样「一张纸上的地图」在品牌页上也还是能用的地图。
 */
import { sites } from '@/data/sites'
import { assetUrl } from '@/utils/asset-url'

import { cityStats, featuredSites } from './data'
import {
  CITY_SHAPES,
  GEO_PROJECTION,
  PROVINCE_OUTLINE,
  RIVER_PATHS,
  WATER_PATHS,
  projectGeo,
} from './geo.generated'
import { gsap, prefersReducedMotion, qs, qsa } from './motion'

const SVG_NS = 'http://www.w3.org/2000/svg'

export interface HeroMap {
  svg: SVGSVGElement
  outline: SVGPathElement
  cityPaths: SVGPathElement[]
  siteDots: SVGAElement[]
  cityDots: SVGGElement[]
  labels: SVGTextElement[]
}

/**
 * 地名标注的偏移：数字大小不代表行政级别，只用来把字从密集处挪开。
 * [dx, dy, text-anchor]，dy 正值向下。
 */
const LABEL_OFFSETS: Record<string, [number, number, 'middle' | 'start' | 'end']> = {
  合肥市: [0, -9, 'middle'],
  芜湖市: [7, 3, 'start'],
  蚌埠市: [0, -9, 'middle'],
  淮南市: [-7, 2, 'end'],
  马鞍山市: [8, 2, 'start'],
  淮北市: [-6, -5, 'end'],
  铜陵市: [8, 3, 'start'],
  安庆市: [-7, 4, 'end'],
  黄山市: [-7, 4, 'end'],
  滁州市: [8, 2, 'start'],
  阜阳市: [-7, 2, 'end'],
  宿州市: [7, 3, 'start'],
  六安市: [-7, 3, 'end'],
  亳州市: [-7, 2, 'end'],
  池州市: [7, 4, 'start'],
  宣城市: [8, 2, 'start'],
}

function svgMarkup(): string {
  const cities = CITY_SHAPES.map(
    (city) => `<path class="map__city" data-name="${city.name}" d="${city.d}"/>`,
  ).join('')
  const waters = WATER_PATHS.map((d) => `<path class="map__water" d="${d}"/>`).join('')
  const rivers = RIVER_PATHS.map((d) => `<path class="map__river" d="${d}"/>`).join('')
  return `
    <title>安徽省地图，16 个地级市与 70 处文旅项目</title>
    <g class="map__province">
      <g class="map__cities">${cities}</g>
      <g class="map__waters">${waters}</g>
      <g class="map__rivers">${rivers}</g>
      <path class="map__outline" d="${PROVINCE_OUTLINE}"/>
    </g>
    <g class="map__city-dots"></g>
    <g class="map__labels"></g>
    <g class="map__dots"></g>
  `
}

function buildSiteDots(group: SVGGElement): SVGAElement[] {
  const featured = new Set(featuredSites.map((site) => site.id))
  const dots: SVGAElement[] = []

  for (const site of sites) {
    const [x, y] = projectGeo(site.location.lng, site.location.lat)
    const isFeatured = featured.has(site.id)
    const anchor = document.createElementNS(SVG_NS, 'a')
    anchor.setAttribute('class', `map__dot${isFeatured ? ' map__dot--featured' : ''}`)
    anchor.setAttribute('href', assetUrl(`/site/${site.id}`))
    anchor.setAttribute('aria-label', `${site.name}，${site.city}，查看详情`)
    anchor.dataset.tip = site.name
    anchor.dataset.meta = `${site.category} · ${site.city}`
    anchor.dataset.city = site.city

    const ring = document.createElementNS(SVG_NS, 'circle')
    ring.setAttribute('class', 'map__dot-ring')
    ring.setAttribute('cx', String(x))
    ring.setAttribute('cy', String(y))
    ring.setAttribute('r', isFeatured ? '6' : '4.4')

    const core = document.createElementNS(SVG_NS, 'circle')
    core.setAttribute('class', 'map__dot-core')
    core.setAttribute('cx', String(x))
    core.setAttribute('cy', String(y))
    core.setAttribute('r', isFeatured ? '2.9' : '2.2')

    anchor.append(ring, core)
    group.appendChild(anchor)
    dots.push(anchor)
  }

  return dots
}

function buildCityDots(group: SVGGElement, cityPaths: Map<string, SVGPathElement>): SVGGElement[] {
  const dots: SVGGElement[] = []

  for (const city of cityStats) {
    const shape = CITY_SHAPES.find((item) => item.name === city.name)
    if (shape === undefined) continue

    const pin = document.createElementNS(SVG_NS, 'g')
    pin.setAttribute('transform', `translate(${shape.x} ${shape.y})`)

    const dot = document.createElementNS(SVG_NS, 'g')
    dot.setAttribute('class', 'map__city-dot')
    dot.dataset.tip = city.name
    dot.dataset.meta = `${city.count} 处项目`

    const halo = document.createElementNS(SVG_NS, 'circle')
    halo.setAttribute('class', 'map__city-halo')
    halo.setAttribute('r', '4.4')

    const core = document.createElementNS(SVG_NS, 'circle')
    core.setAttribute('class', 'map__city-core')
    core.setAttribute('r', '1.35')

    dot.append(halo, core)
    pin.appendChild(dot)
    group.appendChild(pin)
    dots.push(dot)

    const path = cityPaths.get(city.name)
    if (path !== undefined) {
      dot.addEventListener('pointerenter', () => path.classList.add('map__city--active'))
      dot.addEventListener('pointerleave', () => path.classList.remove('map__city--active'))
    }
  }

  return dots
}

function buildCityLabels(group: SVGGElement): SVGTextElement[] {
  const labels: SVGTextElement[] = []

  for (const city of cityStats) {
    const shape = CITY_SHAPES.find((item) => item.name === city.name)
    if (shape === undefined) continue

    const [dx, dy, anchor] = LABEL_OFFSETS[city.name] ?? [0, -9, 'middle']
    const text = document.createElementNS(SVG_NS, 'text')
    text.setAttribute('class', `map__label${city.count < 4 ? ' map__label--minor' : ''}`)
    text.setAttribute('x', String(shape.x + dx))
    text.setAttribute('y', String(shape.y + dy))
    text.setAttribute('text-anchor', anchor)
    text.setAttribute('dominant-baseline', 'middle')
    text.textContent = city.short
    group.appendChild(text)
    labels.push(text)
  }

  return labels
}

/** 悬停说明：跟着指针走的一个小纸片，鼠标离开就收起来 */
function attachTooltip(root: HTMLElement): void {
  const tip = qs<HTMLElement>('[data-map-tip]')
  const label = document.createElement('b')
  const meta = document.createElement('span')
  tip.append(label, meta)

  const move = (event: PointerEvent): void => {
    tip.style.transform = `translate3d(${event.clientX + 16}px, ${event.clientY - 12}px, 0)`
  }

  root.addEventListener('pointerover', (event) => {
    const target = (event.target as Element | null)?.closest<SVGElement>('[data-tip]')
    if (target === null || target === undefined) return
    label.textContent = target.dataset.tip ?? ''
    meta.textContent = target.dataset.meta ?? ''
    tip.classList.add('map-tip--visible')
  })

  root.addEventListener('pointerout', (event) => {
    const target = (event.target as Element | null)?.closest<SVGElement>('[data-tip]')
    if (target === null || target === undefined) return
    tip.classList.remove('map-tip--visible')
  })

  root.addEventListener('pointermove', move)
}

export function prepareHero(): HeroMap {
  const container = qs<HTMLElement>('[data-map]')
  container.querySelector('.hero__map-fallback')?.remove()

  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${GEO_PROJECTION.width} ${GEO_PROJECTION.height}`)
  svg.setAttribute('role', 'group')
  svg.setAttribute('aria-label', '安徽省地图：16 个地级市与 70 处文旅项目')
  svg.innerHTML = svgMarkup()
  container.appendChild(svg)

  const cityPaths = new Map<string, SVGPathElement>()
  for (const path of qsa<SVGPathElement>('.map__city', svg)) {
    const name = path.dataset.name
    if (name !== undefined) cityPaths.set(name, path)
  }

  const siteDots = buildSiteDots(qs<SVGGElement>('.map__dots', svg))
  const cityDots = buildCityDots(qs<SVGGElement>('.map__city-dots', svg), cityPaths)
  const labels = buildCityLabels(qs<SVGGElement>('.map__labels', svg))
  const outline = qs<SVGPathElement>('.map__outline', svg)

  attachTooltip(container)

  if (!prefersReducedMotion) {
    gsap.set(qsa('.map__city', svg), { opacity: 0 })
    gsap.set(qsa('.map__water, .map__river', svg), { opacity: 0 })
    gsap.set([...siteDots, ...cityDots], { opacity: 0, scale: 0.2 })
    gsap.set(labels, { opacity: 0 })
  }

  return { svg, outline, cityPaths: [...cityPaths.values()], siteDots, cityDots, labels }
}

export function playHeroIntro(map: HeroMap): gsap.core.Timeline {
  const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
  if (prefersReducedMotion) return timeline

  const titleChars = qsa<HTMLElement>('.hero__title .char')
  const introItems = qsa<HTMLElement>('[data-intro]')
  const length = map.outline.getTotalLength()

  // 初始态写进时间线（而不是单独的 gsap.set）：
  // 这样 restart() 会把首屏完整地重播一遍，回到顶端时不会先闪一下最终状态。
  timeline
    .set(titleChars, { yPercent: 115, rotate: 5 })
    .set(introItems, { y: 20, opacity: 0 })
    .set('.hero__frame-line', { scaleX: 0, scaleY: 0 })
    .set('.hero__scroll', { opacity: 0 })
    .set('.hero__seal', { opacity: 0, scale: 1.45, rotate: -16 })
    .set(map.outline, { strokeDasharray: length, strokeDashoffset: length })
    .set(map.cityPaths, { opacity: 0 })
    .set('.map__water, .map__river', { opacity: 0 })
    .set([...map.siteDots, ...map.cityDots], { opacity: 0, scale: 0.2 })
    .set(map.labels, { opacity: 0 })
    .to('.hero__frame-line--top, .hero__frame-line--bottom', {
      scaleX: 1,
      duration: 1.4,
      ease: 'power2.inOut',
    })
    .to(
      '.hero__frame-line--left, .hero__frame-line--right',
      { scaleY: 1, duration: 1.4, ease: 'power2.inOut' },
      '<',
    )
    .to(map.outline, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' }, 0.15)
    .to(
      map.cityPaths,
      {
        opacity: 1,
        duration: 1.4,
        stagger: { each: 0.03, from: 'start' },
        ease: 'power1.out',
      },
      0.65,
    )
    .to('.map__water, .map__river', { opacity: 1, duration: 1.5, ease: 'power1.out' }, 1.05)
    .to(
      map.cityDots,
      { opacity: 1, scale: 1, duration: 0.6, stagger: 0.045, ease: 'back.out(2.2)' },
      1.4,
    )
    .to(map.labels, { opacity: 1, duration: 0.9, stagger: 0.03, ease: 'power1.out' }, 1.55)
    .to(
      map.siteDots,
      {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        stagger: { each: 0.012, from: 'random' },
        ease: 'back.out(2.6)',
      },
      1.6,
    )
    .to(
      titleChars,
      { yPercent: 0, rotate: 0, duration: 1.25, stagger: 0.085, ease: 'expo.out' },
      0.35,
    )
    .to(introItems, { y: 0, opacity: 1, duration: 1, stagger: 0.09, ease: 'power3.out' }, 0.8)
    .to(
      '.hero__seal',
      { opacity: 0.95, scale: 1, rotate: -7, duration: 0.85, ease: 'back.out(2)' },
      1.05,
    )
    .to('.hero__scroll', { opacity: 1, duration: 0.8 }, 1.8)

  if (!prefersReducedMotion) {
    gsap.to('.hero__scroll i', {
      scaleY: 0.4,
      opacity: 0.4,
      transformOrigin: '50% 100%',
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })

    // 精选点上一圈非常慢的金色呼吸，提示「这里可以点」
    for (const dot of map.siteDots.filter((item) =>
      item.classList.contains('map__dot--featured'),
    )) {
      const ring = dot.querySelector<SVGCircleElement>('.map__dot-ring')
      if (ring === null) continue
      // 用 r 属性而不是 scale：SVG 圆在 transform-box 下缩放会被算到画布原点，
      // 之前 6 个精选环就是因此「飞」到了地图左上角
      gsap.fromTo(
        ring,
        { opacity: 0.5, attr: { r: 4 } },
        {
          opacity: 0,
          attr: { r: 14 },
          duration: 2.8,
          repeat: -1,
          delay: 2.4,
          ease: 'power1.out',
        },
      )
    }
  }

  return timeline
}

export function initHeroScroll(): void {
  if (prefersReducedMotion) return

  gsap.to('.hero__copy', {
    yPercent: -14,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  })

  gsap.to('.hero__map-wrap', {
    yPercent: 9,
    scale: 0.95,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  })

  const media = gsap.matchMedia()
  media.add('(hover: hover) and (pointer: fine) and (min-width: 901px)', () => {
    const mapWrap = qs<HTMLElement>('.hero__map-wrap')
    const copy = qs<HTMLElement>('.hero__copy')
    const mapX = gsap.quickTo(mapWrap, 'x', { duration: 1.1, ease: 'power3.out' })
    const mapY = gsap.quickTo(mapWrap, 'y', { duration: 1.1, ease: 'power3.out' })
    const copyX = gsap.quickTo(copy, 'x', { duration: 1.3, ease: 'power3.out' })
    const copyY = gsap.quickTo(copy, 'y', { duration: 1.3, ease: 'power3.out' })

    const onMove = (event: PointerEvent): void => {
      const rx = event.clientX / window.innerWidth - 0.5
      const ry = event.clientY / window.innerHeight - 0.5
      mapX(rx * 26)
      mapY(ry * 20)
      copyX(rx * -9)
      copyY(ry * -7)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  })
}
