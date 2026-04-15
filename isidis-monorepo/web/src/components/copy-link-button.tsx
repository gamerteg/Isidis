
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface CopyLinkButtonProps {
    url: string
    variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    className?: string
    text?: string
}

export function CopyLinkButton({ url, variant = 'outline', size = 'sm', className, text = 'Copiar Link' }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
        navigator.clipboard.writeText(fullUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleCopy}
            className={className}
            type="button"
        >
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copiado!' : text}
        </Button>
    )
}

export function CopyLinkIconButton({ url, className }: { url: string, className?: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
        navigator.clipboard.writeText(fullUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className={className}
            title="Copiar Link"
            type="button"
        >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    )
}
