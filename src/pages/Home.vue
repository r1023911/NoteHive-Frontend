<!-- Script -->
<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()

  // 'login' | 'register' | 'verify'
  const view = ref('login')

  const errorMsg = ref('')
  const infoMsg = ref('')

  // login
  const loginEmail = ref('')
  const loginPassword = ref('')

  // register
  const regUsername = ref('')
  const regEmail = ref('')
  const regPassword = ref('')
  const regPassword2 = ref('')

  // verify (solo code, email se guarda del register o del login)
  const verifyEmail = ref('')
  const verifyCode = ref('')

  function setError(msg) {
    errorMsg.value = msg || ''
  }

  function setInfo(msg) {
    infoMsg.value = msg || ''
  }

  // fetch robusto: si no es JSON, intenta texto
  async function fetchJson(url, options) {
    const res = await fetch(url, options)

    const text = await res.text()
    let data = null
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }

    if (!res.ok) {
      // muestra SOLO el mensaje, limpio
      const msg =
        (data && (data.error || data.message)) ||
        (text && text.trim()) ||
        'Request failed'
      throw new Error(msg)
    }

    return data || {}
  }

  const goLogin = () => {
    view.value = 'login'
    setError('')
    setInfo('')
  }

  const goRegister = () => {
    view.value = 'register'
    setError('')
    setInfo('')
  }

  const goVerify = () => {
    view.value = 'verify'
    setError('')
    // NO borres infoMsg aquí, porque lo usas para "We sent code..."
  }

  const submitLogin = async () => {
    setError('')
    setInfo('')

    try {
      const data = await fetchJson('http://localhost:3000/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.value,
          password: loginPassword.value,
        }),
      })

      if (!data.token) {
        setError('Login failed')
        return
      }

      localStorage.setItem('token', data.token)
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('role', data.role || 'user')

      window.dispatchEvent(new Event('notehive-auth-changed'))
      router.push('/graph')
    } catch (e) {
      const msg = String(e.message || '')

      // si backend te dice que no está verificado -> ir a verify
      if (msg.toLowerCase().includes('not verified')) {
        verifyEmail.value = loginEmail.value
        verifyCode.value = ''
        setInfo('Your email is not verified. Enter the 6-digit code we sent you.')
        goVerify()
        return
      }

      setError(msg || 'Request failed')
    }
  }

  const submitRegister = async () => {
    setError('')
    setInfo('')

    if (!regUsername.value || !regEmail.value || !regPassword.value) {
      setError('username, email and password required')
      return
    }

    if (regPassword.value !== regPassword2.value) {
      setError('Passwords do not match')
      return
    }

    try {
      await fetchJson('http://localhost:3000/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.value,
          email: regEmail.value,
          password: regPassword.value,
        }),
      })

      // guardar email para verify y cambiar de vista
      verifyEmail.value = regEmail.value
      verifyCode.value = ''
      setInfo('We sent a 6-digit code to your email.')
      goVerify()
    } catch (e) {
      setError(String(e.message || 'Request failed'))
    }
  }

  const submitVerify = async () => {
    setError('')
    setInfo('')

    if (!verifyCode.value) {
      setError('code required')
      return
    }

    try {
      const data = await fetchJson('http://localhost:3000/users/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verifyEmail.value, // oculto al usuario
          code: verifyCode.value,
        }),
      })

      // si devuelve token -> ya está verificado y logueado
      if (data.token) {
        localStorage.setItem('token', data.token)
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('role', data.role || 'user')

        window.dispatchEvent(new Event('notehive-auth-changed'))
        router.push('/graph')
        return
      }

      // fallback
      setInfo(data.message || 'Verified. Now login.')
      goLogin()
    } catch (e) {
      setError(String(e.message || 'Request failed'))
    }
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

      <!-- TABS SOLO PARA LOGIN/REGISTER -->
      <div v-if="view !== 'verify'" class="tabs">
        <button class="tab" :class="{ active: view === 'login' }" @click="goLogin">
          Login
        </button>
        <button class="tab" :class="{ active: view === 'register' }" @click="goRegister">
          Register
        </button>
      </div>

      <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
      <div v-if="infoMsg" class="info">{{ infoMsg }}</div>

      <!-- LOGIN -->
      <div v-show="view === 'login'" class="panel">
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
      <div v-show="view === 'register'" class="panel">
        <div class="panel-title">Create account</div>

        <label class="label">Username</label>
        <input class="input" v-model="regUsername" type="text" placeholder="" />

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

      <!-- VERIFY -->
      <div v-show="view === 'verify'" class="panel">
        <div class="panel-title">Verify your email</div>

        <div class="verify-hint">
          Enter the 6-digit code sent to <b>{{ verifyEmail }}</b>.
        </div>

        <label class="label">6-digit code</label>
        <input class="input" v-model="verifyCode" type="text" placeholder="123456" />

        <button class="primary" @click="submitVerify">Verify</button>

        <div class="small">
          Want to go back?
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
    width: min(560px, 92vw);
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

  .info {
    margin: 6px 0 12px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 2px solid rgba(20, 120, 40, 0.45);
    background: rgba(30, 170, 70, 0.14);
    font-weight: 900;
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

  .verify-hint {
    font-size: 14px;
    opacity: 0.9;
    padding: 10px 12px;
    border-radius: 14px;
    border: 2px solid rgba(165, 110, 16, 0.35);
    background: rgba(240, 191, 85, 0.35);
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
