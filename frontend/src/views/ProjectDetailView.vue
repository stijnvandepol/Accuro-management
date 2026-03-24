<template>
  <div v-if="loading" class="space-y-6">
    <div class="flex items-center gap-4"><div class="skeleton h-5 w-5 rounded"></div><div class="skeleton h-7 w-64"></div><div class="skeleton h-5 w-20 rounded-md"></div></div>
    <div class="skeleton h-20 w-full rounded-lg"></div>
    <div class="flex gap-6 border-b border-zinc-800 pb-3"><div v-for="i in 6" :key="i" class="skeleton h-4 w-24"></div></div>
  </div>

  <div v-else-if="project" class="space-y-6 animate-slide-up">
    <!-- Header -->
    <div class="flex items-start gap-4">
      <button @click="$router.push('/projects')" class="btn-icon mt-0.5"><i class="pi pi-arrow-left text-sm"></i></button>
      <div class="flex-1">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-zinc-100">{{ project.name }}</h2>
          <span :class="statusColor(project.status)" class="badge">{{ project.status.replace(/_/g, ' ') }}</span>
          <div class="flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full" :class="statusDot(project.priority)"></div><span class="text-xs font-mono text-zinc-400">{{ project.priority }}</span></div>
        </div>
        <p class="text-xs font-mono text-zinc-500 mt-1">{{ project.client?.company_name }} · {{ project.project_type?.replace(/_/g, ' ') }} · <span class="text-zinc-600">{{ project.slug }}</span></p>
      </div>
      <button class="btn-secondary" @click="showEditDialog = true"><i class="pi pi-pencil text-xs"></i> Bewerken</button>
    </div>

    <!-- Description -->
    <div v-if="project.description" class="card p-5">
      <h3 class="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Beschrijving</h3>
      <p class="text-sm text-zinc-300 whitespace-pre-wrap">{{ project.description }}</p>
    </div>

    <!-- Tabs -->
    <div class="border-b border-zinc-800">
      <nav class="flex gap-1">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          class="px-3 py-2 text-xs font-medium transition-colors rounded-t-md"
          :class="activeTab === tab.key ? 'text-green-400 bg-zinc-900 border border-zinc-800 border-b-zinc-950 -mb-px' : 'text-zinc-500 hover:text-zinc-300'">
          {{ tab.label }} <span class="font-mono text-zinc-600 ml-1">{{ tab.count }}</span>
        </button>
      </nav>
    </div>

    <!-- Tab: Communication -->
    <div v-if="activeTab === 'communication'" class="space-y-3">
      <div class="flex justify-end"><button class="btn-secondary text-xs" @click="showCommDialog = true"><i class="pi pi-plus text-xs"></i> Toevoegen</button></div>
      <div v-for="entry in communications" :key="entry.id" class="card p-4">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span :class="statusColor(entry.type)" class="badge text-[10px]">{{ entry.type }}</span>
              <span class="text-sm font-medium text-zinc-200">{{ entry.subject }}</span>
            </div>
            <p class="text-sm text-zinc-400 mt-2 whitespace-pre-wrap">{{ entry.content }}</p>
          </div>
          <span class="text-[11px] font-mono text-zinc-600 shrink-0">{{ formatDateTime(entry.occurred_at) }}</span>
        </div>
      </div>
      <p v-if="!communications.length" class="text-center text-sm text-zinc-600 py-8">Geen communicatie</p>
    </div>

    <!-- Tab: Change Requests -->
    <div v-if="activeTab === 'change_requests'" class="space-y-3">
      <div class="flex justify-end"><button class="btn-secondary text-xs" @click="showCRDialog = true"><i class="pi pi-plus text-xs"></i> Nieuw verzoek</button></div>
      <div v-for="cr in changeRequests" :key="cr.id" class="card p-4">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span :class="statusColor(cr.status)" class="badge text-[10px]">{{ cr.status.replace(/_/g, ' ') }}</span>
              <span :class="statusColor(cr.impact)" class="badge text-[10px]">{{ cr.impact }}</span>
              <span class="text-sm font-medium text-zinc-200">{{ cr.title }}</span>
            </div>
            <p class="text-sm text-zinc-400 mt-2">{{ cr.description }}</p>
          </div>
          <div class="flex gap-1 shrink-0 ml-4">
            <button v-if="cr.status !== 'DONE'" class="btn-icon text-green-400" @click="closeCR(cr.id)" title="Sluiten"><i class="pi pi-check text-xs"></i></button>
            <button v-if="cr.status === 'DONE'" class="btn-icon text-amber-400" @click="reopenCR(cr.id)" title="Heropenen"><i class="pi pi-refresh text-xs"></i></button>
          </div>
        </div>
      </div>
      <p v-if="!changeRequests.length" class="text-center text-sm text-zinc-600 py-8">Geen change requests</p>
    </div>

    <!-- Tab: Notes -->
    <div v-if="activeTab === 'notes'" class="space-y-3">
      <div class="flex gap-2">
        <input v-model="newNote" placeholder="Notitie toevoegen..." class="input flex-1" @keyup.enter="addNote" />
        <button class="btn-primary" @click="addNote" :disabled="!newNote.trim()">Toevoegen</button>
      </div>
      <div v-for="note in notes" :key="note.id" class="card p-4 flex justify-between items-start">
        <div>
          <p class="text-sm text-zinc-300">{{ note.content }}</p>
          <p class="text-[11px] font-mono text-zinc-600 mt-1">{{ formatDateTime(note.created_at) }}</p>
        </div>
        <button class="btn-icon text-red-400" @click="deleteNote(note.id)"><i class="pi pi-trash text-xs"></i></button>
      </div>
      <p v-if="!notes.length" class="text-center text-sm text-zinc-600 py-8">Geen notities</p>
    </div>

    <!-- Tab: Repositories -->
    <div v-if="activeTab === 'repositories'" class="space-y-3">
      <div class="flex justify-end"><button class="btn-secondary text-xs" @click="showRepoDialog = true"><i class="pi pi-plus text-xs"></i> Toevoegen</button></div>
      <div v-for="repo in repositories" :key="repo.id" class="card p-4 flex justify-between items-center">
        <div>
          <a :href="repo.repo_url" target="_blank" class="text-sm font-medium text-green-400 hover:text-green-300 transition-colors">{{ repo.repo_name }}</a>
          <p class="text-[11px] font-mono text-zinc-600">{{ repo.default_branch }}</p>
        </div>
        <button class="btn-icon text-red-400" @click="deleteRepo(repo.id)"><i class="pi pi-trash text-xs"></i></button>
      </div>
      <p v-if="!repositories.length" class="text-center text-sm text-zinc-600 py-8">Geen repositories</p>
    </div>

    <!-- Tab: Links -->
    <div v-if="activeTab === 'links'" class="space-y-3">
      <div class="flex justify-end"><button class="btn-secondary text-xs" @click="showLinkDialog = true"><i class="pi pi-plus text-xs"></i> Toevoegen</button></div>
      <div v-for="link in links" :key="link.id" class="card p-4 flex justify-between items-center">
        <div>
          <a :href="link.url" target="_blank" class="text-sm font-medium text-green-400 hover:text-green-300 transition-colors">{{ link.label }}</a>
          <p v-if="link.description" class="text-[11px] text-zinc-500">{{ link.description }}</p>
        </div>
        <button class="btn-icon text-red-400" @click="deleteLink(link.id)"><i class="pi pi-trash text-xs"></i></button>
      </div>
      <p v-if="!links.length" class="text-center text-sm text-zinc-600 py-8">Geen links</p>
    </div>

    <!-- Tab: Facturen -->
    <div v-if="activeTab === 'invoices'" class="space-y-3">
      <div class="flex justify-end">
        <button class="btn-secondary text-xs" @click="openInvoiceDialog"><i class="pi pi-plus text-xs"></i> Nieuwe factuur</button>
      </div>
      <div v-for="inv in invoices" :key="inv.id" class="card p-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="font-mono text-xs text-zinc-300">{{ inv.invoice_number }}</span>
          <span class="text-xs text-zinc-500">{{ formatDate(inv.issue_date) }}</span>
          <span :class="statusColor(inv.status)" class="badge text-[10px]">{{ inv.status }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-mono text-sm font-medium text-zinc-200">{{ formatCurrency(inv.total_amount) }}</span>
          <button class="btn-icon" @click="downloadInvoicePdf(inv)" title="PDF"><i class="pi pi-file-pdf text-xs"></i></button>
          <button v-if="inv.status !== 'PAID'" class="btn-icon text-green-400" @click="markInvoicePaid(inv)" title="Betaald markeren"><i class="pi pi-check text-xs"></i></button>
          <button class="btn-icon text-red-400" @click="deleteInvoice(inv)" title="Verwijderen"><i class="pi pi-trash text-xs"></i></button>
        </div>
      </div>
      <p v-if="!invoices.length" class="text-center text-sm text-zinc-600 py-8">Geen facturen voor dit project</p>
    </div>

    <!-- Communication Dialog -->
    <Dialog v-model:visible="showCommDialog" header="Communicatie toevoegen" modal :style="{ width: '520px' }">
      <form @submit.prevent="addCommunication" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Type</label><Dropdown v-model="commForm.type" :options="commTypes" optionLabel="label" optionValue="value" class="w-full" /></div>
          <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Datum</label><Calendar v-model="commForm.occurred_at" showTime dateFormat="dd-mm-yy" class="w-full" /></div>
          <div class="col-span-2"><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Onderwerp</label><input v-model="commForm.subject" class="input" required /></div>
          <div class="col-span-2"><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Inhoud</label><textarea v-model="commForm.content" class="input min-h-[100px]" required /></div>
        </div>
        <div class="flex justify-end gap-2 pt-3 border-t border-zinc-800">
          <button type="button" class="btn-secondary" @click="showCommDialog = false">Annuleren</button>
          <button type="submit" class="btn-primary" :disabled="saving">Opslaan</button>
        </div>
      </form>
    </Dialog>

    <!-- Change Request Dialog -->
    <Dialog v-model:visible="showCRDialog" header="Nieuw change request" modal :style="{ width: '520px' }">
      <form @submit.prevent="addChangeRequest" class="space-y-4">
        <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Titel</label><input v-model="crForm.title" class="input" required /></div>
        <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Beschrijving</label><textarea v-model="crForm.description" class="input min-h-[80px]" required /></div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Bron</label><Dropdown v-model="crForm.source_type" :options="[{label:'E-mail',value:'EMAIL'},{label:'Telefoon',value:'CALL'},{label:'Formulier',value:'WEBSITE_FORM'},{label:'Intern',value:'INTERNAL'}]" optionLabel="label" optionValue="value" class="w-full" /></div>
          <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Impact</label><Dropdown v-model="crForm.impact" :options="[{label:'Klein',value:'SMALL'},{label:'Gemiddeld',value:'MEDIUM'},{label:'Groot',value:'LARGE'}]" optionLabel="label" optionValue="value" class="w-full" /></div>
        </div>
        <div class="flex justify-end gap-2 pt-3 border-t border-zinc-800">
          <button type="button" class="btn-secondary" @click="showCRDialog = false">Annuleren</button>
          <button type="submit" class="btn-primary" :disabled="saving">Aanmaken</button>
        </div>
      </form>
    </Dialog>

    <!-- Repository Dialog -->
    <Dialog v-model:visible="showRepoDialog" header="Repository toevoegen" modal :style="{ width: '440px' }">
      <form @submit.prevent="addRepo" class="space-y-4">
        <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Naam</label><input v-model="repoForm.repo_name" class="input" placeholder="owner/repo" required /></div>
        <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">URL</label><input v-model="repoForm.repo_url" class="input" placeholder="https://github.com/..." required /></div>
        <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Default branch</label><input v-model="repoForm.default_branch" class="input" /></div>
        <div class="flex justify-end gap-2 pt-3 border-t border-zinc-800">
          <button type="button" class="btn-secondary" @click="showRepoDialog = false">Annuleren</button>
          <button type="submit" class="btn-primary" :disabled="saving">Toevoegen</button>
        </div>
      </form>
    </Dialog>

    <!-- Link Dialog -->
    <Dialog v-model:visible="showLinkDialog" header="Link toevoegen" modal :style="{ width: '440px' }">
      <form @submit.prevent="addLink" class="space-y-4">
        <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Label</label><input v-model="linkForm.label" class="input" required /></div>
        <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">URL</label><input v-model="linkForm.url" class="input" placeholder="https://..." required /></div>
        <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Beschrijving</label><input v-model="linkForm.description" class="input" /></div>
        <div class="flex justify-end gap-2 pt-3 border-t border-zinc-800">
          <button type="button" class="btn-secondary" @click="showLinkDialog = false">Annuleren</button>
          <button type="submit" class="btn-primary" :disabled="saving">Toevoegen</button>
        </div>
      </form>
    </Dialog>

    <!-- Invoice Dialog -->
    <Dialog v-model:visible="showInvoiceDialog" header="Nieuwe factuur" modal :style="{ width: '520px' }">
      <form @submit.prevent="createInvoice" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Subtotaal (excl. BTW)</label>
            <InputNumber v-model="invoiceForm.subtotal" mode="currency" currency="EUR" locale="nl-NL" class="w-full" />
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">BTW-tarief</label>
            <InputNumber v-model="invoiceForm.vat_rate" suffix="%" class="w-full" :min="0" :max="100" />
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Factuurdatum</label>
            <Calendar v-model="invoiceForm.issue_date" dateFormat="dd-mm-yy" class="w-full" />
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Vervaldatum</label>
            <Calendar v-model="invoiceForm.due_date" dateFormat="dd-mm-yy" class="w-full" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Omschrijving</label>
          <textarea v-model="invoiceForm.description" class="input min-h-[60px]" required />
        </div>
        <div>
          <label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Notities</label>
          <textarea v-model="invoiceForm.notes" class="input min-h-[40px]" />
        </div>
        <div class="flex justify-end gap-2 pt-3 border-t border-zinc-800">
          <button type="button" class="btn-secondary" @click="showInvoiceDialog = false">Annuleren</button>
          <button type="submit" class="btn-primary" :disabled="saving">Aanmaken</button>
        </div>
      </form>
    </Dialog>

    <!-- Edit Project Dialog -->
    <Dialog v-model:visible="showEditDialog" header="Project bewerken" modal :style="{ width: '560px' }">
      <form @submit.prevent="updateProject" class="space-y-4">
        <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Projectnaam</label><input v-model="editForm.name" class="input" /></div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Status</label><Dropdown v-model="editForm.status" :options="statusOptions" optionLabel="label" optionValue="value" class="w-full" /></div>
          <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Prioriteit</label><Dropdown v-model="editForm.priority" :options="priorityOptions" optionLabel="label" optionValue="value" class="w-full" /></div>
        </div>
        <div><label class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Beschrijving</label><textarea v-model="editForm.description" class="input min-h-[80px]" /></div>
        <div class="flex justify-end gap-2 pt-3 border-t border-zinc-800">
          <button type="button" class="btn-secondary" @click="showEditDialog = false">Annuleren</button>
          <button type="submit" class="btn-primary" :disabled="saving">Opslaan</button>
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectsApi, communicationApi, changeRequestsApi, notesApi, repositoriesApi, linksApi, invoicesApi } from '@/api/services'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import InputNumber from 'primevue/inputnumber'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { formatDate, formatDateTime, formatCurrency, statusColor, statusDot, downloadBlob } = useFormatting()

