<template>
  <div v-if="loading" class="space-y-6">
    <div class="grid grid-cols-3 gap-4"><div v-for="i in 3" :key="i" class="card p-6"><div class="skeleton h-3 w-20 mb-3"></div><div class="skeleton h-8 w-32"></div></div></div>
  </div>
  <div v-else class="space-y-6 animate-slide-up">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card-glow p-6"><p class="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Omzet (betaald)</p><p class="text-2xl font-semibold text-green-600 mt-2 font-mono">{{ formatCurrency(overview?.total_revenue) }}</p></div>
      <div class="card-glow p-6"><p class="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Openstaand</p><p class="text-2xl font-semibold text-blue-600 mt-2 font-mono">{{ formatCurrency(overview?.open_amount) }}</p></div>
      <div class="card-glow p-6"><p class="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Achterstallig</p><p class="text-2xl font-semibold mt-2 font-mono" :class="parseFloat(overview?.overdue_amount||0) > 0 ? 'text-red-600' : 'text-gray-500'">{{ formatCurrency(overview?.overdue_amount) }}</p></div>
    </div>
    <div class="card">
      <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between"><h2 class="text-sm font-medium text-gray-800">BTW per kwartaal</h2><span class="text-[10px] font-mono text-gray-400">{{ currentYear }}</span></div>
      <div class="grid grid-cols-4 divide-x divide-gray-200">
        <div v-for="q in ['Q1','Q2','Q3','Q4']" :key="q" class="p-5">
          <p class="text-xs font-mono font-medium text-gray-500 mb-3">{{ q }}</p>
          <div v-if="overview?.vat_by_quarter?.[q]?.length" class="space-y-2">
            <div v-for="vat in overview.vat_by_quarter[q]" :key="vat.vat_rate" class="flex justify-between text-xs"><span class="font-mono text-gray-500">{{ vat.vat_rate }}%</span><span class="font-mono text-gray-700">{{ formatCurrency(vat.vat_amount) }}</span></div>
          </div>
          <p v-else class="text-[10px] text-gray-300 font-mono">Geen data</p>
        </div>
      </div>
    </div>
    <div class="card p-5">
      <h2 class="text-sm font-medium text-gray-800 mb-4">Rapporten</h2>
      <div class="flex flex-wrap items-end gap-4">
        <div><label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Jaar</label><InputNumber v-model="reportYear" :min="2020" :max="2030" :useGrouping="false" class="w-24" /></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Maand</label><Dropdown v-model="reportMonth" :options="monthOptions" optionLabel="label" optionValue="value" class="w-36" /></div>
        <button class="btn-secondary" @click="downloadMonthly"><i class="pi pi-file-pdf text-xs"></i> Maand PDF</button>
        <button class="btn-secondary" @click="downloadYearly"><i class="pi pi-file-pdf text-xs"></i> Jaar PDF</button>
        <button class="btn-ghost" @click="downloadYearlyCsv"><i class="pi pi-download text-xs"></i> Jaar CSV</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { financeApi } from '@/api/services'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from 'primevue/usetoast'
import { useErrorHandler } from '@/composables/useErrorHandler'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'

const toast = useToast()
const { showError, showSuccess } = useErrorHandler()
const { formatCurrency, downloadBlob } = useFormatting()
const overview = ref<any>(null)
const loading = ref(true)
const currentYear = new Date().getFullYear()
const reportYear = ref(currentYear)
const reportMonth = ref(new Date().getMonth() + 1)
const monthOptions = [{label:'Jan',value:1},{label:'Feb',value:2},{label:'Mrt',value:3},{label:'Apr',value:4},{label:'Mei',value:5},{label:'Jun',value:6},{label:'Jul',value:7},{label:'Aug',value:8},{label:'Sep',value:9},{label:'Okt',value:10},{label:'Nov',value:11},{label:'Dec',value:12}]

onMounted(async () => { try { const { data } = await financeApi.overview(); overview.value = data } catch {}; loading.value = false })

async function downloadMonthly() { try { const { data } = await financeApi.monthlyReport(reportYear.value, reportMonth.value, 'pdf'); downloadBlob(data, `rapport-${reportYear.value}-${String(reportMonth.value).padStart(2,'0')}.pdf`) } catch (err: any) { showError(err, 'Downloaden mislukt') } }
async function downloadYearly() { try { const { data } = await financeApi.yearlyReport(reportYear.value, 'pdf'); downloadBlob(data, `jaarrapport-${reportYear.value}.pdf`) } catch (err: any) { showError(err, 'Downloaden mislukt') } }
async function downloadYearlyCsv() { try { const { data } = await financeApi.yearlyReport(reportYear.value, 'csv'); downloadBlob(new Blob([data], { type: 'text/csv' }), `jaarrapport-${reportYear.value}.csv`) } catch (err: any) { showError(err, 'Downloaden mislukt') } }
</script>
