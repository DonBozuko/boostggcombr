import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  pacote?: string
  valor?: string
  pedidoId?: string
}

const Email = ({ pacote, valor, pedidoId }: Props) => {
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>Seu pedido foi reembolsado automaticamente</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>BoostGG</Heading>
          <Text style={text}>Olá!</Text>
          <Text style={text}>
            Seu pedido{pacote ? ` de ${pacote}` : ''} não pôde ser entregue no prazo e o valor{valor ? ` de R$ ${valor}` : ''} foi
            <strong> devolvido automaticamente</strong> na sua conta Pix / Mercado Pago.
          </Text>
          <Text style={text}>
            O estorno costuma cair em minutos — em raras ocasiões pode levar até 1 dia útil, dependendo do seu banco.
          </Text>
          {pedidoId ? (
            <Section style={box}>
              <Text style={boxLabel}>Referência do pedido</Text>
              <Text style={boxValue}>{pedidoId}</Text>
            </Section>
          ) : null}
          <Text style={text}>
            Se quiser tentar novamente, é só voltar em <a href="https://www.boostgg.com.br" style={link}>boostgg.com.br</a>.
            Qualquer dúvida, responde esse e-mail que a gente resolve.
          </Text>
          <Text style={footer}>Obrigado pela paciência. — Fabiano, BoostGG</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Seu pedido foi reembolsado — BoostGG',
  displayName: 'Aviso de reembolso automático (SLA)',
  previewData: { pacote: '1.000 seguidores brasileiros', valor: '19,90', pedidoId: '909601b5' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { color: '#14532d', fontSize: '24px', fontWeight: 700, margin: '0 0 16px' }
const text = { color: '#111827', fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' }
const box = { background: '#f3f4f6', borderRadius: '8px', padding: '16px 20px', margin: '20px 0' }
const boxLabel = { color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: 0 }
const boxValue = { color: '#111827', fontSize: '15px', fontFamily: 'monospace', margin: '4px 0 0' }
const link = { color: '#14532d', fontWeight: 600 }
const footer = { color: '#6b7280', fontSize: '13px', marginTop: '24px' }
