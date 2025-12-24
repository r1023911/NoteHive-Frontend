<!-- Script -->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const viewport = ref(null)
const canvas = ref(null)

// cámara
let camX = 0
let camY = 0
let camS = 1

// interacciones
let dragging = false
let moved = false
let lastX = 0
let lastY = 0
let downX = 0
let downY = 0

// viewport size (CSS px)
let w = 0
let h = 0

// DPR
let dpr = 1

// hex settings (pointy-top)
const size = 48
const SQRT3 = Math.sqrt(3)

// hover
let hover = null // {q,r}

// notas
const notes = ref({}) // {"q,r": "texto"}
const openKey = ref(null)
const noteText = ref('')

function keyOf(q, r) {
  return `${q},${r}`
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

// --- Hex math (axial, pointy-top) ---
function axialToPixel(q, r) {
  const x = size * SQRT3 * (q + r / 2)
  const y = size * 1.5 * r
  return { x, y }
}

function pixelToAxial(x, y) {
  const q = ((SQRT3 / 3) * x - (1 / 3) * y) / size
  const r = ((2 / 3) * y) / size
  return axialRound(q, r)
}

function axialRound(q, r) {
  let x = q
  let z = r
  let y = -x - z

  let rx = Math.round(x)
  let ry = Math.round(y)
  let rz = Math.round(z)

  const xDiff = Math.abs(rx - x)
  const yDiff = Math.abs(ry - y)
  const zDiff = Math.abs(rz - z)

  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz
  else if (yDiff > zDiff) ry = -rx - rz
  else rz = -rx - ry

  return { q: rx, r: rz }
}

function hexCorners(cx, cy) {
  const pts = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30)
    pts.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    })
  }
  return pts
}

// --- Camera transforms ---
function screenToWorld(sx, sy) {
  return {
    x: (sx - camX) / camS,
    y: (sy - camY) / camS,
  }
}

// --- Drawing ---
function measure() {
  if (!viewport.value || !canvas.value) return

  const rect = viewport.value.getBoundingClientRect()
  w = Math.floor(rect.width)
  h = Math.floor(rect.height)

  dpr = window.devicePixelRatio || 1

  canvas.value.width = Math.floor(w * dpr)
  canvas.value.height = Math.floor(h * dpr)

  canvas.value.style.width = w + 'px'
  canvas.value.style.height = h + 'px'
}

