import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/shared/api/r2"

export async function uploadPublicFile(params: {
  file: File
  folder: string
  ownerId: string
}) {
  const { file, folder, ownerId } = params
  const ext = file.name.split(".").pop() ?? "jpg"
  const key = `${folder}/${ownerId}/${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type,
    })
  )

  return {
    key,
    publicUrl: `${R2_PUBLIC_URL}/${key}`,
  }
}

export async function deletePublicFiles(publicUrls: string[]) {
  await Promise.all(publicUrls.map((url) => deletePublicFile(url)))
}

export async function deletePublicFile(publicUrl: string | null | undefined) {
  if (!publicUrl) return

  const key = publicUrl.replace(`${R2_PUBLIC_URL}/`, "")

  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    )
  } catch {
    // 기존 파일 삭제 실패는 무시
  }
}
