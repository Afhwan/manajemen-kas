import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1000,
    useWebWorker: true,
  })
}

export async function uploadProofToCloudinary(
  file: File
): Promise<{ publicId: string; url: string }> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error('Konfigurasi Cloudinary belum diisi (env)')
  }

  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', uploadPreset)
  form.append('folder', 'kas-kelas')

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: form }
  )
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message ?? 'Upload bukti gagal')
  }

  return { publicId: data.public_id, url: data.secure_url }
}
