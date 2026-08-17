import { createRouter, createWebHistory } from 'vue-router'

// import the pages to be used in the router
import PageHome from '@/pages/Home.vue'
import PageProfile from '@/pages/Profile.vue'
import PageGraph from '@/pages/Graph.vue'


import PageAdminView from '@/pages/admin/AdminView.vue'

// actual routes
const routes = [
  {
    path: '/',
    name: 'home',
    component: PageHome,
    meta: { layout: 'blank' } 
  },
  {
    path: '/graph',
    name: 'graph',
    component: PageGraph,
    meta: { layout: 'app' }
  },
  
  {
    path: '/profile',
    name: 'profile',
    component: PageProfile,
    meta: { layout: 'app' }
  },
  {
    path: '/admin/view',
    name: 'admin-view',
    component: PageAdminView,
    meta: { layout: 'blank' }
  }

]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
