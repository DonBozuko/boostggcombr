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
  instagramUser?: string | null
  pacote?: string | null
  redeSocial?: string | null
  valor?: number | null
}

const Email = ({ instagramUser, pacote, redeSocial, valor }: Props) => {
  const greeting = instagramUser ? `Oi @${String(instagramUser).replace(/^@/, '')}!` : 'Oi!'
  const item = pacote
    ? `${pacote}${redeSocial ? ` no ${redeSocial}` : ''}`
    : 'seu impulso'
  const valorFmt =
    typeof valor === 'number' && valor > 0
      ? valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>Seu Pix ficou pendente — seu pedido ainda está reservado</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>BoostGG</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Vi aqui que você começou o pedido de <strong>{item}</strong>
            {valorFmt ? ` (${valorFmt})` : ''} mas o Pix não foi concluído. Nada foi cobrado.
          </Text>
          <Text style={text}>
            Se ainda quiser, é só refazer em menos de 1 minuto — a entrega começa automaticamente
            assim que o Pix cair, normalmente em poucos minutos.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href="https://www.boostgg.com.br" style={button}>
              Finalizar meu pedido
            </Button>
          </Section>
          <Text style={text}>
            Ficou com dúvida sobre segurança, prazo ou o pacote certo? Responde esse e-mail que eu
            te ajudo pessoalmente.
          </Text>
          <Text style={footer}>Elite Boost Prime · BoostGG — obrigado pela confiança. — Fabiano</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Seu Pix ficou pendente — quer que eu libere de novo?',
  displayName: 'Recuperação de carrinho (Pix pendente)',
  previewData: {
    instagramUser: 'exemplo',
    pacote: '1.000 seguidores brasileiros',
    redeSocial: 'Instagram',
    valor: 29.9,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { color: '#14532d', fontSize: '24px', fontWeight: 700, margin: '0 0 16px' }
const text = { color: '#111827', fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }
const button = {
  backgroundColor: '#16a34a',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '10px',
  fontSize: '16px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { color: '#6b7280', fontSize: '13px', marginTop: '24px' }
