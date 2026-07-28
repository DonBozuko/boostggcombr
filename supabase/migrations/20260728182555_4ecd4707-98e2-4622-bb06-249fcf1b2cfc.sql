with ultimas as (
  select id from bench_runs where finished_at is not null order by started_at desc limit 2
),
travados as (
  select f.pacote, count(distinct f.run_id) as ciclos,
         max(f.motivo) as motivo
  from bench_findings f
  join ultimas u on u.id = f.run_id
  where f.verdict in ('saldo','margem')
  group by f.pacote
  having count(distinct f.run_id) >= 2
)
update pricing_items p
set is_sellable = false,
    sellable_reason = left('BANCADA: ' || coalesce(t.motivo, 'sem entrega garantida agora'), 400)
from travados t
where p.pacote = t.pacote and p.is_sellable is distinct from false;