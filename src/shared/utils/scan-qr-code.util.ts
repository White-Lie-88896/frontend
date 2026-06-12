import jsQR from 'jsqr'

type BarcodeDetectorResult = {
    displayValue?: string
    rawValue?: string
}

type BarcodeDetectorSource = HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | ImageBitmap

interface NativeBarcodeDetector {
    detect(source: BarcodeDetectorSource): Promise<BarcodeDetectorResult[]>
}

interface NativeBarcodeDetectorConstructor {
    getSupportedFormats?: () => Promise<string[]>
    new (options?: { formats?: string[] }): NativeBarcodeDetector
}

const getBarcodeDetector = (): NativeBarcodeDetectorConstructor | null => {
    return (
        (globalThis as unknown as { BarcodeDetector?: NativeBarcodeDetectorConstructor })
            .BarcodeDetector ?? null
    )
}

const getQrValue = (results: BarcodeDetectorResult[]): string | null => {
    const value = results
        .map((result) => result.rawValue ?? result.displayValue ?? '')
        .find((item) => item.trim())

    return value?.trim() || null
}

export const isQrCodeScanSupported = async (): Promise<boolean> => {
    const BarcodeDetector = getBarcodeDetector()
    if (!BarcodeDetector) return typeof document !== 'undefined'

    if (!BarcodeDetector.getSupportedFormats) return true

    try {
        const formats = await BarcodeDetector.getSupportedFormats()
        return formats.includes('qr_code') || typeof document !== 'undefined'
    } catch {
        return true
    }
}

const scanWithNativeDetector = async (bitmap: ImageBitmap): Promise<string | null> => {
    const BarcodeDetector = getBarcodeDetector()
    if (!BarcodeDetector) return null

    try {
        if (BarcodeDetector.getSupportedFormats) {
            const formats = await BarcodeDetector.getSupportedFormats()
            if (!formats.includes('qr_code')) return null
        }

        const detector = new BarcodeDetector({ formats: ['qr_code'] })
        return getQrValue(await detector.detect(bitmap))
    } catch {
        return null
    }
}

const scanWithJsQr = (bitmap: ImageBitmap): string | null => {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
        throw new Error('Unable to read this image.')
    }

    context.drawImage(bitmap, 0, 0)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
    })

    return result?.data.trim() || null
}

export const scanQrCodeFromImageFile = async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
        throw new Error('Please choose an image file.')
    }

    if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') {
        throw new Error('QR scanning is not available in this environment.')
    }

    const bitmap = await createImageBitmap(file)
    try {
        const value = (await scanWithNativeDetector(bitmap)) ?? scanWithJsQr(bitmap)

        if (!value) {
            throw new Error('No QR code was found in this image.')
        }

        return value.trim()
    } finally {
        bitmap.close()
    }
}
