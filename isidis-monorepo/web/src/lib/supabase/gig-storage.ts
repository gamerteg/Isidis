import { createClient } from './client'

const BUCKET = 'gigs'

/**
 * Upload a gig image to Supabase Storage.
 * Path convention: `{timestamp}-{filename}`
 */
export async function uploadGigImage(file: File): Promise<{ url: string | null; error: string | null }> {
    const supabase = createClient()

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`
    const path = `${fileName}`

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
        })

    if (error) {
        console.error('[GigStorage] Upload failed:', error.message)
        // Check if bucket exists error - in dev we might need to handle this
        return { url: null, error: error.message }
    }

    const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path)

    return { url: urlData.publicUrl, error: null }
}
