import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brand, LOGO_URL, RAZAO, SITE_URL, SUPORTE_EMAIL } from './brand'

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
      <Body style={brand.main}>
        <Container style={brand.container}>
          <Section style={brand.headerBar}>
            {LOGO_URL ? (
              <Img src={LOGO_URL} alt="BoostGG" width="150" style={{ margin: '0 auto' }} />
            ) : (
              <Heading style={brand.wordmark}>BoostGG</Heading>
            )}
            <Text style={brand.tagline}>Seguidores e engajamento via Pix · desde 2024</Text>
          </Section>

          <Section style={brand.body}>
            <Text style={brand.text}>{greeting}</Text>
            <Text style={brand.text}>
              Vi aqui que você começou o pedido de <strong>{item}</strong>
              {valorFmt ? ` (${valorFmt})` : ''} mas o Pix não foi concluído. Nada foi cobrado.
            </Text>
            <Text style={brand.text}>
              Se ainda quiser, é só refazer em menos de 1 minuto — a entrega começa automaticamente
              assim que o Pix cair, normalmente em poucos minutos.
            </Text>

            <Text style={brand.trust}>
              ✅ Pagamento processado pelo Mercado Pago<br />
              ✅ Entrega automática e acompanhada em tempo real<br />
              ✅ Reembolso garantido se não entregarmos
            </Text>

            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button href={SITE_URL} style={brand.button}>
                Finalizar meu pedido
              </Button>
            </Section>

            <Text style={brand.text}>
              Dúvida sobre segurança, prazo ou qual pacote escolher? Responde esse e-mail que eu te
              ajudo pessoalmente.
            </Text>

            <Text style={brand.footer}>
              — Fabiano Santiago, {RAZAO} (BoostGG)
              <br />
              <Link href={SITE_URL} style={brand.link}>
                www.boostgg.com.br
              </Link>{' '}
              · {SUPORTE_EMAIL}
              <br />
              Você recebeu este e-mail porque iniciou um pedido no nosso site.
            </Text>
          </Section>
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
