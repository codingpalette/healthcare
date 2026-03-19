"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface ImageGalleryProps {
  urls: string[]
  alt: string
  emptyIcon?: React.ReactNode
  emptyText?: string
  aspectClassName?: string
}

export function ImageGallery({
  urls,
  alt,
  emptyIcon,
  emptyText = "등록된 사진이 없습니다",
  aspectClassName = "aspect-video",
}: ImageGalleryProps) {
  const [index, setIndex] = useState(0)

  if (urls.length === 0) {
    return (
      <div className={`flex ${aspectClassName} w-full items-center justify-center rounded-xl bg-primary/5 text-muted-foreground`}>
        <div className="flex flex-col items-center gap-2">
          {emptyIcon}
          <p className="text-sm">{emptyText}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${aspectClassName} w-full overflow-hidden rounded-xl bg-muted`}>
      <Image
        src={urls[index]}
        alt={alt}
        fill
        className="object-contain"
        unoptimized
      />
      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + urls.length) % urls.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % urls.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-0.5 text-xs text-white">
            {index + 1} / {urls.length}
          </div>
        </>
      )}
    </div>
  )
}