const project = ref<any>(null)
const loading = ref(true)
const saving = ref(false)
const activeTab = ref('communication')

const communications = ref<any[]>([])
const changeRequests = ref<any[]>([])
const notes = ref<any[]>([])
const repositories = ref<any[]>([])
const links = ref<any[]>([])
const invoices = ref<any[]>([])
const newNote = ref('')

const showCommDialog = ref(false)
const showCRDialog = ref(false)
const showRepoDialog = ref(false)
const showLinkDialog = ref(false)
const showEditDialog = ref(false)
const showInvoiceDialog = ref(false)

const commForm = ref<any>({ type: 'EMAIL', subject: '', content: '', occurred_at: new Date() })
const crForm = ref<any>({ title: '', description: '', source_type: 'INTERNAL', impact: 'MEDIUM' })
const repoForm = ref<any>({ repo_name: '', repo_url: '', default_branch: 'main' })
const linkForm = ref<any>({ label: '', url: '', description: '' })
const editForm = ref<any>({})
const invoiceForm = ref<any>({ subtotal: 0, vat_rate: 21, issue_date: new Date(), due_date: new Date(Date.now() + 30 * 86400000), description: '', notes: '' })

const statusOptions = [
  { label: 'Lead', value: 'LEAD' }, { label: 'Intake', value: 'INTAKE' },
  { label: 'In Progress', value: 'IN_PROGRESS' }, { label: 'Wachtend', value: 'WAITING_FOR_CLIENT' },
  { label: 'Review', value: 'REVIEW' }, { label: 'Afgerond', value: 'COMPLETED' },
  { label: 'Onderhoud', value: 'MAINTENANCE' }, { label: 'Gepauzeerd', value: 'PAUSED' },
]
const priorityOptions = [
  { label: 'Laag', value: 'LOW' }, { label: 'Gemiddeld', value: 'MEDIUM' },
  { label: 'Hoog', value: 'HIGH' }, { label: 'Urgent', value: 'URGENT' },
]
const commTypes = [
  { label: 'E-mail', value: 'EMAIL' }, { label: 'Telefoon', value: 'CALL' },
  { label: 'Meeting', value: 'MEETING' }, { label: 'WhatsApp', value: 'WHATSAPP' },
  { label: 'DM', value: 'DM' }, { label: 'Intern', value: 'INTERNAL' }, { label: 'Overig', value: 'OTHER' },
]

