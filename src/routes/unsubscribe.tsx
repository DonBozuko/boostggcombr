import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/unsubscribe')({
  head: () => ({
    meta: [
      { title: 'Cancelar inscrição — BoostGG' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: UnsubscribePage,
})

type State = 'loading' | 'valid' | 'invalid' | 'submitting' | 'done' | 'error'

function UnsubscribePage() {
  const [state, setState] = useState<State>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    const t = new URL(window.location.href).searchParams.get('token') ?? ''
    setToken(t)
    if (!t) {
      setState('invalid')
      return
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { email?: string }) => {
        setEmail(data.email ?? null)
        setState('valid')
      })
      .catch(() => setState('invalid'))
  }, [])

  async function confirm() {
    setState('submitting')
    try {
      const r = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      setState(r.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4 py-16">
        <h1 className="text-2xl font-bold text-emerald-900">BoostGG</h1>
        {state === 'loading' && <p className="text-gray-600">Carregando…</p>}
        {state === 'invalid' && (
          <>
            <h2 className="text-xl font-semibold">Link inválido ou expirado</h2>
            <p className="text-gray-600">
              O link de descadastro não é mais válido. Se ainda estiver recebendo e-mails, responda a mensagem que
              vamos remover manualmente.
            </p>
          </>
        )}
        {state === 'valid' && (
          <>
            <h2 className="text-xl font-semibold">Cancelar e-mails da BoostGG</h2>
            {email && <p className="text-gray-600">Endereço: <strong>{email}</strong></p>}
            <p className="text-gray-600">Vamos parar de te enviar pedidos de avaliação e novidades.</p>
            <button
              onClick={confirm}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg"
            >
              Confirmar descadastro
            </button>
          </>
        )}
        {state === 'submitting' && <p className="text-gray-600">Processando…</p>}
        {state === 'done' && (
          <>
            <h2 className="text-xl font-semibold text-emerald-700">Descadastro confirmado</h2>
            <p className="text-gray-600">Você não vai mais receber e-mails da BoostGG.</p>
          </>
        )}
        {state === 'error' && (
          <>
            <h2 className="text-xl font-semibold text-red-600">Algo deu errado</h2>
            <p className="text-gray-600">Tente novamente ou responda ao e-mail que a gente remove manualmente.</p>
          </>
        )}
      </div>
    </div>
  )
}
