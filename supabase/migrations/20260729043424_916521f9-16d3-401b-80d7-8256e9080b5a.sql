update public.pricing_items
set smmpanel_service_id = null,
    is_sellable = false,
    sellable_reason = 'sem fornecedor que entregue essa quantidade — aguardando novo fornecedor no admin'
where pacote in ('p350k','p500k');