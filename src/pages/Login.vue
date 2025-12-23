<!-- Script -->
<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function loginUser() {
  localStorage.setItem('token', 'demo-token')
  localStorage.setItem('role', 'user')
  window.dispatchEvent(new Event('notehive-auth-changed'))
  router.push('/')
}

function loginAdmin() {
  localStorage.setItem('token', 'demo-token')
  localStorage.setItem('role', 'admin')
  window.dispatchEvent(new Event('notehive-auth-changed'))
  router.push('/admin')
}
</script>

<!-- Template -->
<template>
  <div>
    <h1>Login</h1>

    <button @click="loginUser">Login as USER</button>
    <button @click="loginAdmin">Login as ADMIN</button>
  </div>
</template>
