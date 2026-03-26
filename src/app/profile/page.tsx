import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import getDb from "@/lib/db";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, email, name, image, iban FROM users WHERE id = ?")
    .get(session.user.id) as {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      iban: string | null;
    };

  return <ProfileForm user={user} />;
}
