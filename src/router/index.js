// import createRouter and createWebHistory from the package vue-router
import { createRouter, createWebHistory } from 'vue-router'

// import the pages to be used in the router
import PageHome from '@/pages/Home.vue'
import PageLogin from '@/pages/Login.vue'
import PageRegister from '@/pages/Register.vue'
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
        component: PageHome
    },
    {
        path: '/login',
        name: 'login',
        component: PageLogin
    },
    {
        path: '/register',
        name: 'register',
        component: PageRegister
    },
    {
        path: '/profile',
        name: 'profile',
        component: PageProfile
    },
    {
        path: '/graph',
        name: 'graph',
        component: PageGraph
    },

    {
        path: '/admin',
        name: 'admin',
        component: PageAdmin
    },

    {
    path: '/admin',
    name: 'admin',
    component: PageAdminView
    },

    {
        path: '/admin/users',
        name: 'admin-users',
        component: PageAdminUsers
    }
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})
