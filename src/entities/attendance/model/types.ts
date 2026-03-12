export interface Attendance {
  id: string
  userId: string
  checkInAt: string
  checkOutAt: string | null
  createdAt: string
}

export interface AttendanceWithProfile extends Attendance {
  userName: string
}
