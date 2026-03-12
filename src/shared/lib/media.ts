const DEFAULT_IMAGE_MAX_WIDTH = 1600
const DEFAULT_IMAGE_MAX_HEIGHT = 1600
const DEFAULT_IMAGE_QUALITY = 0.78

export const WORKOUT_VIDEO_MAX_SIZE_BYTES = 20 * 1024 * 1024
export const WORKOUT_VIDEO_MAX_SIZE_MB = Math.round(WORKOUT_VIDEO_MAX_SIZE_BYTES / (1024 * 1024))
export const WORKOUT_VIDEO_MAX_DURATION_SECONDS = 30

interface CompressImageOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

function replaceFileExtension(fileName: string, extension: string) {
  return fileName.replace(/\.[^.]+$/, "") + extension
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new window.Image()

      nextImage.onload = () => resolve(nextImage)
      nextImage.onerror = () => reject(new Error("이미지를 불러오지 못했습니다"))
      nextImage.src = objectUrl
    })

    return image
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function compressImageToWebP(file: File, options: CompressImageOptions = {}) {
  const image = await loadImageElement(file)
  const maxWidth = options.maxWidth ?? DEFAULT_IMAGE_MAX_WIDTH
  const maxHeight = options.maxHeight ?? DEFAULT_IMAGE_MAX_HEIGHT
  const quality = options.quality ?? DEFAULT_IMAGE_QUALITY
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
  const canvas = document.createElement("canvas")

  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))

  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("이미지 캔버스를 준비하지 못했습니다")
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob)
          return
        }

        reject(new Error("이미지 압축에 실패했습니다"))
      },
      "image/webp",
      quality
    )
  })

  return new File([blob], replaceFileExtension(file.name, ".webp"), {
    type: "image/webp",
    lastModified: file.lastModified,
  })
}

export async function getVideoDurationSeconds(file: File) {
  const objectUrl = URL.createObjectURL(file)

  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const video = document.createElement("video")

      video.preload = "metadata"
      video.onloadedmetadata = () => resolve(video.duration)
      video.onerror = () => reject(new Error("영상 정보를 읽지 못했습니다"))
      video.src = objectUrl
    })

    return duration
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
