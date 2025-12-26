<script setup>
import { RouterView, useRoute, useRouter } from "vue-router"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"


const route = useRoute()
const router = useRouter()

const user = ref(null)

//right sidebar text
const username = computed(() => user.value?.username || "Username")
const slogan = computed(() => `Enjoy building your hive!`)


const vaults = ref([])
const activeVaultId = ref(null)

watch(activeVaultId, async () => {
  persistActiveVault()
  await loadNotes()
})


const newVaultName = ref("")
const vaultError = ref("")

const notes = ref([])
const notesError = ref("")

const inbox = ref([])
const inboxError = ref("")



const isAuthPage = computed(() => route.meta?.layout === "blank")

function readUser() {
  try {
    user.value = JSON.parse(localStorage.getItem("user") || "null")
  } catch {
    user.value = null
  }
}

async function onAuthChanged() {
  readUser()
  await loadVaults()
}


function persistActiveVault() {
  if (activeVaultId.value) {
    localStorage.setItem("activeVaultId", String(activeVaultId.value))
  } else {
    localStorage.removeItem("activeVaultId")
  }
}

async function fetchAny(url, options = {}) {
  const token = localStorage.getItem("token") || ""

  const headers = {
    ...(options.headers || {}),
  }

  if (token && !headers.Authorization) {
    headers.Authorization = "Bearer " + token
  }

  const res = await fetch(url, {
    ...options,
    headers,
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
      `HTTP ${res.status}`
    throw new Error(`HTTP ${res.status}: ${msg}`)
  }

  return data ?? {}
}


async function loadVaults() {
  vaultError.value = ""
  if (!user.value) return

  try {
    const data = await fetchAny(
      `http://localhost:3000/vaults?ownerId=${user.value.id}`
    )

    vaults.value = Array.isArray(data) ? data : []

    const stored = Number(localStorage.getItem("activeVaultId") || 0)

    if (vaults.value.length > 0) {
      const stillExists = stored && vaults.value.some(v => v.id === stored)

      if (stillExists) {
        activeVaultId.value = stored
      } else if (!activeVaultId.value) {
        activeVaultId.value = vaults.value[0].id
      }
    } else {
      activeVaultId.value = null
    }

    persistActiveVault()
    await loadNotes()

  } catch (e) {
    vaultError.value = e.message
  }
}


async function loadNotes() {
  notesError.value = ""
  notes.value = []

  if (!user.value || !activeVaultId.value) return

  try {
    const data = await fetchAny(
      `http://localhost:3000/notes?vaultId=${activeVaultId.value}`
    )
    notes.value = Array.isArray(data) ? data : []
  } catch (e) {
    notesError.value = e.message
  }
}

async function loadInbox() {
  inboxError.value = ""
  inbox.value = []

  if (!user.value) return

  try {
    const data = await fetchAny(
      `http://localhost:3000/inbox?userId=${user.value.id}`
    )
    inbox.value = Array.isArray(data) ? data : []
  } catch (e) {
    inboxError.value = e.message
  }
}


function openNote(n) {
  if (!n) return
  window.dispatchEvent(new CustomEvent("open-note", { detail: { noteId: n.id } }))
}


async function addVault() {
  vaultError.value = ""
  if (!newVaultName.value.trim()) return
  if (!user.value) return

  try {
    await fetchAny("http://localhost:3000/vaults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newVaultName.value.trim(),
        ownerId: user.value.id,
      }),
    })

    newVaultName.value = ""
    await loadVaults()
  } catch (e) {
    vaultError.value = e.message
  }
}

async function deleteVault(vaultId) {
  vaultError.value = ""
  const v = vaults.value.find((x) => x.id === vaultId)
  const name = v ? v.name : "this vault"

  if (!confirm(`Delete "${name}"? This will delete its notes too.`)) return

  try {
    await fetchAny(`http://localhost:3000/vaults/${vaultId}`, {
      method: "DELETE",
    })

    if (activeVaultId.value === vaultId) activeVaultId.value = null
    persistActiveVault()
    await loadVaults()
  } catch (e) {
    vaultError.value = e.message
  }
}

function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  localStorage.removeItem("role")
  localStorage.removeItem("activeVaultId")
  user.value = null
  vaults.value = []
  activeVaultId.value = null

  notes.value = []
  notesError.value = ""
  vaultError.value = ""


  router.push("/")
}

