import {createRouter, createWebHistory} from 'vue-router'
import Home from '@/views/Home.vue';
import Capabilities from '@/views/Capabilities.vue';
import Use from '@/views/Use.vue';

const routes = [
    { path: '/', redirect: '/home'},
    { path: '/home', component: Home },
    { path: '/capabilities', component: Capabilities },
    { path: '/use/:id', component: Use }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router;