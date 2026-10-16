import { useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@/i18n'
import { uploadFile, deleteStoredFile } from '@/lib/api'
import { useAdminTenantId } from '@/hooks/useAdminTenant'
import { Button } from '@/components/ui/button'

// Uploads to a Supabase Storage bucket and stores the returned URL.
export function UploadField({ bucket, value, onChange, accept, label }: {
  bucket: string; value: string; onChange: (url: string) => void; accept: string; label?: string
}) {
  const t = useT()
  const ref = useRef<HTMLInputElement>(null)
  const tenantId = useAdminTenantId()
  const [busy, setBusy] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    const old = value
    try {
      const url = await uploadFile(bucket, file, tenantId)
      // New file uploaded & registered first — only then remove the old one.
      onChange(url)
      if (old && old !== url) deleteStoredFile(bucket, old)
      toast.success(t.admin.saved)
    } catch { toast.error(t.admin.saveError) }
    finally { setBusy(false); if (ref.current) ref.current.value = '' }
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" disabled={busy} onClick={() => ref.current?.click()} className="border-border">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy ? t.admin.form.uploading : t.admin.form.chooseFile}
        </Button>
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={onFile} />
      </div>
      {value && accept.startsWith('image') && <img src={value} alt="" className="h-24 rounded-lg border border-border object-cover" />}
      {value && !accept.startsWith('image') && <p className="text-xs text-muted-foreground break-all" dir="ltr">{t.admin.form.currentFile}: {value.split('/').pop()}</p>}
    </div>
  )
}
