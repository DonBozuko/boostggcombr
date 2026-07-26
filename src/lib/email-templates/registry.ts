import type { ComponentType } from 'react'
import { template as reviewRequestTemplate } from './review-request'
import { template as refundNoticeTemplate } from './refund-notice'
import { template as cartRecoveryTemplate } from './cart-recovery'
import { template as resellerAccessTemplate } from './reseller-access'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'review-request': reviewRequestTemplate,
  'refund-notice': refundNoticeTemplate,
  'cart-recovery': cartRecoveryTemplate,
  'reseller-access': resellerAccessTemplate,
}
