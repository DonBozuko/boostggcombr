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
  instagramUser?: string
  pacote?: string
}

const Email = ({ instagramUser, pacote }: Props) => {
  const greeting = instagramUser ? `Olá @${instagramUser}!` : 'Olá!'
  const pacoteLine = pacote
    ? `Passamos aqui pra saber como foi sua experiência com o pedido de ${pacote}.`
    : 'Passamos aqui pra saber como foi sua experiência com seu pedido.'
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>Como foi sua experiência com a BoostGG?</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>BoostGG</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>{pacoteLine}</Text>
          <Text style={text}>
            Se ficou feliz com o resultado, uma avaliação de 30 segundos ajuda demais outros criadores brasileiros a
            confiarem na gente. Se algo não saiu como esperado, responde esse e-mail que a gente resolve.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href="https://br.trustpilot.com/evaluate/boostgg.com.br" style={button}>
              Avaliar no Trustpilot
            </Button>
          </Section>
          <Text style={footer}>Obrigado por confiar na BoostGG. — Fabiano</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Como foi sua experiência com a BoostGG?',
  displayName: 'Pedido de avaliação (pós-entrega)',
  previewData: { instagramUser: 'exemplo', pacote: '1.000 seguidores brasileiros' },
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