const tabs = computed(() => [
  { key: 'communication', label: 'Communicatie', count: communications.value.length },
  { key: 'change_requests', label: 'Change Requests', count: changeRequests.value.length },
  { key: 'notes', label: 'Notities', count: notes.value.length },
  { key: 'repositories', label: 'Repos', count: repositories.value.length },
  { key: 'links', label: 'Links', count: links.value.length },
  { key: 'invoices', label: 'Facturen', count: invoices.value.length },
])

onMounted(async () => {
  const id = route.params.id as string
  try {
    const { data } = await projectsApi.get(id)
    project.value = data
    editForm.value = { name: data.name, status: data.status, priority: data.priority, description: data.description }
    await loadAllTabs(id)
  } catch { router.push('/projects') }
  loading.value = false
})

async function loadAllTabs(projectId: string) {
  const [comms, crs, n, repos, lnks, invs] = await Promise.all([
    communicationApi.list(projectId).catch(() => ({ data: [] })),
    changeRequestsApi.list(projectId).catch(() => ({ data: [] })),
    notesApi.list(projectId).catch(() => ({ data: [] })),
    repositoriesApi.list(projectId).catch(() => ({ data: [] })),
    linksApi.list(projectId).catch(() => ({ data: [] })),
    invoicesApi.list({ project_id: projectId }).catch(() => ({ data: [] })),
  ])
  communications.value = comms.data
  changeRequests.value = crs.data
  notes.value = n.data
  repositories.value = repos.data
  links.value = lnks.data
  invoices.value = invs.data
}

