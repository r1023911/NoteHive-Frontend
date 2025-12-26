<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()

const user = ref(null)
try {
  user.value = JSON.parse(localStorage.getItem("user") || "null")
} catch {
  user.value = null
}

const username = ref(user.value?.username || "")

const currentPassword = ref("")
const newPassword = ref("")
const newPassword2 = ref("")

const deletePassword = ref("")

const okMsg = ref("")
const errMsg = ref("")

async function fetchAny(url, options = {}) {
  const token = localStorage.getItem("token") || ""
  const headers = { ...(options.headers || {}) }
  if (token && !headers.Authorization) headers.Authorization = "Bearer " + token

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

function clearMsgs() {
  okMsg.value = ""
  errMsg.value = ""
}

function back() {
  router.push("/graph")
}

async function saveUsername() {
  clearMsgs()
  if (!user.value?.id) return
  if (!username.value.trim()) {
    errMsg.value = "Username required."
    return
  }

  try {
    const data = await fetchAny(`http://localhost:3000/users/${user.value.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.value.trim() }),
    })

    const updated = data.user || data
    localStorage.setItem("user", JSON.stringify(updated))
    window.dispatchEvent(new Event("notehive-auth-changed"))
    okMsg.value = "Username updated."
  } catch (e) {
    errMsg.value = e.message || "Failed."
  }
}

async function changePassword() {
  clearMsgs()
  if (!user.value?.id) return

  if (!currentPassword.value) {
    errMsg.value = "Current password required."
    return
  }
  if (!newPassword.value || newPassword.value.length < 8) {
    errMsg.value = "New password must be at least 8 characters."
    return
  }
  if (newPassword.value !== newPassword2.value) {
    errMsg.value = "Passwords do not match."
    return
  }

  try {
    await fetchAny(`http://localhost:3000/users/${user.value.id}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      }),
    })

    currentPassword.value = ""
    newPassword.value = ""
    newPassword2.value = ""
    okMsg.value = "Password updated."
  } catch (e) {
    errMsg.value = e.message || "Failed."
  }
}

async function deleteAccount() {
  clearMsgs()
  if (!user.value?.id) return

  if (!deletePassword.value) {
    errMsg.value = "Password required."
    return
  }

  if (!confirm("Delete your account? This cannot be undone.")) return

  try {
    await fetchAny(`http://localhost:3000/users/${user.value.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword.value }),
    })

    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("role")
    localStorage.removeItem("activeVaultId")
    window.dispatchEvent(new Event("notehive-auth-changed"))
    router.push("/")
  } catch (e) {
    errMsg.value = e.message || "Failed."
  }
}
</script>

<template>
  <div class="wrap">
    <div class="top">
      <div class="title">Settings</div>
      <button class="btn" @click="back">Back</button>
    </div>

    <div v-if="errMsg" class="error">{{ errMsg }}</div>
    <div v-if="okMsg" class="info">{{ okMsg }}</div>

    <div class="card">
      <div class="card-title">Change username</div>
      <label class="label">Username</label>
      <input class="input" v-model="username" type="text" />
      <button class="primary" @click="saveUsername">Save</button>
    </div>

    <div class="card">
      <div class="card-title">Change password</div>
      <label class="label">Current password</label>
      <input class="input" v-model="currentPassword" type="password" />
      <label class="label">New password</label>
      <input class="input" v-model="newPassword" type="password" />
      <label class="label">Repeat new password</label>
      <input class="input" v-model="newPassword2" type="password" />
      <button class="primary" @click="changePassword">Update password</button>
    </div>

    <div class="card danger">
      <div class="card-title">Delete account</div>
      <label class="label">Password</label>
      <input class="input" v-model="deletePassword" type="password" />
      <button class="danger-btn" @click="deleteAccount">Delete permanently</button>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  width: 100%;
  height: 100%;
  padding: 18px;
  box-sizing: border-box;
  overflow: auto;

  display: flex;
  flex-direction: column;
  align-items: center;
}


.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.title {
  font-size: 26px;
  font-weight: 950;
  color: #2a1f0f;
}

.btn {
  border: 3px solid #a56e10;
  background: rgba(201, 137, 30, 0.6);
  border-radius: 14px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 950;
  color: #2a1f0f;
}

.card {
  max-width: 920px;
  width: 100%;
  padding: 22px;
  margin-top: 20px;
}


.card-title {
  font-weight: 950;
  font-size: 18px;
  margin-bottom: 10px;
}

.label {
  display: block;
  margin-top: 8px;
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

.primary {
  width: 100%;
  margin-top: 12px;
  border: 3px solid #a56e10;
  background: rgba(201, 137, 30, 0.85);
  border-radius: 14px;
  padding: 12px 12px;
  cursor: pointer;
  font-weight: 950;
  color: #2a1f0f;
}

.primary:hover {
  filter: brightness(1.05);
}

.danger {
  border-color: rgba(120, 20, 20, 0.55);
}

.danger-btn {
  width: 100%;
  margin-top: 12px;
  border: 3px solid rgba(120, 20, 20, 0.7);
  background: rgba(200, 60, 30, 0.25);
  border-radius: 14px;
  padding: 12px 12px;
  cursor: pointer;
  font-weight: 950;
  color: #2a1f0f;
}

.danger-btn:hover {
  background: rgba(200, 60, 30, 0.35);
}

.error {
  margin: 6px 0 0;
  max-width: 820px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 2px solid rgba(120, 20, 20, 0.5);
  background: rgba(200, 60, 30, 0.18);
  font-weight: 900;
}

.info {
  margin: 6px 0 0;
  max-width: 820px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 2px solid rgba(20, 120, 40, 0.45);
  background: rgba(30, 170, 70, 0.14);
  font-weight: 900;
}
</style>
