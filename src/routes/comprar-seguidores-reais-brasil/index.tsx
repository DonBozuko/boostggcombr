import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/comprar-seguidores-reais-brasil/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/comprar-seguidores-reais-brasil/"!</div>
}
