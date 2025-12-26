<script setup>
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()

const users = ref([])
const selectedId = ref(null)

const username = ref("")
const newPassword = ref("")
const okMsg = ref("")
const errMsg = ref("")

function clearMsgs() {
  okMsg.value = ""
  errMsg.value = ""
}

function role() {
  return localStorage.getItem("role") || "user"
}

function token() {
  return localStorage.getItem("token") || ""
}

async function fetchAny(url, options = {}) {
  const t = token()
  const headers = { ...(options.headers || {}) }
  if (t && !headers.Authorization) headers.Authorization = "Bearer " + t

  const res = await fetch(url, { ...options, headers })
  const text = await res.text()

  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    data = null
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || text || `HTTP ${res.status}`
    throw new Error(msg)
  }

  return data ?? {}
}

async function loadUsers() {
  clearMsgs()

  if (role() !== "admin") {
    router.push("/graph")
    return
  }

  try {
    const data = await fetchAny("http://localhost:3000/users/admin/users")
    users.value = Array.isArray(data) ? data : []
    if (users.value.length && !selectedId.value) selectUser(users.value[0])
  } catch (e) {
    errMsg.value = e.message || "Failed to load users"
  }
}

function selectUser(u) {
  selectedId.value = u.id
  username.value = u.username || ""
  newPassword.value = ""
  clearMsgs()
}

function selectedUser() {
  return users.value.find(u => u.id === selectedId.value) || null
}

async function saveUsername() {
  clearMsgs()
  const u = selectedUser()
  if (!u) return

  if (!username.value.trim() || username.value.trim().length < 2) {
    errMsg.value = "Invalid username"
    return
  }

  try {
    const data = await fetchAny(`http://localhost:3000/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.value.trim() }),
    })

    const updated = data.user || data
    users.value = users.value.map(x => (x.id === u.id ? { ...x, ...updated } : x))
    okMsg.value = "Username updated."
  } catch (e) {
    errMsg.value = e.message || "Failed."
  }
}

async function resetPassword() {
  clearMsgs()
  const u = selectedUser()
  if (!u) return

  if (!newPassword.value || newPassword.value.length < 8) {
    errMsg.value = "New password must be at least 8 characters."
    return
  }

  try {
    await fetchAny(`http://localhost:3000/users/${u.id}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: newPassword.value }),
    })

    newPassword.value = ""
    okMsg.value = "Password reset."
  } catch (e) {
    errMsg.value = e.message || "Failed."
  }
}

async function deleteUser() {
  clearMsgs()
  const u = selectedUser()
  if (!u) return

  if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return

  try {
    await fetchAny(`http://localhost:3000/users/${u.id}`, {
      method: "DELETE",
    })

    users.value = users.value.filter(x => x.id !== u.id)
    selectedId.value = users.value[0]?.id || null
    if (selectedId.value) selectUser(users.value[0])
    okMsg.value = "User deleted."
  } catch (e) {
    errMsg.value = e.message || "Failed."
  }
}

function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  localStorage.removeItem("role")
  localStorage.removeItem("activeVaultId")
  router.push("/")
}

onMounted(loadUsers)
</script>

<template>
  <div class="page">
    <div class="topbar">
      <div class="title">Admin</div>

      <div class="actions">
        <button class="btn" @click="loadUsers">Refresh</button>
        <button class="btn danger" @click="logout">Logout</button>
      </div>
    </div>

    <div v-if="errMsg" class="msg error">{{ errMsg }}</div>
    <div v-if="okMsg" class="msg ok">{{ okMsg }}</div>

    <div class="grid">
      <div class="left">
        <div class="card">
          <div class="card-title">Users</div>

          <button
            v-for="u in users"
            :key="u.id"
            class="user-row"
            :class="{ active: u.id === selectedId }"
            type="button"
            @click="selectUser(u)"
          >
            <div class="user-main">
              <div class="user-name">{{ u.username || "No username" }}</div>
              <div class="user-email">{{ u.email }}</div>
            </div>

            <div class="user-meta">
              <span class="pill" :class="{ ok: u.isVerified }">
                {{ u.isVerified ? "Verified" : "Unverified" }}
              </span>
              <span class="id">#{{ u.id }}</span>
            </div>
          </button>
        </div>
      </div>

      <div class="right">
        <div v-if="selectedUser()" class="card">
          <div class="card-title">Manage user</div>


          <label class="label">Username</label>
          <input class="input" v-model="username" type="text" />
          <button class="btn wide" @click="saveUsername">Save username</button>

          <div class="sep"></div>

          <label class="label">Reset password (new)</label>
          <input class="input" v-model="newPassword" type="text" placeholder="min 8 characters" />
          <button class="btn wide" @click="resetPassword">Reset password</button>

          <div class="sep"></div>

          <button class="btn wide danger" @click="deleteUser">Delete account</button>
        </div>

        <div v-else class="card">
          <div class="card-title">Manage user</div>
          <div class="hint">Select a user from the list.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f0bf55;
  padding: 18px;
  box-sizing: border-box;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.title {
  font-size: 34px;
  font-weight: 950;
  color: #2a1f0f;
}

