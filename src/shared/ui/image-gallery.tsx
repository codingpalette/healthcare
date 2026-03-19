"use client"

import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

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
  const [lightboxOpen, setLightboxOpen] = useState(false)

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
    <>
      <div
        className={`relative ${aspectClassName} w-full cursor-pointer overflow-hidden rounded-xl bg-muted`}
        onClick={() => setLightboxOpen(true)}
      >
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
              onClick={(e) => {
                e.stopPropagation()
                setIndex((i) => (i - 1 + urls.length) % urls.length)
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIndex((i) => (i + 1) % urls.length)
              }}
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

      {lightboxOpen && createPortal(
        <ImageLightbox
          urls={urls}
          alt={alt}
          initialIndex={index}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setIndex}
        />,
        document.body
      )}
    </>
  )
}

function ImageLightbox({
  urls,
  alt,
  initialIndex,
  onClose,
  onIndexChange,
}: {
  urls: string[]
  alt: string
  initialIndex: number
  onClose: () => void
  onIndexChange: (index: number) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const goTo = useCallback(
    (newIndex: number) => {
      setCurrentIndex(newIndex)
      onIndexChange(newIndex)
    },
    [onIndexChange]
  )

  const goPrev = useCallback(() => {
    goTo((currentIndex - 1 + urls.length) % urls.length)
  }, [currentIndex, urls.length, goTo])

  const goNext = useCallback(() => {
    goTo((currentIndex + 1) % urls.length)
  }, [currentIndex, urls.length, goTo])

  // 키보드 네비게이션
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
    }
    document.addEventListener("keydown", handleKeyDown)
    // 스크롤 방지
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [onClose, goPrev, goNext])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* 닫기 버튼 */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <X className="size-6" />
      </button>

      {/* 이미지 */}
      <div
        className="relative h-full w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={urls[currentIndex]}
          alt={alt}
          fill
          className="object-contain p-4"
          unoptimized
        />
      </div>

      {/* 좌우 네비게이션 */}
      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
          >
            <ChevronRight className="size-6" />
          </button>
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
          >
            {currentIndex + 1} / {urls.length}
          </div>
        </>
      )}
    </div>
  )
}
