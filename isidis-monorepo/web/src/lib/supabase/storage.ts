import { createClient } from './client'

interface UploadResponse {
  data?: {
    url?: string | null
    file_name?: string | null
  }
  error?: string
}

async function uploadReadingAsset(
  orderId: string,
  file: File,
  type: 'audio' | 'photo',
): Promise<{ url: string | null; error: string | null; fileName?: string | null }> {
  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      return { url: null, error: 'Nao autenticado.' }
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/orders/${orderId}/delivery/upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      },
    )

    const payload = (await response.json().catch(() => null)) as UploadResponse | null

    if (!response.ok) {
      return {
        url: null,
        error: payload?.error || 'Nao foi possivel enviar o arquivo da leitura.',
      }
    }

    return {
      url: payload?.data?.url ?? null,
      error: null,
      fileName: payload?.data?.file_name ?? null,
    }
  } catch (error: any) {
    return {
      url: null,
      error: error?.message || 'Nao foi possivel enviar o arquivo da leitura.',
    }
  }
}

export async function uploadReadingFile(
  orderId: string,
  _sectionId: string,
  file: File,
): Promise<{ url: string | null; error: string | null; fileName?: string | null }> {
  const type = file.type.startsWith('image/') ? 'photo' : 'audio'
  return uploadReadingAsset(orderId, file, type)
}

export async function uploadReadingBlob(
  orderId: string,
  sectionId: string,
  blob: Blob,
  filename: string,
): Promise<{ url: string | null; error: string | null; fileName?: string | null }> {
  const file = new File([blob], filename, { type: blob.type || 'audio/webm' })
  return uploadReadingFile(orderId, sectionId, file)
}

export async function deleteReadingFile(_path: string): Promise<boolean> {
  return false
}
