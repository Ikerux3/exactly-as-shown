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
Pruebas: regresiones de primer muñeco en pared 0 y 2, doble toque, chaqueta/suelo, luz/pausa, completar cinco y persistencia. Resultados de CI pendientes al publicar; se registrarán después.
QA pendiente: comprobar juego móvil real (salida del baúl, chaqueta y cuatro paredes). No declarar desplegado sin comprobación.
Drive no consultado ni modificado, por instrucción expresa de MJ. Handoff en repositorio.
Siguiente paso: consultar resultado de CI y validar visualmente el juego actualizado.