async function addCommunication() {
  saving.value = true
  try {
    await communicationApi.create(project.value.id, { ...commForm.value, occurred_at: commForm.value.occurred_at.toISOString() })
    showCommDialog.value = false; commForm.value = { type: 'EMAIL', subject: '', content: '', occurred_at: new Date() }
    const { data } = await communicationApi.list(project.value.id); communications.value = data
    toast.add({ severity: 'success', summary: 'Toegevoegd', life: 3000 })
  } catch (err: any) { toast.add({ severity: 'error', summary: 'Fout', detail: err.response?.data?.detail, life: 5000 }) }
  saving.value = false
}

async function addChangeRequest() {
  saving.value = true
  try {
    await changeRequestsApi.create(project.value.id, crForm.value)
    showCRDialog.value = false; crForm.value = { title: '', description: '', source_type: 'INTERNAL', impact: 'MEDIUM' }
    const { data } = await changeRequestsApi.list(project.value.id); changeRequests.value = data
    toast.add({ severity: 'success', summary: 'Aangemaakt', life: 3000 })
  } catch (err: any) { toast.add({ severity: 'error', summary: 'Fout', detail: err.response?.data?.detail, life: 5000 }) }
  saving.value = false
}

async function closeCR(id: string) { await changeRequestsApi.close(id); const { data } = await changeRequestsApi.list(project.value.id); changeRequests.value = data }
async function reopenCR(id: string) { await changeRequestsApi.reopen(id); const { data } = await changeRequestsApi.list(project.value.id); changeRequests.value = data }

