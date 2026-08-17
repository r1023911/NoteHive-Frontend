<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import NoteEditor from '@/components/NoteEditor.vue'
import { pendingPlacement } from '@/pendingPlacement'

const props = defineProps({
  activeVaultId: {
    type: Number,
    default: null
  }
})

const viewport = ref(null)
const canvas = ref(null)

let camX = 0
let camY = 0
let camS = 1

let dragging = false
let moved = false
let lastX = 0
let lastY = 0
let downX = 0
let downY = 0

let w = 0
let h = 0
let dpr = 1

const size = 48
const SQRT3 = Math.sqrt(3)

let hover = null

const hexColors = ref({
  background: 'rgba(240,191,85,1)',
  emptyStroke: 'rgba(165,110,16,0.35)',
  occupiedFill: '#FF7A1A',
  occupiedStroke: 'rgba(42,31,15,0.85)',
  text: 'rgba(42,31,15,0.95)',
  hoverFill: 'rgba(201,137,30,0.22)',
  hoverStroke: 'rgba(165,110,16,0.9)'
})

const notesByHex = ref({})
const notesList = ref([])
const openKey = ref(null)

const noteTitle = ref('')
const noteText = ref('')
const noteColor = ref('#FF7A1A')
const openNoteId = ref(null)

const placingNote = ref(null)

watch(
  pendingPlacement,
  (val) => {
    if (val) {
      placingNote.value = val
      pendingPlacement.value = null
    }
  },
  { immediate: true }
)

const vaultId = computed(() => Number(props.activeVaultId || 0))
const canSave = computed(() => noteTitle.value.trim().length > 0)

const ownerId = computed(() => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null")
    return Number(u?.id || 0)
  } catch {
    return 0
  }
})


