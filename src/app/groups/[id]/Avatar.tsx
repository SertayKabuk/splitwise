"use client";

import Image from "next/image";
import { getInitials } from "@/lib/initials";
import type { Member } from "./types";

export const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-teal-500",
];

export function Avatar({ member, size = "md" }: { member: Member; size?: "sm" | "md" | "lg" }) {
  const colorIndex = member.id.charCodeAt(0) % AVATAR_COLORS.length;
  const color = AVATAR_COLORS[colorIndex];
  const sizeClass =
    size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-12 h-12 text-lg" : "w-9 h-9 text-sm";

  if (member.image) {
    const px = size === "sm" ? 28 : size === "lg" ? 48 : 36;
    return (
      <Image
        src={member.image}
        alt={member.name ?? member.email}
        width={px}
        height={px}
        className="rounded-full object-cover flex-shrink-0"
      />
    );
  }

  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {getInitials(member.name, member.email)}
    </div>
  );
}
