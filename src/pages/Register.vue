<!-- Script -->
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const password = ref('')
const password2 = ref('')
const errorMsg = ref('')

function registerUser() {
  errorMsg.value = ''

  if (password.value !== password2.value) {
    errorMsg.value = 'Passwords do not match'
    return
  }

  fetch('http://localhost:3000/users/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.value,
      password: password.value,
    }),
  })
    .then((res) => res.json())
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
    .catch(() => {
      errorMsg.value = 'Server error'
    })
}
</script>

<!-- Template -->
<template>
  <div style="padding: 20px;">
    <h1>Register</h1>

    <p v-if="errorMsg" style="font-weight:800;">{{ errorMsg }}</p>

    <label>Email</label>
    <input v-model="email" type="email" />

    <br /><br />

    <label>Password</label>
    <input v-model="password" type="password" />

    <br /><br />

    <label>Repeat password</label>
    <input v-model="password2" type="password" />

    <br /><br />

    <button @click="registerUser">Register</button>
  </div>
</template>
