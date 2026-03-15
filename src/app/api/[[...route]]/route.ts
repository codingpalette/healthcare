import { Hono } from "hono"
import { handle } from "hono/vercel"
import { attendanceRoutes } from "@/app/api/routes/attendance"
import { chatRoutes } from "@/app/api/routes/chat"
import { dietRoutes } from "@/app/api/routes/diet"
import { inbodyRoutes } from "@/app/api/routes/inbody"
import { devicesRoutes } from "@/app/api/routes/devices"
import { notificationsRoutes } from "@/app/api/routes/notifications"
import { profilesRoutes } from "@/app/api/routes/profiles"
import { equipmentRoutes } from "@/app/api/routes/equipment"
import { workoutRoutes } from "@/app/api/routes/workout"
import { foodItemRoutes } from "@/app/api/routes/food-item"

const app = new Hono().basePath("/api")

app.get("/health", (c) => {
  return c.json({ status: "ok" })
})

app.route("/profiles", profilesRoutes)
app.route("/attendance", attendanceRoutes)
app.route("/inbody", inbodyRoutes)
app.route("/diet", dietRoutes)
app.route("/workout", workoutRoutes)
app.route("/chat", chatRoutes)
app.route("/equipment", equipmentRoutes)
app.route("/notifications", notificationsRoutes)
app.route("/devices", devicesRoutes)
app.route("/food-items", foodItemRoutes)

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