onMounted(async () => {
  readUser()

  const stored = Number(localStorage.getItem("activeVaultId") || 0)
  if (stored) activeVaultId.value = stored

  if (user.value) {
    await loadVaults()
    //await loadInbox()
  }


  window.addEventListener("notehive-auth-changed", onAuthChanged)
  window.addEventListener("notes-changed", loadNotes)

  //window.addEventListener("inbox-changed", loadInbox)

  window.addEventListener("notehive-auth-changed", async () => {
    readUser()
    await loadVaults()
    //await loadInbox()
  })


})
onUnmounted(() => {
  window.removeEventListener("notehive-auth-changed", onAuthChanged)
  window.removeEventListener("notes-changed", loadNotes)
  window.removeEventListener("inbox-changed", loadInbox)

})


</script>

<template>
  <div v-if="isAuthPage" class="full">
    <RouterView />
  </div>

  <div v-else class="layout">
    <!-- LEFT -->
    <aside class="sidebar left">
      <div class="sidebar-title">Vault</div>

      <div v-if="vaultError" class="error">
        {{ vaultError }}
      </div>

      <div class="vault-picker">
        <select
          v-model="activeVaultId"
          class="select"
          :disabled="vaults.length === 0"
          
        >
          <option v-for="v in vaults" :key="v.id" :value="v.id">
            {{ v.name }}
          </option>
        </select>

        <button
          class="trash"
          :disabled="!activeVaultId"
          @click="deleteVault(activeVaultId)"
          title="Delete vault"
        >
          🗑
        </button>
      </div>

      <div class="new-vault">
        <input
          class="input"
          v-model="newVaultName"
          placeholder="New vault..."
        />
        <button class="btn" @click="addVault">Add</button>
      </div>

      <div class="notes-title">Notes</div>

        <div class="notes-box">
          <div v-if="notesError" class="error">
            {{ notesError }}
          </div>

          <div v-if="notes.length === 0 && !notesError" class="empty-vault">
            No notes yet
          </div>

          <div v-else class="notes-list">
            <button
              v-for="n in notes"
              :key="n.id"
              class="note-item"
              type="button"
              @click="openNote(n)"
            >
              {{ n.title || "Untitled" }}
            </button>
          </div>
        </div>



        <div class="empty-vault" v-if="vaults.length === 0 && !vaultError">
          No vaults yet
      </div>

    </aside>

    <!-- CENTER -->
    <main class="main">
      <RouterView :activeVaultId="activeVaultId" />
    </main>

    <!-- RIGHT -->
    <aside class="sidebar right">
      <button class="hive-btn" @click="router.push('/graph')">
        <div class="hive-title">NoteHive</div>
        <div class="hive-sub">Back to the hive</div>
      </button>

      <div class="inbox-box">
        <div class="inbox-title">
          Inbox
          <span class="inbox-count">{{ inbox.length }}</span>
        </div>

        <div v-if="inboxError" class="error">
          {{ inboxError }}
        </div>

        <div v-if="inbox.length === 0 && !inboxError" class="empty-vault">
          No shared notes
        </div>

        <div v-else class="inbox-list">
          <button
            v-for="s in inbox"
            :key="s.id"
            class="inbox-item"
            type="button"
            @click="$router.push('/graph'); openNote({ id: s.noteId })"
          >
            <div class="inbox-item-title">{{ s.title || "Untitled" }}</div>
            <div class="inbox-item-meta">
              From: {{ s.fromUsername || s.fromEmail || "unknown" }}
            </div>
          </button>
        </div>
      </div>


      <div class="welcome">
        <div class="welcome-user">{{ username }}</div>
        <div class="welcome-line">{{ slogan }}</div>
      </div>

      <div class="bottom-actions">
        <button class="action-btn" @click="router.push('/profile')">
          Settings
        </button>

        <button class="action-btn danger" @click="logout">
          Logout
        </button>
      </div>
    </aside>



  </div>
</template>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  font-family: system-ui, sans-serif;
  font-size: 18px;
  background: #d49a2a;
  color: #2a1f0f;
}

.full {
  height: 100vh;
}

/* ⬇️ sidebar izquierda más grande */
.layout {
  height: 100vh;
  display: grid;
  grid-template-columns: 340px 1fr 280px;
}

.sidebar {
  padding: 18px;
  background: #e1a93a;
  border-right: 3px solid #a56e10;
  overflow: auto;
  overflow-x: hidden;

  display: flex;
  flex-direction: column;
}


.sidebar.right {
  border-right: none;
  border-left: 3px solid #a56e10;
}

.sidebar-title {
  font-weight: 800;
  font-size: 20px;
  margin-bottom: 14px;
  color: #3a250c;
}

.section {
  margin-top: 18px;
}

