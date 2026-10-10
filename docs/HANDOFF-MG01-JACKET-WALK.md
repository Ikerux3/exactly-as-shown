# MG01 — baúl, chaqueta y huellas
Fecha: 2026-10-10. Responsable: Codex por instrucción de MJ. Rama: main autorizada.
Base revisada: 32a7aa945ab3acb7d606b3b9b9b799f395798235.

## Cambios verificados en código
- Cinco juguetes: uno en front/right/left, dos en back (puerta y chaqueta).
- Back se encuadra al 25% para mostrar la chaqueta original; tocarla aparta un recorte del mismo fondo y revela el juguete x36/y50. El segundo está en suelo x59/y82 con huellas.
- El baúl se presenta en la pared actual: animación de recogida hacia él, salida de 700 ms y paseo acotado por el suelo. Solo el primer juguete recolectado escapa, una vez; recuperado queda guardado.
- Fecha de salida persistida para que cambiar de pared no repita la salida. Pausa/oscuridad detienen el paseo. Movimiento reducido mantiene el juguete visible y recuperable.
- Conservados lock de clic, recuperación persistida, imágenes de Iker y capítulos 2+ idénticos. Stage añade encuadre opcional; sin efecto para las otras escenas.

Archivos: src/game/scenes/Ch1Ch2.tsx, Ch1.test.tsx, src/game/Stage.tsx, roomLayout.ts, roomLayout.test.ts, store.ts, src/styles.css.
Commit de implementación: eb084068f50058125a24f55b7af07945a6718e52. Ajuste posterior: sustituir parche oscuro por fondo original de la misma pared, conservando los assets.

Pruebas: regresiones de primer muñeco en pared 0 y 2, doble toque, chaqueta/suelo, luz/pausa, completar cinco y persistencia. PROBADO: TypeScript, suite completa local 65/65 en 17 archivos y build de producción. CI de eb084068: TypeScript/Vitest/Production build PASS: https://github.com/Ikerux3/exactly-as-shown/actions/runs/38050687599. Tras el ajuste del fondo: TypeScript y siete regresiones MG01 PASS; CI del commit final f2c8f43f0ecb1829b1724ab933edf6cf3e27211b: TypeScript/Vitest/Production build PASS: https://github.com/Ikerux3/exactly-as-shown/actions/runs/38051126832.
QA PROBADO: Edge con viewport móvil 390×844 y eventos táctiles, juego real local: chaqueta alineada y apartada, muñeco detrás visible, otro junto a huellas, primer muñeco sale del baúl y camina en pared 2 bajo luz, toque lo guarda (ch1=[elephant]), sin pageerror. Capturas locales qa-jacket-before.png, qa-jacket-after.png, qa-exit.png, qa-walking.png y qa-result.json. El toque del walker se ejecutó sin esperar estabilidad porque está animado. PENDIENTE: móvil físico, despliegue público y recorrido visual completo de otras paredes; no declarar DESPLEGADO.
Drive no consultado ni modificado, por instrucción expresa de MJ. Handoff en repositorio.
Siguiente paso: probar móvil físico / URL publicada.