.actions {
  display: flex;
  gap: 10px;
}

.grid {
  display: grid;
  grid-template-columns: 760px 1fr;
  gap: 16px;
  align-items: start;
}

.card {
  border: 3px solid rgba(165, 110, 16, 0.75);
  background: rgba(242, 211, 138, 0.6);
  border-radius: 18px;
  padding: 14px;
}

.card-title {
  font-weight: 950;
  font-size: 18px;
  margin-bottom: 10px;
}

.user-row {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  text-align: left;

  border: 2px solid rgba(165, 110, 16, 0.55);
  background: rgba(240, 191, 85, 0.55);
  border-radius: 14px;
  padding: 12px 12px;
  cursor: pointer;
  color: #2a1f0f;
  font: inherit;
  margin-top: 10px;
}

.user-row:hover {
  background: rgba(201, 137, 30, 0.35);
}

.user-row.active {
  border-color: rgba(165, 110, 16, 1);
  background: rgba(201, 137, 30, 0.28);
}

.user-name {
  font-weight: 950;
  font-size: 18px;
}

.user-email {
  font-size: 14px;
  opacity: 0.85;
  word-break: break-word;
}

.user-meta {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pill {
  border: 2px solid rgba(165, 110, 16, 0.55);
  background: rgba(240, 191, 85, 0.45);
  border-radius: 999px;
  padding: 6px 10px;
  font-weight: 900;
  font-size: 12px;
}

.pill.ok {
  border-color: rgba(20, 120, 40, 0.55);
  background: rgba(30, 170, 70, 0.18);
}

.id {
  font-weight: 950;
  opacity: 0.75;
}

.label {
  display: block;
  margin-top: 10px;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 850;
  opacity: 0.85;
}

.input {
  width: 100%;
  box-sizing: border-box;
  border: 2px solid rgba(165, 110, 16, 0.7);
  background: rgba(240, 191, 85, 0.65);
  border-radius: 14px;
  padding: 12px 12px;
  font-size: 16px;
  outline: none;
  color: #2a1f0f;
}

.btn {
  border: 3px solid #a56e10;
  background: rgba(201, 137, 30, 0.85);
  border-radius: 14px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 950;
  color: #2a1f0f;
}

.btn:hover {
  filter: brightness(1.05);
}

.btn.danger {
  border-color: rgba(120, 20, 20, 0.7);
  background: rgba(200, 60, 30, 0.25);
}

.btn.wide {
  width: 100%;
  margin-top: 10px;
}

.sep {
  height: 1px;
  background: rgba(165, 110, 16, 0.35);
  margin: 14px 0;
}

.hint {
  font-size: 14px;
  opacity: 0.85;
  padding: 10px 12px;
  border-radius: 14px;
  border: 2px solid rgba(165, 110, 16, 0.35);
  background: rgba(240, 191, 85, 0.35);
}

.msg {
  max-width: 1100px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 2px solid rgba(165, 110, 16, 0.35);
  background: rgba(240, 191, 85, 0.35);
  font-weight: 900;
}

.msg.error {
  border-color: rgba(120, 20, 20, 0.5);
  background: rgba(200, 60, 30, 0.18);
}

.msg.ok {
  border-color: rgba(20, 120, 40, 0.45);
  background: rgba(30, 170, 70, 0.14);
}
</style>