.section-title {
  font-size: 13px;
  opacity: 0.8;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.item {
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  background: transparent;
}

.item:hover {
  background: #c9891e;
}

.main {
  background: #f0bf55;
  padding: 0;
  overflow: hidden;
}

.empty-vault {
  font-size: 15px;
  opacity: 0.8;
  font-style: italic;
  margin-top: 10px;
}

/* vault ui */
.vault-picker {
  display: grid;
  grid-template-columns: 1fr 44px;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.select {
  border: 2px solid rgba(165, 110, 16, 0.7);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(240, 191, 85, 0.65);
  font-weight: 800;
  color: #2a1f0f;
}

.trash {
  border: 2px solid rgba(165, 110, 16, 0.7);
  border-radius: 12px;
  background: rgba(200, 60, 30, 0.22);
  cursor: pointer;
  height: 42px;
  font-size: 22px;
}

.trash:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.new-vault {
  display: grid;
  grid-template-columns: 1fr 84px;
  gap: 8px;
}

.input {
  border: 2px solid rgba(165, 110, 16, 0.65);
  background: rgba(240, 191, 85, 0.65);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 16px;
  outline: none;
  color: #2a1f0f;
}

.btn {
  border: 3px solid #a56e10;
  background: rgba(201, 137, 30, 0.9);
  border-radius: 12px;
  cursor: pointer;
  font-weight: 900;
  color: #2a1f0f;
}

.error {
  margin: 6px 0 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 2px solid rgba(120, 20, 20, 0.5);
  background: rgba(200, 60, 30, 0.18);
  font-weight: 800;
  word-break: break-word;
}

.notes-box {
  margin-top: 10px;
  padding: 10px;
  border-radius: 14px;
  border: 2px solid rgba(165, 110, 16, 0.7);
  background: rgba(240, 191, 85, 0.35);
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-item {
  width: 100%;
  text-align: left;
  box-sizing: border-box;

  border: 2px solid rgba(165, 110, 16, 0.7);
  background: rgba(240, 191, 85, 0.65);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 800;
  color: #2a1f0f;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-item:hover {
  background: rgba(201, 137, 30, 0.55);
}

.notes-title {
  margin-top: 18px;
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  font-weight: 900;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(201, 137, 30, 0.35);
  border: 2px solid rgba(165, 110, 16, 0.7);
  color: #3a250c;
}

.welcome {
  padding: 12px 8px;
  text-align: center;
}


.welcome-user {
  font-size: 25px;
  font-weight: 950;
  color: #2a1f0f;
}

.welcome-line {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 800;
  opacity: 0.9;
}

.action-btn {
  width: 100%;
  margin-top: 12px;
  border: 3px solid #a56e10;
  background: rgba(240, 191, 85, 0.65);
  border-radius: 14px;
  padding: 12px 12px;
  cursor: pointer;
  font-weight: 950;
  font-size: 16px;
  color: #2a1f0f;
}

.action-btn:hover {
  background: rgba(201, 137, 30, 0.55);
}

.action-btn.danger {
  background: rgba(200, 60, 30, 0.22);
}

.action-btn.danger:hover {
  background: rgba(200, 60, 30, 0.32);
}

.hive-btn {
  width: 100%;
  margin-bottom: 14px;
  padding: 16px 12px;
  border-radius: 18px;
  border: 3px solid #a56e10;
  background: rgba(201, 137, 30, 0.85);
  cursor: pointer;
  text-align: center;
}

.hive-btn:hover {
  filter: brightness(1.05);
}

.hive-title {
  font-size: 26px;
  font-weight: 1000;
  letter-spacing: 0.04em;
  color: #2a1f0f;
}

.hive-sub {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 800;
  opacity: 0.85;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.bottom-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inbox-box {
  margin-top: 14px;
  padding: 12px;
  border-radius: 16px;
  border: 2px solid rgba(165, 110, 16, 0.55);
  background: rgba(240, 191, 85, 0.25);
}

.inbox-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 950;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 10px;
}

.inbox-count {
  font-size: 12px;
  font-weight: 950;
  padding: 4px 10px;
  border-radius: 999px;
  border: 2px solid rgba(165, 110, 16, 0.55);
  background: rgba(240, 191, 85, 0.55);
}

.inbox-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inbox-item {
  width: 100%;
  text-align: left;
  border: 2px solid rgba(165, 110, 16, 0.55);
  background: rgba(240, 191, 85, 0.5);
  border-radius: 14px;
  padding: 10px 12px;
  cursor: pointer;
  color: #2a1f0f;
  font: inherit;
}

.inbox-item:hover {
  background: rgba(201, 137, 30, 0.35);
}

.inbox-item-title {
  font-weight: 950;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inbox-item-meta {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


</style>
