<template>
  <div class="flex h-screen overflow-hidden bg-zinc-950">
    <!-- Sidebar -->
    <aside
      class="group flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-300 ease-out overflow-hidden shrink-0"
      :class="sidebarExpanded ? 'w-56' : 'w-16'"
      @mouseenter="sidebarExpanded = true"
      @mouseleave="sidebarExpanded = false"
    >
      <!-- Logo -->
      <div class="h-14 flex items-center px-4 border-b border-zinc-800 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
          <span class="text-green-400 font-bold text-sm">A</span>
        </div>
        <span
          class="ml-3 text-sm font-semibold text-zinc-100 whitespace-nowrap transition-opacity duration-200"
          :class="sidebarExpanded ? 'opacity-100' : 'opacity-0'"
        >AgencyOS</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        <router-link
          v-for="item in visibleMenuItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 group/item relative"
          :class="isActive(item.to)
            ? 'bg-green-500/10 text-green-400'
            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'"
        >
          <i :class="item.icon" class="text-[15px] w-5 text-center shrink-0"></i>
          <span
            class="whitespace-nowrap transition-opacity duration-200"
            :class="sidebarExpanded ? 'opacity-100' : 'opacity-0 w-0'"
          >{{ item.label }}</span>
          <!-- Active indicator -->
          <div
            v-if="isActive(item.to)"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-green-400 rounded-r"
          ></div>
        </router-link>
      </nav>

      <!-- User -->
      <div class="p-2 border-t border-zinc-800 shrink-0">
        <div class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer" @click="auth.logout()">
          <div class="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono font-medium text-zinc-300 shrink-0">
            {{ initials }}
          </div>
          <div
            class="flex-1 min-w-0 transition-opacity duration-200"
            :class="sidebarExpanded ? 'opacity-100' : 'opacity-0 w-0'"
          >
            <p class="text-xs font-medium text-zinc-300 truncate">{{ auth.user?.name }}</p>
            <p class="text-[10px] text-zinc-500 font-mono">{{ auth.user?.role }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Top bar -->
      <header class="h-14 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
        <div class="flex items-center gap-3">
          <h1 class="text-sm font-medium text-zinc-100">{{ pageTitle }}</h1>
          <span v-if="pageSubtitle" class="text-xs text-zinc-500 font-mono">{{ pageSubtitle }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-mono text-zinc-600">v1.0</span>
        </div>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-6 animate-fade-in">
          <router-view />
        </div>
      </div>
    </main>

    <Toast position="bottom-right" />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

const auth = useAuthStore()
const route = useRoute()
const sidebarExpanded = ref(false)

const menuItems = [
  { to: '/', label: 'Dashboard', icon: 'pi pi-objects-column', roles: ['ADMIN', 'EMPLOYEE'] },
  { to: '/clients', label: 'Klanten', icon: 'pi pi-building', roles: ['ADMIN', 'EMPLOYEE', 'FINANCE'] },
  { to: '/projects', label: 'Projecten', icon: 'pi pi-folder', roles: ['ADMIN', 'EMPLOYEE'] },
  { to: '/invoices', label: 'Facturen', icon: 'pi pi-receipt', roles: ['ADMIN', 'FINANCE'] },
  { to: '/proposals', label: 'Offertes', icon: 'pi pi-file-edit', roles: ['ADMIN', 'EMPLOYEE'] },
  { to: '/finance', label: 'Financieel', icon: 'pi pi-chart-line', roles: ['ADMIN', 'FINANCE'] },
  { to: '/settings', label: 'Instellingen', icon: 'pi pi-sliders-h', roles: ['ADMIN'] },
]

const visibleMenuItems = computed(() =>
  menuItems.filter((item) => auth.hasRole(...item.roles))
)

const pageTitles: Record<string, [string, string?]> = {
  dashboard: ['Dashboard'],
  clients: ['Klanten', 'overzicht'],
  'client-detail': ['Klant'],
  projects: ['Projecten', 'overzicht'],
  'project-detail': ['Project'],
  invoices: ['Facturen', 'overzicht'],
  proposals: ['Offertes', 'overzicht'],
  finance: ['Financieel', 'overzicht'],
  settings: ['Instellingen', 'beheer'],
}

const pageTitle = computed(() => pageTitles[route.name as string]?.[0] || 'AgencyOS')
const pageSubtitle = computed(() => pageTitles[route.name as string]?.[1] || '')

const initials = computed(() => {
  const name = auth.user?.name || ''
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
})

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
