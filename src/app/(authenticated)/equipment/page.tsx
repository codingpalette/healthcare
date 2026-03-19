import { redirect } from "next/navigation"

export default function Page() {
  redirect("/guide?tab=equipment")
}
