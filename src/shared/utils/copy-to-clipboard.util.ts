const fallbackCopyToClipboard = (text: string): boolean => {
    const textArea = document.createElement('textarea')
    textArea.value = text

    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
        return document.execCommand('copy')
    } catch {
        return false
    } finally {
        document.body.removeChild(textArea)
    }
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch {
            // HTTP deployments fall back to the legacy copy command below.
        }
    }

    return fallbackCopyToClipboard(text)
}
