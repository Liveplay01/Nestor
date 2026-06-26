import React, { useEffect, useRef, useId } from 'react'

interface Props {
  size?: number
  className?: string
}

// Pre-computed paths from Nest Logo.svg with stroke data
const PATHS = [
  { d: 'M 318.3 111.7 Q 349.5 190.8 340.4 275.3', color: '#b5763f', w: 6.88 },
  { d: 'M 334.3 182.8 Q 326.0 259.2 298.1 330.9', color: '#a4632f', w: 7.94 },
  { d: 'M 326.4 314.9 Q 253.0 352.2 170.7 351.4', color: '#c98a51', w: 6.32 },
  { d: 'M 282.5 344.0 Q 194.3 314.9 101.8 322.4', color: '#8f5326', w: 7.19 },
  { d: 'M 202.3 335.6 Q 116.3 318.1 47.9 263.0',  color: '#bb8050', w: 6.44 },
  { d: 'M 83.5 301.1 Q 34.2 237.5 31.4 157.0',    color: '#9c5e2c', w: 7.04 },
  { d: 'M 57.3 262.3 Q 73.3 177.8 76.3 91.8',     color: '#b5763f', w: 7.86 },
  { d: 'M 25.2 148.4 Q 118.7 121.0 186.7 51.2',   color: '#a4632f', w: 7.5  },
  { d: 'M 85.8 83.7 Q 165.6 47.9 252.4 36.4',     color: '#c98a51', w: 7.05 },
  { d: 'M 179.3 56.4 Q 274.4 62.7 355.4 113.0',   color: '#8f5326', w: 7.55 },
  { d: 'M 260.1 56.5 Q 303.3 136.9 379.9 186.5',  color: '#bb8050', w: 6.96 },
  { d: 'M 335.8 177.5 Q 347.5 233.5 330.2 287.9', color: '#c98a51', w: 4.98 },
  { d: 'M 316.7 192.7 Q 286.8 251.8 275.4 317.0', color: '#8f5326', w: 5.88 },
  { d: 'M 282.1 280.2 Q 237.6 325.0 175.1 334.4', color: '#bb8050', w: 4.65 },
  { d: 'M 250.7 295.2 Q 193.8 304.0 136.3 305.6', color: '#9c5e2c', w: 5.53 },
  { d: 'M 215.8 342.5 Q 156.5 332.8 127.0 280.5', color: '#b5763f', w: 4.4  },
  { d: 'M 156.9 318.7 Q 118.8 255.8 54.0 221.2',  color: '#a4632f', w: 5.47 },
  { d: 'M 122.6 268.9 Q 73.6 226.4 66.5 161.9',   color: '#c98a51', w: 4.51 },
  { d: 'M 103.5 235.9 Q 99.0 178.2 83.3 122.4',   color: '#8f5326', w: 5.35 },
  { d: 'M 44.6 171.0 Q 98.2 143.5 133.0 94.2',    color: '#bb8050', w: 5.41 },
  { d: 'M 121.7 112.7 Q 158.3 66.0 206.3 31.0',   color: '#9c5e2c', w: 4.61 },
  { d: 'M 119.3 89.4 Q 179.2 104.2 235.3 78.5',   color: '#b5763f', w: 5.22 },
  { d: 'M 192.4 57.1 Q 264.4 85.2 311.8 146.1',   color: '#a4632f', w: 4.76 },
  { d: 'M 239.0 90.8 Q 298.4 97.8 336.8 143.7',   color: '#c98a51', w: 5.26 },
  { d: 'M 307.4 105.5 Q 340.1 173.4 346.8 248.5', color: '#8f5326', w: 5.72 },
  { d: 'M 299.3 147.9 Q 294.5 212.4 331.4 265.5', color: '#bb8050', w: 4.83 },
  { d: 'M 298.3 193.4 Q 269.2 242.2 288.8 295.6', color: '#9c5e2c', w: 3.91 },
  { d: 'M 255.4 252.1 Q 225.2 300.0 175.7 327.4', color: '#b5763f', w: 4.23 },
  { d: 'M 244.3 290.6 Q 195.5 287.8 151.7 309.8', color: '#a4632f', w: 4.19 },
  { d: 'M 158.8 285.8 Q 142.4 239.0 98.7 215.6',  color: '#c98a51', w: 3.75 },
  { d: 'M 158.1 264.2 Q 112.7 238.2 80.3 197.2',  color: '#8f5326', w: 4.35 },
  { d: 'M 67.7 262.5 Q 104.5 217.4 108.7 159.4',  color: '#bb8050', w: 4.22 },
  { d: 'M 107.3 202.0 Q 130.9 142.6 152.7 82.5',  color: '#9c5e2c', w: 4.19 },
  { d: 'M 102.0 131.7 Q 154.5 122.4 205.3 106.4', color: '#b5763f', w: 4.86 },
  { d: 'M 171.3 110.8 Q 219.3 121.7 264.4 102.0', color: '#a4632f', w: 4.13 },
  { d: 'M 265.1 76.6 Q 292.8 131.0 302.1 191.3',  color: '#c98a51', w: 4.58 },
  { d: 'M 278.0 112.0 Q 296.3 159.5 342.7 180.5', color: '#8f5326', w: 4.01 },
  { d: 'M 247.7 114.4 Q 251.8 158.6 285.4 187.6', color: '#a4632f', w: 3.71 },
  { d: 'M 236.1 307.0 Q 209.3 270.8 166.3 256.9', color: '#c98a51', w: 3.44 },
  { d: 'M 212.4 133.7 Q 252.8 140.1 291.5 153.1', color: '#8f5326', w: 3.54 },
  { d: 'M 248.7 85.3 Q 282.2 120.7 292.4 168.2',  color: '#bb8050', w: 3.47 },
  { d: 'M 189.2 286.1 Q 161.9 278.1 135.4 268.1', color: '#9c5e2c', w: 3.37 },
  { d: 'M 258.7 272.1 Q 218.5 260.5 179.2 274.7', color: '#b5763f', w: 2.37 },
  { d: 'M 229.3 102.7 Q 249.0 138.9 288.5 150.1', color: '#a4632f', w: 3.44 },
  { d: 'M 239.4 284.8 Q 209.2 280.3 178.6 280.2', color: '#c98a51', w: 2.88 },
  { d: 'M 192.9 75.5 Q 219.4 113.4 252.5 145.6',  color: '#8f5326', w: 3.11 },
  { d: 'M 173.5 295.4 Q 156.8 272.7 139.6 250.5', color: '#bb8050', w: 3.73 },
  { d: 'M 213.6 75.1 Q 243.0 95.3 251.9 129.7',   color: '#9c5e2c', w: 2.69 },
  { d: 'M 278.8 189.2 Q 300.4 207.4 313.9 232.2', color: '#b5763f', w: 2.33 },
  { d: 'M 125.9 254.2 Q 144.7 215.1 133.5 173.2', color: '#a4632f', w: 3.11 },
  { d: 'M 211.0 131.2 Q 248.7 113.6 290.0 117.6', color: '#c98a51', w: 2.33 },
  { d: 'M 183.6 129.7 Q 211.6 114.4 241.7 125.1', color: '#8f5326', w: 3.73 },
  { d: 'M 273.0 116.1 Q 265.0 163.4 254.7 210.3', color: '#bb8050', w: 3.34 },
]

