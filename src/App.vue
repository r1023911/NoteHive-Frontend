<!-- Script -->
<script setup>
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const showLayout = computed(() => route.meta.layout !== 'blank')
</script>

<!-- Template -->
<template>
  <!-- Páginas sin layout (Home / Login / Register) -->
  <RouterView v-if="!showLayout" />

  <!-- Páginas con layout -->
  <div v-else class="layout">
    <!-- LEFT SIDEBAR -->
    <aside class="sidebar left">
      <div class="sidebar-title">Vault</div>

      <div class="empty-vault">
        No notes yet
      </div>
    </aside>

    <!-- CENTER -->
    <main class="main">
      <RouterView />
    </main>

    <!-- RIGHT SIDEBAR -->
    <aside class="sidebar right">
      <div class="sidebar-title">Profile</div>

      <div class="section">
        <div class="section-title">Account</div>
        <div class="item">Username</div>
        <div class="item">Logout</div>
      </div>

      <div class="section">
        <div class="section-title">Settings</div>
        <div class="item">Theme</div>
        <div class="item">Shortcuts</div>
        <div class="item">Sync</div>
      </div>
    </aside>
  </div>
</template>

<!-- Style -->
<style>
html, body, #app {
  height: 100%;
  margin: 0;
  font-family: system-ui, sans-serif;
  font-size: 18px;
  background: #d49a2a;
  color: #2a1f0f;
}

/* layout */
.layout {
  height: 100vh;
  display: grid;
  grid-template-columns: 280px 1fr 280px;
}

/* sidebars */
.sidebar {
  padding: 18px;
  background: #e1a93a;
  border-right: 3px solid #a56e10;
  overflow: auto;
}

.sidebar.right {
  border-right: none;
  border-left: 3px solid #a56e10;
}

/* titles */
.sidebar-title {
  font-weight: 800;
  font-size: 20px;
  margin-bottom: 14px;
  color: #3a250c;
}

/* empty vault */
.empty-vault {
  font-size: 15px;
  opacity: 0.8;
  font-style: italic;
  margin-top: 8px;
}

/* sections */
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

/* items */
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

/* main area (centro) */
.main {
  background: #f0bf55;
  padding: 0;
  overflow: hidden;
}
</style>
