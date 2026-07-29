---
name: Alerta que repete = versão publicada velha
description: Crons rodam o build PUBLICADO; correção só no preview mantém o mesmo alerta. Todo alerta de não-convergência carrega APP_VERSION.
type: constraint
---
Robôs (bench-sweep, ops-audit, crons) rodam contra o site PUBLICADO, não o preview.
Consequência: correção de regra (margem, preço, entrega) só passa a valer nos alertas
depois de publicar. Antes de investigar "alarme que não anda", conferir a versão no
rodapé do alerta (`src/lib/build-stamp.ts` → APP_VERSION).

**Regra:** toda correção que muda regra de preço/margem/entrega sobe APP_VERSION no
mesmo commit, e a resposta ao dono diz explicitamente "precisa publicar".