export default function NestorAnimation({ size = 64, className }: Props): React.JSX.Element {
  const id = useId()
  const styleId = `nest-anim-${id.replace(/:/g, '')}`
  const gradId = `nestGrad-${id.replace(/:/g, '')}`
  const pathRefs = useRef<(SVGPathElement | null)[]>([])

  useEffect(() => {
    const paths = pathRefs.current
    const n = paths.length

    // Measure actual path lengths, fall back to 300 if not available
    const lengths = paths.map((el) => {
      try { return Math.ceil((el?.getTotalLength() ?? 300) * 1.05) + 10 }
      catch { return 300 }
    })

    let css = `@keyframes nestCup{0%{opacity:0}30%{opacity:0}68%{opacity:1}88%{opacity:1}96%{opacity:0}100%{opacity:0}}\n`
    lengths.forEach((L, i) => {
      const start = (0.05 + 0.60 * (i / (n - 1))).toFixed(3)
      const end = Math.min(+start + 0.09, 0.74).toFixed(3)
      const s = (+start * 100).toFixed(1)
      const e = (+end * 100).toFixed(1)
      css += `@keyframes nestDraw${styleId}${i}{` +
        `0%{stroke-dashoffset:${L};opacity:0}` +
        `3%{stroke-dashoffset:${L};opacity:1}` +
        `${s}%{stroke-dashoffset:${L}}` +
        `${e}%{stroke-dashoffset:0}` +
        `88%{stroke-dashoffset:0;opacity:1}` +
        `96%{stroke-dashoffset:0;opacity:0}` +
        `100%{stroke-dashoffset:0;opacity:0}}\n`
    })

    let tag = document.getElementById(styleId)
    if (!tag) { tag = document.createElement('style'); tag.id = styleId; document.head.appendChild(tag) }
    tag.textContent = css

    // Apply animation to path elements
    paths.forEach((el, i) => {
      if (!el) return
      const L = lengths[i]
      el.style.strokeDasharray = String(L)
      el.style.strokeDashoffset = String(L)
      el.style.animation = `nestDraw${styleId}${i} 5s ease-in-out infinite`
    })

    return () => { document.getElementById(styleId)?.remove() }
  }, [styleId])

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(74,45,20,0.30)" />
          <stop offset="55%" stopColor="rgba(74,45,20,0.14)" />
          <stop offset="100%" stopColor="rgba(74,45,20,0)" />
        </radialGradient>
      </defs>
      <ellipse
        cx="200" cy="206" rx="78" ry="62"
        fill={`url(#${gradId})`}
        style={{ animation: `nestCup 5s ease-in-out infinite`, opacity: 0 }}
      />
      {PATHS.map((p, i) => (
        <path
          key={i}
          ref={(el) => { pathRefs.current[i] = el }}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth={p.w}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