function draw() {
  if (!canvas.value) {
    requestAnimationFrame(draw)
    return
  }

  const ctx = canvas.value.getContext('2d')

  // Reset + DPR: desde aquí, dibujamos en unidades "CSS px"
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  // fondo miel
  ctx.fillStyle = 'rgba(240,191,85,1)'
  ctx.fillRect(0, 0, w, h)

  // aplicar cámara (CLAVE)
  ctx.translate(camX, camY)
  ctx.scale(camS, camS)

  // bounds en mundo
  const minW = screenToWorld(0, 0)
  const maxW = screenToWorld(w, h)

  // estimar rango de q,r visible
  const a1 = pixelToAxial(minW.x, minW.y)
  const a2 = pixelToAxial(maxW.x, minW.y)
  const a3 = pixelToAxial(minW.x, maxW.y)
  const a4 = pixelToAxial(maxW.x, maxW.y)

  let minQ = Math.min(a1.q, a2.q, a3.q, a4.q) - 10
  let maxQ = Math.max(a1.q, a2.q, a3.q, a4.q) + 10
  let minR = Math.min(a1.r, a2.r, a3.r, a4.r) - 10
  let maxR = Math.max(a1.r, a2.r, a3.r, a4.r) + 10

  // grid
  ctx.lineWidth = 2 / camS
  ctx.strokeStyle = 'rgba(165,110,16,0.35)'

  for (let r = minR; r <= maxR; r++) {
    for (let q = minQ; q <= maxQ; q++) {
      const p = axialToPixel(q, r)
      const corners = hexCorners(p.x, p.y)

      ctx.beginPath()
      ctx.moveTo(corners[0].x, corners[0].y)
      for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y)
      ctx.closePath()
      ctx.stroke()

      // marca si hay nota
      const k = keyOf(q, r)
      if (notes.value[k] && notes.value[k].trim() !== '') {
        ctx.fillStyle = 'rgba(42,31,15,0.55)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4 / camS, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // hover
  if (hover) {
    const p = axialToPixel(hover.q, hover.r)
    const corners = hexCorners(p.x, p.y)

    ctx.fillStyle = 'rgba(201,137,30,0.22)'
    ctx.strokeStyle = 'rgba(165,110,16,0.9)'
    ctx.lineWidth = 3 / camS

    ctx.beginPath()
    ctx.moveTo(corners[0].x, corners[0].y)
    for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  requestAnimationFrame(draw)
}

// --- Events ---
function onMouseDown(e) {
  dragging = true
  moved = false
  lastX = e.clientX
  lastY = e.clientY
  downX = e.clientX
  downY = e.clientY
}

function onMouseMove(e) {
  if (!viewport.value) return

  // hover hex (si no está abierta la nota)
  if (!openKey.value) {
    const rect = viewport.value.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const wpos = screenToWorld(sx, sy)
    hover = pixelToAxial(wpos.x, wpos.y)
  }

  if (!dragging) return

  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY

  if (Math.abs(e.clientX - downX) > 6 || Math.abs(e.clientY - downY) > 6) moved = true

  camX += dx
  camY += dy
}

function onMouseUp() {
  dragging = false
}

function onWheel(e) {
  if (!viewport.value || openKey.value) return
  e.preventDefault()

  const rect = viewport.value.getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top

  const oldS = camS
  const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08

  // min zoom out, max 1 (vista inicial)
  const newS = clamp(oldS * factor, 0.6, 1)

  const worldX = (sx - camX) / oldS
  const worldY = (sy - camY) / oldS

  camS = newS
  camX = sx - worldX * newS
  camY = sy - worldY * newS
}

function onDblClick(e) {
  if (!viewport.value || openKey.value) return
  if (moved) return

  const rect = viewport.value.getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top

  const wpos = screenToWorld(sx, sy)
  const a = pixelToAxial(wpos.x, wpos.y)
  const k = keyOf(a.q, a.r)

  openKey.value = k
  noteText.value = notes.value[k] || ''
}

function resetView() {
  camX = 0
  camY = 0
  camS = 1
}

function saveAndClose() {
  if (openKey.value) notes.value[openKey.value] = noteText.value
  openKey.value = null
  noteText.value = ''
  measure()
}

function backWithoutSave() {
  openKey.value = null
  noteText.value = ''
  measure()
}

onMounted(() => {
  measure()
  draw()

  window.addEventListener('resize', measure)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('resize', measure)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<!-- Template -->
<template>
  <div ref="viewport" class="viewport">
    <!-- NOTE VIEW (hide/show, do not unmount canvas) -->
    <div v-show="openKey" class="note-view">
      <div class="note-top">
        <div class="note-title">Note @ {{ openKey }}</div>
        <div class="note-actions">
          <button class="btn" @click="saveAndClose">Save</button>
          <button class="btn ghost" @click="backWithoutSave">Back</button>
        </div>
      </div>

      <textarea
        v-model="noteText"
        class="note-editor"
        placeholder="Write anything..."
      />
    </div>

    <!-- GRAPH VIEW (hide/show, keep mounted) -->
    <div
      v-show="!openKey"
      class="graph-view"
      @mousedown="onMouseDown"
      @wheel="onWheel"
      @dblclick="onDblClick"
    >
      <div class="controls">
        <button class="btn" @click="resetView">Reset</button>
        <div class="hint">Drag · Wheel zoom (max 1) · Double click hex</div>
      </div>

      <canvas ref="canvas" class="canvas"></canvas>
    </div>
  </div>
</template>

<!-- Style -->
<style scoped>
.viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.graph-view {
  width: 100%;
  height: 100%;
  position: relative;
  cursor: grab;
}

.graph-view:active {
  cursor: grabbing;
}

.canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.controls {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  z-index: 3;
  user-select: none;
}

.hint {
  font-size: 14px;
  opacity: 0.85;
  color: #2a1f0f;
}

.btn {
  border: 3px solid #a56e10;
  background: #e1a93a;
  padding: 6px 10px;
  border-radius: 12px;
  cursor: pointer;
  color: #2a1f0f;
  font-weight: 800;
}

.btn.ghost {
  background: transparent;
}

/* Note view */
.note-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(240,191,85,1);
}

.note-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 3px solid rgba(165, 110, 16, 0.7);
}

.note-title {
  font-weight: 900;
  font-size: 18px;
  color: #2a1f0f;
}

.note-actions {
  display: flex;
  gap: 10px;
}

.note-editor {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  padding: 16px;
  font-size: 18px;
  line-height: 1.4;
  background: rgba(242, 211, 138, 0.75);
  color: #2a1f0f;
}
</style>