function keyOf(q, r) {
  return `${q},${r}`
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

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

function screenToWorld(sx, sy) {
  return {
    x: (sx - camX) / camS,
    y: (sy - camY) / camS,
  }
}

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

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  ctx.fillStyle = hexColors.value.background
  ctx.fillRect(0, 0, w, h)

  ctx.translate(camX, camY)
  ctx.scale(camS, camS)

  const minW = screenToWorld(0, 0)
  const maxW = screenToWorld(w, h)

  const a1 = pixelToAxial(minW.x, minW.y)
  const a2 = pixelToAxial(maxW.x, minW.y)
  const a3 = pixelToAxial(minW.x, maxW.y)
  const a4 = pixelToAxial(maxW.x, maxW.y)

  let minQ = Math.min(a1.q, a2.q, a3.q, a4.q) - 10
  let maxQ = Math.max(a1.q, a2.q, a3.q, a4.q) + 10
  let minR = Math.min(a1.r, a2.r, a3.r, a4.r) - 10
  let maxR = Math.max(a1.r, a2.r, a3.r, a4.r) + 10

  ctx.lineWidth = 2 / camS
  ctx.strokeStyle = hexColors.value.emptyStroke

  for (let r = minR; r <= maxR; r++) {
  for (let q = minQ; q <= maxQ; q++) {
    const p = axialToPixel(q, r)
    const corners = hexCorners(p.x, p.y)

    ctx.beginPath()
    ctx.moveTo(corners[0].x, corners[0].y)
    for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y)
    ctx.closePath()

    const k = keyOf(q, r)
    const n = notesByHex.value[k]
    const occupied =
      n && ((n.title && n.title.trim() !== "") || (n.content && n.content.trim() !== ""))

    if (occupied) {
      ctx.fillStyle = n.color || hexColors.value.occupiedFill
      ctx.fill()

      ctx.save()
      ctx.strokeStyle = hexColors.value.occupiedStroke
      ctx.lineWidth = 3 / camS
      ctx.stroke()
      ctx.restore()

      if (camS >= 0.98) {
        const rawTitle = (n.title || "").trim()
        if (rawTitle) {
          const title = rawTitle.length > 14 ? rawTitle.slice(0, 14) + "…" : rawTitle
          ctx.save()
          ctx.fillStyle = hexColors.value.text
          ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(title, p.x, p.y)

          ctx.restore()
        }
      }
    } else {
      ctx.stroke()
    }
  }
}


  if (hover) {
    const p = axialToPixel(hover.q, hover.r)
    const corners = hexCorners(p.x, p.y)

    ctx.fillStyle = hexColors.value.hoverFill
    ctx.strokeStyle = hexColors.value.hoverStroke
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

function onMouseUp(e) {
  dragging = false

  if (placingNote.value && !moved && !openKey.value && viewport.value) {
    const rect = viewport.value.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    if (sx >= 0 && sy >= 0 && sx <= rect.width && sy <= rect.height) {
      const wpos = screenToWorld(sx, sy)
      const a = pixelToAxial(wpos.x, wpos.y)
      placeSharedNoteAt(a.q, a.r)
    }
  }
}

async function placeSharedNoteAt(q, r) {
  if (!placingNote.value) return

  const token = localStorage.getItem("token") || ""
  if (!token) {
    alert("Missing token. Login again.")
    return
  }

  if (!vaultId.value) {
    alert("No vault selected.")
    return
  }

  if (!ownerId.value) {
    alert("Missing ownerId (user not loaded). Login again.")
    return
  }

  const k = keyOf(q, r)
  if (notesByHex.value[k]) {
    alert("That cell already has a note. Pick an empty one.")
    return
  }

  const payload = {
    title: placingNote.value.title || "Untitled",
    content: placingNote.value.content || "",
    color: placingNote.value.color || undefined,
    ownerId: ownerId.value,
    vaultId: vaultId.value,
    hexKey: k
  }

  try {
    const res = await fetch("http://localhost:3000/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify(payload)
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      alert(data?.error || "Failed to place note")
      return
    }

    const shareId = placingNote.value.shareId
    placingNote.value = null
    await fetchNotes()
    window.dispatchEvent(new Event("notes-changed"))

    if (shareId) {
      try {
        await fetch(`http://localhost:3000/shares/${shareId}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + token }
        })
        window.dispatchEvent(new Event("inbox-changed"))
      } catch {
        // placement already succeeded; inbox cleanup failure is non-fatal
      }
    }
  } catch (err) {
    alert("Network/server error")
  }
}

function cancelPlacing() {
  placingNote.value = null
}

function onWheel(e) {
  if (!viewport.value || openKey.value) return
  e.preventDefault()

  const rect = viewport.value.getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top

  const oldS = camS
  const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08
  const newS = clamp(oldS * factor, 0.6, 1)

  const worldX = (sx - camX) / oldS
  const worldY = (sy - camY) / oldS

  camS = newS
  camX = sx - worldX * newS
  camY = sy - worldY * newS
}

function onDblClick(e) {
  if (!viewport.value || openKey.value || placingNote.value) return
  if (moved) return

  const rect = viewport.value.getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top

  const wpos = screenToWorld(sx, sy)
  const a = pixelToAxial(wpos.x, wpos.y)
  const k = keyOf(a.q, a.r)

  openKey.value = k

  const existing = notesByHex.value[k]
  if (existing) {
    openNoteId.value = existing.id || null
    noteTitle.value = existing.title || ''
    noteText.value = existing.content || ''
    noteColor.value = existing.color || hexColors.value.occupiedFill
  } else {
    openNoteId.value = null
    noteTitle.value = ''
    noteText.value = ''
    noteColor.value = hexColors.value.occupiedFill
  }
}

function resetView() {
  camX = 0
  camY = 0
  camS = 1
}

async function fetchNotes() {
  const token = localStorage.getItem("token") || ""

  if (!token || !vaultId.value) {
    notesByHex.value = {}
    notesList.value = []
    return
  }

  const url = `http://localhost:3000/notes?vaultId=${vaultId.value}&ownerId=${ownerId.value}`

  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + token }
  })

  const data = await res.json().catch(() => ([]))

  if (!res.ok) {
    notesByHex.value = {}
    notesList.value = []
    return
  }

  const byHex = {}
  for (const n of data) {
    if (n.hexKey) byHex[n.hexKey] = n
  }

  notesByHex.value = byHex
  notesList.value = data
}

async function saveAndClose() {
    const token = localStorage.getItem("token") || ""

    if (!openKey.value) return
    if (!canSave.value) return

    if (!token) {
      alert("Missing token. Login again.")
      return
    }

    if (!vaultId.value) {
      alert("No vault selected.")
      return
    }

    if (!ownerId.value) {
    alert("Missing ownerId (user not loaded). Login again.")
    return
  }


    const payload = {
      title: noteTitle.value.trim(),
      content: noteText.value,
      color: noteColor.value,
      ownerId: ownerId.value,
      vaultId: vaultId.value,
      hexKey: openKey.value
    }

    let url = "http://localhost:3000/notes"
    let method = "POST"

    if (openNoteId.value) {
      url = `http://localhost:3000/notes/${openNoteId.value}`
      method = "PUT"
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(data?.error || "Save failed")
        return
      }

      notesByHex.value[openKey.value] = data
      await fetchNotes()
      window.dispatchEvent(new Event("notes-changed"))


      openKey.value = null
      openNoteId.value = null
      noteTitle.value = ""
      noteText.value = ""
      noteColor.value = hexColors.value.occupiedFill
      measure()
    } catch (err) {
      console.log(err)
      alert("Network/server error")
    }
}

async function deleteNote() {
  const token = localStorage.getItem("token") || ""

  if (!token) {
    alert("Missing token. Login again.")
    return
  }

  if (!openNoteId.value) {
    alert("This note is not saved yet.")
    return
  }

  if (!confirm("Delete this note?")) return

  const url = `http://localhost:3000/notes/${openNoteId.value}`

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token
      }
    })

    const text = await res.text()

    let data = null
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }

    if (!res.ok) {
      const msg =
        (data && (data.error || data.message)) ||
        text ||
        "failed to delete note"

      alert(`HTTP ${res.status}\n\n${msg}`)
      return
    }

    await fetchNotes()
    window.dispatchEvent(new Event("notes-changed"))

    openKey.value = null
    openNoteId.value = null
    noteTitle.value = ""
    noteText.value = ""
    noteColor.value = hexColors.value.occupiedFill
    measure()
  } catch (err) {
    alert(err?.message || "Network/server error")
  }
}





