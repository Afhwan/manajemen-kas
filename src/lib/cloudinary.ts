import imageCompression from 'browser-image-compression'

const MAX_SIZE_MB = 0.3
const MAX_WIDTH_OR_HEIGHT = 1000

export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
    useWebWorker: true,
  })
}

export async function uploadProof(file: File): Promise<{ publicId: string; url: string }> {
  const compressed = await compressImage(file)

  const formData = new FormData()
  formData.append('file', compressed)
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gagal mengunggah bukti: ${body}`)
  }

  const data = await res.json()
  return { publicId: data.public_id as string, url: data.secure_url as string }
}

export async function deleteProof(publicId: string): Promise<void> {
  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/destroy`,
      { method: 'POST', body: new URLSearchParams({ public_id: publicId }) }
    )
    if (!res.ok) {
      // Penghapusan gagal tidak menggagalkan operasi utama.
      console.error('Gagal menghapus bukti di Cloudinary:', res.status)
    }
  } catch (err) {
    console.error('Gagal menghapus bukti di Cloudinary:', err)
  }
}
