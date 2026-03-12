"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Camera } from "lucide-react"
import { Button, Input, Label, Avatar, AvatarImage, AvatarFallback } from "@/shared/ui"
import { useMyProfile, useUpdateMyProfile, useUploadAvatar } from "@/features/profile/model/use-profile"

export function ProfileEditForm() {
  const { data: profile, isLoading } = useMyProfile()
  const updateProfile = useUpdateMyProfile()
  const uploadAvatar = useUploadAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [initialized, setInitialized] = useState(false)

  // 프로필 데이터가 로드되면 폼 초기화
  if (profile && !initialized) {
    setName(profile.name)
    setPhone(profile.phone ?? "")
    setInitialized(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">프로필을 불러오는 중...</p>
      </div>
    )
  }

  if (!profile) return null

  const roleLabel = profile.role === "trainer" ? "트레이너" : "회원"
  const initials = profile.name.slice(0, 1)

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 파일인지 확인
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다")
      return
    }

    // 5MB 크기 제한
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다")
      return
    }

    uploadAvatar.mutate(file, {
      onSuccess: () => {
        toast.success("아바타가 업데이트되었습니다")
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })

    // 같은 파일 재선택 허용
    e.target.value = ""
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("이름을 입력해주세요")
      return
    }

    updateProfile.mutate(
      { name: name.trim(), phone: phone.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("프로필이 수정되었습니다")
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 아바타 영역 */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleAvatarClick}
          className="group relative cursor-pointer"
          disabled={uploadAvatar.isPending}
        >
          <Avatar size="lg" className="size-20">
            {profile.avatarUrl && (
              <AvatarImage src={profile.avatarUrl} alt={profile.name} />
            )}
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-5 text-white" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-label="아바타 이미지 선택"
        />
        <p className="text-xs text-muted-foreground">
          {uploadAvatar.isPending ? "업로드 중..." : "클릭하여 아바타 변경"}
        </p>
      </div>

      {/* 이름 */}
      <div className="space-y-2">
        <Label htmlFor="profile-name">이름</Label>
        <Input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          required
        />
      </div>

      {/* 전화번호 */}
      <div className="space-y-2">
        <Label htmlFor="profile-phone">전화번호 (선택)</Label>
        <Input
          id="profile-phone"
          type="tel"
          placeholder="010-1234-5678"
          value={phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
        />
      </div>

      {/* 이메일 (읽기 전용) */}
      <div className="space-y-2">
        <Label htmlFor="profile-email">이메일</Label>
        <Input
          id="profile-email"
          type="email"
          value={profile.email ?? ""}
          disabled
          className="bg-muted"
        />
      </div>

      {/* 권한 (읽기 전용) */}
      <div className="space-y-2">
        <Label htmlFor="profile-role">권한</Label>
        <Input
          id="profile-role"
          type="text"
          value={roleLabel}
          disabled
          className="bg-muted"
        />
      </div>

      <Button type="submit" className="w-full" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? "저장 중..." : "저장"}
      </Button>
    </form>
  )
}
