<!-- Script -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const tab = ref('login')
const errorMsg = ref('')

// login
const loginEmail = ref('')
const loginPassword = ref('')

// register
const regEmail = ref('')
const regPassword = ref('')
const regPassword2 = ref('')

const goLogin = () => {
  tab.value = 'login'
  errorMsg.value = ''
}

const goRegister = () => {
  tab.value = 'register'
  errorMsg.value = ''
}

function readError(res) {
  return res.text().then((t) => {
    if (!t) return `HTTP ${res.status}`
    return `HTTP ${res.status}: ${t}`
  })
}

const submitLogin = () => {
  errorMsg.value = ''

  fetch('http://localhost:3000/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: loginEmail.value,
      password: loginPassword.value,
    }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const msg = await readError(res)
        throw new Error(msg)
      }
      return res.json()
    })
    .then((data) => {
      if (data.error || data.message) {
        errorMsg.value = data.error || data.message
        return
      }

      if (!data.token) {
        errorMsg.value = 'Login failed (no token returned)'
        return
      }

      localStorage.setItem('token', data.token)
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
      if (data.role) localStorage.setItem('role', data.role)

      window.dispatchEvent(new Event('notehive-auth-changed'))
      router.push('/graph')
    })
    .catch((err) => {
      console.error('LOGIN ERROR:', err)
      errorMsg.value = err.message || 'Server error'
    })
}

const submitRegister = () => {
  errorMsg.value = ''

  if (regPassword.value !== regPassword2.value) {
    errorMsg.value = 'Passwords do not match'
    return
  }

  fetch('http://localhost:3000/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: regEmail.value,
      password: regPassword.value,
    }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const msg = await readError(res)
        throw new Error(msg)
      }
      return res.json()
    })
    .then((data) => {
      if (data.error || data.message) {
        errorMsg.value = data.error || data.message
        return
      }

      if (!data.token) {
        errorMsg.value = 'Register failed (no token returned)'
        return
      }

      localStorage.setItem('token', data.token)
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
      if (data.role) localStorage.setItem('role', data.role)

      window.dispatchEvent(new Event('notehive-auth-changed'))
      router.push('/graph')
    })
    .catch((err) => {
      console.error('REGISTER ERROR:', err)
      errorMsg.value = err.message || 'Server error'
    })
}
</script>


<!-- Template -->
<template>
  <div class="home">
    <div class="card">
      <div class="brand">
        <div class="title">NoteHive</div>
        <div class="subtitle">Your notes, mapped like a hive.</div>
      </div>

      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'login' }" @click="goLogin">
          Login
        </button>
        <button class="tab" :class="{ active: tab === 'register' }" @click="goRegister">
          Register
        </button>
      </div>

      <div v-if="errorMsg" class="error">{{ errorMsg }}</div>

      <!-- LOGIN -->
      <div v-show="tab === 'login'" class="panel">
        <div class="panel-title">Sign in</div>

        <label class="label">Email</label>
        <input class="input" v-model="loginEmail" type="email" placeholder="you@example.com" />

        <label class="label">Password</label>
        <input class="input" v-model="loginPassword" type="password" placeholder="••••••••" />

        <button class="primary" @click="submitLogin">Login</button>

        <div class="small">
          No account?
          <span class="link" @click="goRegister">Create one</span>
        </div>
      </div>

      <!-- REGISTER -->
      <div v-show="tab === 'register'" class="panel">
        <div class="panel-title">Create account</div>

        <label class="label">Email</label>
        <input class="input" v-model="regEmail" type="email" placeholder="you@example.com" />

        <label class="label">Password</label>
        <input class="input" v-model="regPassword" type="password" placeholder="••••••••" />

        <label class="label">Repeat password</label>
        <input class="input" v-model="regPassword2" type="password" placeholder="••••••••" />

        <button class="primary" @click="submitRegister">Register</button>

        <div class="small">
          Already have an account?
          <span class="link" @click="goLogin">Login</span>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- Style -->
<style scoped>
.home {
  width: 100%;
  height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.card {
  width: min(520px, 92vw);
  border: 3px solid #a56e10;
  border-radius: 22px;
  background: rgba(242, 211, 138, 0.75);
  box-shadow: 0 18px 50px rgba(42, 31, 15, 0.22);
  padding: 22px;
}

.brand {
  text-align: center;
  margin-bottom: 16px;
}

.title {
  font-size: 44px;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: #2a1f0f;
}

.subtitle {
  margin-top: 6px;
  font-size: 16px;
  opacity: 0.8;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 14px 0 18px;
}

.tab {
  border: 3px solid #a56e10;
  border-radius: 14px;
  background: rgba(225, 169, 58, 0.7);
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 900;
  color: #2a1f0f;
}

.tab.active {
  background: rgba(201, 137, 30, 0.75);
}

.error {
  margin: 6px 0 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 2px solid rgba(120, 20, 20, 0.5);
  background: rgba(200, 60, 30, 0.18);
  font-weight: 800;
}

.panel {
  display: grid;
  gap: 10px;
}

.panel-title {
  font-size: 20px;
  font-weight: 900;
  margin-bottom: 4px;
}

.label {
  font-size: 13px;
  font-weight: 800;
  opacity: 0.85;
}

.input {
  border: 2px solid rgba(165, 110, 16, 0.65);
  background: rgba(240, 191, 85, 0.65);
  border-radius: 14px;
  padding: 12px 12px;
  font-size: 16px;
  outline: none;
  color: #2a1f0f;
}

.input:focus {
  border-color: rgba(165, 110, 16, 1);
}

.primary {
  margin-top: 6px;
  border: 3px solid #a56e10;
  background: rgba(201, 137, 30, 0.9);
  border-radius: 14px;
  padding: 12px 12px;
  cursor: pointer;
  font-weight: 900;
  color: #2a1f0f;
}

.primary:hover {
  filter: brightness(1.04);
}

.small {
  margin-top: 4px;
  font-size: 14px;
  opacity: 0.85;
  text-align: center;
}

.link {
  font-weight: 900;
  text-decoration: underline;
  cursor: pointer;
}
</style>
