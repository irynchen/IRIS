import axios from 'axios'

export interface ShoppingList {
  id: number
  name: string
  icon: string
  sort_order: number
  item_count: number
  checked_count: number
}

export interface ShoppingItem {
  id: number
  list_id: number
  name: string
  quantity: number | null
  unit: string | null
  category: string | null
  barcode: string | null
  checked: boolean
  notes: string | null
  sort_order: number
}

export interface CatalogEntry {
  barcode: string
  name: string
  brand: string | null
  category: string | null
  unit: string | null
}

const api = axios.create({ baseURL: '/api/shopping' })
api.interceptors.request.use((c) => {
  const token = localStorage.getItem('iris_token')
  if (token) c.headers.Authorization = `Bearer ${token}`
  return c
})

export const shoppingApi = {
  getLists: () => api.get<ShoppingList[]>('/lists').then((r) => r.data),
  createList: (name: string, icon = '🛒') =>
    api.post<ShoppingList>('/lists', { name, icon }).then((r) => r.data),
  updateList: (id: number, data: Partial<{ name: string; icon: string }>) =>
    api.patch<ShoppingList>(`/lists/${id}`, data).then((r) => r.data),
  deleteList: (id: number) => api.delete(`/lists/${id}`),

  getItems: (listId: number) =>
    api.get<ShoppingItem[]>(`/lists/${listId}/items`).then((r) => r.data),
  addItem: (listId: number, data: Partial<ShoppingItem>) =>
    api.post<ShoppingItem>(`/lists/${listId}/items`, data).then((r) => r.data),
  updateItem: (id: number, data: Partial<ShoppingItem>) =>
    api.patch<ShoppingItem>(`/items/${id}`, data).then((r) => r.data),
  deleteItem: (id: number) => api.delete(`/items/${id}`),
  deleteChecked: (listId: number) => api.delete(`/lists/${listId}/checked`),
  checkAll: (listId: number, checked: boolean) =>
    api.post('/items/check-all', { list_id: listId, checked }),

  getCatalog: (barcode: string) =>
    api.get<CatalogEntry>(`/catalog/${barcode}`).then((r) => r.data),
  saveCatalog: (entry: CatalogEntry) =>
    api.post<CatalogEntry>('/catalog', entry).then((r) => r.data),

  getSuggestions: () => api.get<string[]>('/suggestions').then((r) => r.data),
}

// ── Open Food Facts lookup (client-side, no CORS issues) ──────────────────

export interface FoodFactsResult {
  name: string
  brand: string | null
  category: string | null
  quantity: string | null
}

export async function lookupBarcode(barcode: string): Promise<FoodFactsResult | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    )
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    const name: string =
      p.product_name_de || p.product_name || p.abbreviated_product_name || ''
    if (!name) return null
    return {
      name,
      brand: p.brands || null,
      category: mapOffCategory(p.categories_tags?.[0] || ''),
      quantity: p.quantity || null,
    }
  } catch {
    return null
  }
}

function mapOffCategory(tag: string): string | null {
  if (!tag) return null
  if (/dairy|milch|joghurt|käse|butter/i.test(tag)) return '🥛 Milch & Käse'
  if (/meat|fleisch|geflügel|wurst/i.test(tag)) return '🥩 Fleisch & Fisch'
  if (/fish|fisch|seafood/i.test(tag)) return '🥩 Fleisch & Fisch'
  if (/fruits|obst|vegetables|gemüse/i.test(tag)) return '🥬 Obst & Gemüse'
  if (/bread|brot|backwaren/i.test(tag)) return '🍞 Brot & Backwaren'
  if (/beverage|getränke|drink|water|juice/i.test(tag)) return '🥤 Getränke'
  if (/sweet|süß|chocolate|candy|snack/i.test(tag)) return '🍫 Süßes & Snacks'
  if (/frozen|tiefkühl/i.test(tag)) return '🧊 Tiefkühl'
  if (/hygiene|beauty|body-care|shampoo/i.test(tag)) return '🧴 Körperpflege'
  if (/household|haushalt|cleaning/i.test(tag)) return '🧹 Haushalt'
  return null
}

// ── Client-side auto-categorizer ──────────────────────────────────────────

const CATEGORY_RULES: [string, RegExp][] = [
  ['🥬 Obst & Gemüse', /apfel|birne|banane|orange|tomate|gurke|salat|karotte|paprika|zwiebel|knoblauch|zitrone|avocado|spinat|brokkoli|blumenkohl|erbsen|pilze|lauch|fenchel|mango|erdbeere|heidelbeere|kirsche|pflaume|pfirsich|melone/i],
  ['🥛 Milch & Käse', /milch|joghurt|käse|butter|quark|sahne|schmand|frischkäse|mozzarella|parmesan|creme fraiche|kefir|skyr/i],
  ['🥩 Fleisch & Fisch', /hähnchen|hühnchen|rind|schwein|lamm|hackfleisch|lachs|thunfisch|garnelen|wurst|schinken|speck|salami|steak|schnitzel|filet/i],
  ['🍞 Brot & Backwaren', /brot|brötchen|toast|croissant|kuchen|torte|gebäck|bagel|ciabatta|baguette|laugen/i],
  ['🥤 Getränke', /wasser|saft|kaffee|tee|cola|limonade|bier|wein|smoothie|energy drink|mineralwasser|sprudel/i],
  ['🍫 Süßes & Snacks', /schokolade|chips|kekse|bonbon|gummibär|eis|nüsse|mandeln|müsli|cornflakes|schokoriegel|pralinen/i],
  ['🧴 Körperpflege', /shampoo|duschgel|zahnpasta|deo|creme|lotion|seife|conditioner|rasierer|bodymilk|sonnencreme/i],
  ['🧹 Haushalt', /spülmittel|waschmittel|reiniger|müllbeutel|schwamm|toilettenpapier|küchenrolle|frischhaltefolie|alufolie|gefrierbeutel/i],
  ['🧊 Tiefkühl', /tiefkühl|gefrier|pommes|tk-/i],
  ['🥫 Trockenwaren', /nudeln|pasta|reis|linsen|bohnen|kichererbsen|mehl|zucker|salz|pfeffer|gewürz|öl|essig|senf|ketchup|soße|brühe|haferflocken|couscous/i],
  ['🥚 Eier & Basics', /ei|eier|mayonnaise|mayo/i],
  ['💊 Drogerie', /medikament|vitamin|tablette|aspirin|ibuprofen|supplement|magnesium/i],
]

export function autoCategory(name: string): string {
  for (const [cat, rx] of CATEGORY_RULES) {
    if (rx.test(name)) return cat
  }
  return '📦 Sonstiges'
}

export const UNITS = ['Stück', 'g', 'kg', 'ml', 'l', 'Packung', 'Flasche', 'Dose', 'Beutel', 'Becher', 'Glas', 'Tube']

export const CATEGORIES = [
  '🥬 Obst & Gemüse',
  '🥛 Milch & Käse',
  '🥩 Fleisch & Fisch',
  '🍞 Brot & Backwaren',
  '🥤 Getränke',
  '🍫 Süßes & Snacks',
  '🧴 Körperpflege',
  '🧹 Haushalt',
  '🧊 Tiefkühl',
  '🥫 Trockenwaren',
  '🥚 Eier & Basics',
  '💊 Drogerie',
  '📦 Sonstiges',
]