async function addNote() {
  if (!newNote.value.trim()) return
  await notesApi.create(project.value.id, { content: newNote.value }); newNote.value = ''
  const { data } = await notesApi.list(project.value.id); notes.value = data
}
async function deleteNote(id: string) { await notesApi.delete(id); notes.value = notes.value.filter(n => n.id !== id) }

async function addRepo() {
  saving.value = true
  try {
    await repositoriesApi.create(project.value.id, repoForm.value)
    showRepoDialog.value = false; repoForm.value = { repo_name: '', repo_url: '', default_branch: 'main' }
    const { data } = await repositoriesApi.list(project.value.id); repositories.value = data
  } catch (err: any) { toast.add({ severity: 'error', summary: 'Fout', detail: err.response?.data?.detail, life: 5000 }) }
  saving.value = false
}
async function deleteRepo(id: string) { await repositoriesApi.delete(id); repositories.value = repositories.value.filter(r => r.id !== id) }

async function addLink() {
  saving.value = true
  try {
    await linksApi.create(project.value.id, linkForm.value)
    showLinkDialog.value = false; linkForm.value = { label: '', url: '', description: '' }
    const { data } = await linksApi.list(project.value.id); links.value = data
  } catch (err: any) { toast.add({ severity: 'error', summary: 'Fout', detail: err.response?.data?.detail, life: 5000 }) }
  saving.value = false
}
async function deleteLink(id: string) { await linksApi.delete(id); links.value = links.value.filter(l => l.id !== id) }

