// import createRouter and createWebHistory from the package vue-router
import { createRouter, createWebHistory } from 'vue-router'

// import the pages to be used in the router
import PageHome from '@/pages/Home.vue'
import PageProfile from '@/pages/Profile.vue'
import PageGraph from '@/pages/Graph.vue'

import PageAdmin from '@/pages/admin/Admin.vue'
import PageAdminView from '@/pages/admin/AdminView.vue'
import PageAdminUsers from '@/pages/admin/AdminUsers.vue'

// actual routes
const routes = [
  {
    path: '/',
    name: 'home',
    component: PageHome,
    meta: { layout: 'blank' } // ✅ SIN sidebars
  },
  {
    path: '/graph',
    name: 'graph',
    component: PageGraph,
    meta: { layout: 'app' } // ✅ CON sidebars
  },
  
  {
    path: '/profile',
    name: 'profile',
    component: PageProfile,
    meta: { layout: 'app' }
  },
  {
    path: '/admin',
    name: 'admin',
    component: PageAdmin,
    meta: { layout: 'app' }
  },
  {
    path: '/admin/view',
    name: 'admin-view',
    component: PageAdminView,
    meta: { layout: 'app' }
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: PageAdminUsers,
    meta: { layout: 'app' }
  }
]

// Export because I will use this in main.js
export const router = createRouter({
  history: createWebHistory(),
  routes
})
