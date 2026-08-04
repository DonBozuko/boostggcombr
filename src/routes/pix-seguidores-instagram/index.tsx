import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/pix-seguidores-instagram/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/pix-seguidores-instagram/"!</div>
}