async function shareNote() {
  if (!openNoteId.value) {
    alert("Save the note before sharing.")
    return
  }

  const email = prompt("Share this note with (email):")
  if (!email || !email.trim()) return

  const token = localStorage.getItem("token") || ""
  if (!token) {
    alert("Missing token. Login again.")
    return
  }

  try {
    const res = await fetch("http://localhost:3000/shares", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ noteId: openNoteId.value, toEmail: email.trim() })
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      alert(data?.error || "Failed to share note")
      return
    }

    alert(`Note shared with ${email.trim()}`)
  } catch (err) {
    alert("Network/server error")
  }
}

function backWithoutSave() {
  openKey.value = null
  openNoteId.value = null
  noteTitle.value = ''
  noteText.value = ''
  noteColor.value = hexColors.value.occupiedFill
  measure()
}

watch(
  () => vaultId.value,
  () => {
    fetchNotes()
  }
)

function openNoteById(noteId) {
  const n = notesList.value.find(x => x.id === noteId)
  if (!n) return

  openNoteId.value = n.id
  openKey.value = n.hexKey || null
  noteTitle.value = n.title || ""
  noteText.value = n.content || ""
  noteColor.value = n.color || hexColors.value.occupiedFill
}

function onOpenNoteEvent(e) {
  const id = Number(e?.detail?.noteId || 0)
  if (id) openNoteById(id)
}



onMounted(() => {
  measure()
  draw()

  window.addEventListener('resize', measure)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener("open-note", onOpenNoteEvent)

  fetchNotes()
})

onUnmounted(() => {
  window.removeEventListener('resize', measure)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener("open-note", onOpenNoteEvent)
})
</script>

<template>
  <div ref="viewport" class="viewport">
    <div v-show="openKey" class="note-wrap">
      <NoteEditor
        :openKey="openKey"
        :noteId="openNoteId"
        :title="noteTitle"
        :content="noteText"
        :color="noteColor"
        :canSave="canSave"
        @update:title="noteTitle = $event"
        @update:content="noteText = $event"
        @update:color="noteColor = $event"
        @save="saveAndClose"
        @back="backWithoutSave"
        @delete="deleteNote"
        @share="shareNote"
      />
    </div>

    <div
      v-show="!openKey"
      class="graph-view"
      :class="{ placing: placingNote }"
      @mousedown="onMouseDown"
      @wheel="onWheel"
      @dblclick="onDblClick"
    >
      <div class="controls">
        <button class="btn" @click="resetView">Reset</button>
        <button v-if="placingNote" class="btn" @click="cancelPlacing">Cancel placement</button>

        <div class="hint">
          <span v-if="placingNote">Placing "{{ placingNote.title }}" — click an empty cell</span>
          <span v-else>Drag · Wheel zoom (max 1) · Double click hex</span>
        </div>
      </div>

      <canvas ref="canvas" class="canvas"></canvas>
    </div>
  </div>
</template>

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

.graph-view.placing {
  cursor: crosshair;
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

.note-wrap {
  width: 100%;
  height: 100%;
}
</style>
