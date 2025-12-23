<!-- Script -->
<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'

const router = useRouter()
const tick = ref(0)

const role = computed(() => {
  tick.value
  return localStorage.getItem('role') || 'guest'
})

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  window.dispatchEvent(new Event('notehive-auth-changed'))
  router.push('/')
}

function refresh() {
  tick.value++
}

onMounted(() => {
  window.addEventListener('notehive-auth-changed', refresh)
})

onUnmounted(() => {
  window.removeEventListener('notehive-auth-changed', refresh)
})
</script>

<!-- Template -->
<template>
  <div>
    <nav>
      <!-- GUEST -->
      <template v-if="role === 'guest'">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/graph">Graph</RouterLink>
        <RouterLink to="/login">Login</RouterLink>
        <RouterLink to="/register">Register</RouterLink>
      </template>

      <!-- USER -->
      <template v-else-if="role === 'user'">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/graph">Graph</RouterLink>
        <RouterLink to="/profile">Profile</RouterLink>
        <button @click="logout">Logout</button>
      </template>

      <!-- ADMIN -->
      <template v-else>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/admin">Admin</RouterLink>
        <button @click="logout">Logout</button>
      </template>
    </nav>

    <RouterView />
  </div>
</template>
