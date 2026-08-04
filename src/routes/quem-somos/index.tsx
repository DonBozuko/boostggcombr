import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/quem-somos/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/quem-somos/"!</div>
}
