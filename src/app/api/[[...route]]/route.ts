import { Hono } from "hono"
import { handle } from "hono/vercel"
import { attendanceRoutes } from "@/app/api/routes/attendance"
import { dietRoutes } from "@/app/api/routes/diet"
import { profilesRoutes } from "@/app/api/routes/profiles"

const app = new Hono().basePath("/api")

app.get("/health", (c) => {
  return c.json({ status: "ok" })
})

app.route("/profiles", profilesRoutes)
app.route("/attendance", attendanceRoutes)
app.route("/diet", dietRoutes)

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
