import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  nome?: string
  apiKey?: string
  descontoPct?: number
  reissue?: boolean
}

const PORTAL = 'https://www.boostgg.com.br/painel-revendedor'

const Email = ({ nome, apiKey, descontoPct, reissue }: Props) => {
  const saudacao = nome ? `Olá, ${nome}!` : 'Olá!'
  const desconto = descontoPct ? `${Math.round(descontoPct * 100)}%` : null
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{reissue ? 'Sua nova chave de acesso BoostGG' : 'Seu acesso de revendedor BoostGG está liberado'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>BoostGG</Heading>
          <Text style={text}>{saudacao}</Text>
          <Text style={text}>
            {reissue
              ? 'Geramos uma nova chave de acesso para você. A chave anterior foi cancelada e não funciona mais.'
              : 'Seu acesso de revendedor foi liberado. Você já pode entrar no painel, recarregar por Pix e enviar pedidos.'}
          </Text>

          <Section style={box}>
            <Text style={label}>Sua chave de acesso</Text>
            <Text style={code}>{apiKey}</Text>
            <Text style={small}>
              Guarde em lugar seguro. Ela é sua senha — não compartilhe com ninguém.
            </Text>
          </Section>

          {desconto && (
            <Text style={text}>
              Seu desconto de revenda é de <strong>{desconto}</strong> sobre o preço do site.
            </Text>
          )}

          <Text style={text}>
            <strong>Não precisa saber programar.</strong> É só entrar no painel, colar a chave, recarregar
            por Pix (o saldo entra sozinho) e pedir. Se você tiver seu próprio painel, a mesma chave serve
            para integração via API.
          </Text>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={PORTAL} style={button}>
              Abrir meu painel
            </Button>
          </Section>

          <Text style={footer}>
            Qualquer dúvida, responda este e-mail. — Equipe BoostGG (Elite Boost Prime)
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d?.reissue ? 'Sua nova chave de revendedor BoostGG' : 'Seu acesso de revendedor BoostGG está liberado',
  displayName: 'Acesso de revendedor (chave)',
  previewData: { nome: 'Maria', apiKey: 'bgg_exemplo123', descontoPct: 0.15, reissue: false },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { color: '#14532d', fontSize: '24px', fontWeight: 700, margin: '0 0 16px' }
const text = { color: '#111827', fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }
const box = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #16a34a',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '0 0 20px',
}
const label = { color: '#14532d', fontSize: '13px', fontWeight: 700, margin: '0 0 6px' }
const code = {
  color: '#111827',
  fontFamily: 'Menlo, Consolas, monospace',
  fontSize: '18px',
  fontWeight: 700,
  wordBreak: 'break-all' as const,
  margin: '0 0 8px',
}
const small = { color: '#4b5563', fontSize: '12px', lineHeight: '18px', margin: 0 }
const button = {
  backgroundColor: '#16a34a',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 700,
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { color: '#6b7280', fontSize: '13px', lineHeight: '20px', margin: '24px 0 0' }
