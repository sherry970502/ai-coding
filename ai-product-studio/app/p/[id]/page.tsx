"use client";

import Studio from "@/components/Studio";

export default function ProjectPage({ params }: { params: { id: string } }) {
  return <Studio projectId={params.id} />;
}