async function updateProject() {
  saving.value = true
  try {
    const { data } = await projectsApi.update(project.value.id, editForm.value)
    Object.assign(project.value, data); showEditDialog.value = false
    toast.add({ severity: 'success', summary: 'Bijgewerkt', life: 3000 })
  } catch (err: any) { toast.add({ severity: 'error', summary: 'Fout', detail: err.response?.data?.detail, life: 5000 }) }
  saving.value = false
}

async function downloadInvoicePdf(inv: any) {
  try { const { data } = await invoicesApi.downloadPdf(inv.id); downloadBlob(data, `factuur-${inv.invoice_number}.pdf`) }
  catch { toast.add({ severity: 'error', summary: 'PDF mislukt', life: 5000 }) }
}

function openInvoiceDialog() {
  invoiceForm.value = { subtotal: 0, vat_rate: 21, issue_date: new Date(), due_date: new Date(Date.now() + 30 * 86400000), description: '', notes: '' }
  showInvoiceDialog.value = true
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function createInvoice() {
  saving.value = true
  try {
    await invoicesApi.create({
      client_id: project.value.client_id,
      project_id: project.value.id,
      subtotal: invoiceForm.value.subtotal,
      vat_rate: invoiceForm.value.vat_rate,
      issue_date: fmtDate(invoiceForm.value.issue_date),
      due_date: fmtDate(invoiceForm.value.due_date),
      description: invoiceForm.value.description,
      notes: invoiceForm.value.notes || undefined,
    })
    showInvoiceDialog.value = false
    const { data } = await invoicesApi.list({ project_id: project.value.id })
    invoices.value = data
    toast.add({ severity: 'success', summary: 'Factuur aangemaakt', life: 3000 })
  } catch (err: any) { toast.add({ severity: 'error', summary: 'Fout', detail: err.response?.data?.detail, life: 5000 }) }
  saving.value = false
}

async function markInvoicePaid(inv: any) {
  try {
    await invoicesApi.markPaid(inv.id)
    const { data } = await invoicesApi.list({ project_id: project.value.id })
    invoices.value = data
    toast.add({ severity: 'success', summary: 'Factuur betaald', life: 3000 })
  } catch (err: any) { toast.add({ severity: 'error', summary: 'Fout', detail: err.response?.data?.detail, life: 5000 }) }
}

async function deleteInvoice(inv: any) {
  try {
    await invoicesApi.delete(inv.id)
    invoices.value = invoices.value.filter(i => i.id !== inv.id)
    toast.add({ severity: 'success', summary: 'Factuur verwijderd', life: 3000 })
  } catch (err: any) { toast.add({ severity: 'error', summary: 'Fout', detail: err.response?.data?.detail, life: 5000 }) }
}
</script>
