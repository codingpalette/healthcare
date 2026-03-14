import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getMyDevices,
  registerDevice,
  removeMyDevice,
  getMemberDevices,
  removeMemberDevice,
  type RegisterDeviceRequest,
} from "@/entities/device"

/** 내 기기 목록 */
export function useMyDevices() {
  return useQuery({
    queryKey: ["devices", "me"],
    queryFn: getMyDevices,
  })
}

/** 기기 등록 */
export function useRegisterDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RegisterDeviceRequest) => registerDevice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
    },
  })
}

/** 내 기기 원격 로그아웃 */
export function useRemoveMyDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (deviceId: string) => removeMyDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
    },
  })
}

/** 회원 기기 목록 (트레이너) */
export function useMemberDevices(userId: string) {
  return useQuery({
    queryKey: ["devices", "member", userId],
    queryFn: () => getMemberDevices(userId),
    enabled: !!userId,
  })
}

/** 회원 기기 강제 로그아웃 (트레이너) */
export function useRemoveMemberDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, deviceId }: { userId: string; deviceId: string }) =>
      removeMemberDevice(userId, deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
    },
  })
}
