with r as (
 select p.pacote, p.quantidade::numeric q, p.cost_brl, p.price_brl,
   (p.quantidade/1000.0)*coalesce(sp.rate, vf.rate) as real_cost
 from pricing_items p
 left join smmpanel_services_cache sp on sp.provider_service_id::text = p.smmpanel_service_id
 left join verified_services_cache vf on vf.provider_service_id::text = p.verified_service_id
 where p.source='fallback' and coalesce(sp.rate, vf.rate) is not null
), c as (
 select pacote, q, real_cost, price_brl as old_price,
  case when q<=500 then 1.0 when q<=5000 then 1.6 when q<=15000 then 1.6+((q-5000)/10000)*0.8 else 2.4 end tf,
  case when q<=500 then 5.0 else 5.0+((q-500)/1000)*2.0 end fl
 from r where real_cost < cost_brl*0.9
), f as (
 select pacote, real_cost, old_price,
  greatest(fl, ceil(((real_cost*5.0*tf*1.15)+0.49)/0.9901/0.5)*0.5) as new_price
 from c
)
update pricing_items p set cost_brl = round(f.real_cost,4), price_brl = round(f.new_price,2), last_cost_source='reserve_recost_v274'
from f where p.pacote=f.pacote;