import * as React from "react"

export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-muted ${className}`}
      aria-hidden="true"
    />
  )
}