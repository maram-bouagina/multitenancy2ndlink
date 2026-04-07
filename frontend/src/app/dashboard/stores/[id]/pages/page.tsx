'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit, Trash2, Globe, FileText, Tag, Megaphone, BookOpen, Info } from 'lucide-react'
import { usePages, useCreatePage, useDeletePage } from '@/lib/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PageType, CreatePageRequest } from '@/lib/types'

const PAGE_TYPE_CONFIG = {
  home:  { label: 'Accueil',     icon: Globe,      color: 'bg-blue-100 text-blue-800' },
  promo: { label: 'Promotion',   icon: Megaphone,  color: 'bg-red-100 text-red-800' },
  blog:  { label: 'Blog',        icon: BookOpen,   color: 'bg-green-100 text-green-800' },
  info:  { label: 'Information', icon: Info,       color: 'bg-gray-100 text-gray-800' },
} as const

function slugify(str: string) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function PagesPage() {
  const params = useParams()
  const router = useRouter()
  const storeId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? ''

  const { data: pages = [], isLoading } = usePages(storeId)
  const createMutation = useCreatePage()
  const deleteMutation = useDeletePage()

  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [form, setForm] = useState<CreatePageRequest>({ type: 'info', title: '', slug: '' })

  function handleTitleChange(title: string) {
    setForm(f => ({ ...f, title, slug: slugify(title) }))
  }

  async function handleCreate() {
    if (!form.title || !form.slug) return
    await createMutation.mutateAsync({ storeId, data: form })
    setShowCreate(false)
    setForm({ type: 'info', title: '', slug: '' })
  }

  async function handleDelete(pageId: string) {
    await deleteMutation.mutateAsync({ storeId, pageId })
    setDeleteTarget(null)
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">Loading pages…</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/dashboard/stores/${storeId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Pages de la vitrine</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez et personnalisez les pages publiques de votre boutique
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle page
        </Button>
      </div>

      <div className="grid gap-4">
        {pages.map(page => {
          const config = PAGE_TYPE_CONFIG[page.type as PageType] ?? PAGE_TYPE_CONFIG.info
          const Icon = config.icon
          const isHome = page.slug === 'index' && page.type === 'home'

          return (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`rounded-lg p-2.5 ${config.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{page.title}</span>
                    <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                      {page.status === 'published' ? 'Publié' : 'Brouillon'}
                    </Badge>
                    {isHome && (
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        Page d'accueil
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    /store/…/{page.slug === 'index' ? '' : `p/${page.slug}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/dashboard/stores/${storeId}/editor?pageId=${page.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-3.5 w-3.5 mr-1.5" /> Éditer
                    </Button>
                  </Link>
                  {!isHome && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteTarget(page.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle page</DialogTitle>
            <DialogDescription>
              Choisissez un type, un titre et un slug pour votre page.
              Elle sera créée avec un contenu par défaut prêt à personnaliser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Type de page</Label>
              <Select
                value={form.type}
                onValueChange={v => setForm(f => ({ ...f, type: v as PageType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promo">Promotion / Offres</SelectItem>
                  <SelectItem value="blog">Blog / Articles</SelectItem>
                  <SelectItem value="info">Information (À propos, Contact, Légal…)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input
                value={form.title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Ex: Soldes d'été"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (URL)</Label>
              <Input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="soldes-ete"
              />
              <p className="text-xs text-gray-400">
                Accessible sur : /store/…/p/{form.slug || 'votre-slug'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button
              onClick={handleCreate}
              disabled={!form.title || !form.slug || createMutation.isPending}
            >
              {createMutation.isPending ? 'Création…' : 'Créer la page'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette page ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. La page sera supprimée et son URL ne sera plus accessible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}