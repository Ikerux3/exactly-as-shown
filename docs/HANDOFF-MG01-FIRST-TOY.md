# MG01 — primer juguete, escape único
Fecha: 10 octubre 2026. Responsable: Codex; autorización de main comunicada por MJ.
Base revisada: 8816de4a046c96a5565637ac56b079c6c289e4b3. Rama destino: main.

Estado: implementación preparada, publicación y CI se verifican al cierre.
Cambios: retirar catapulta y escape del cuarto; el primer juguete realmente recogido sale una vez en su pared original, camina con luz ON, se guarda definitivamente al recuperarlo. Estado toyEscape persiste en Zustand y checkpoint de capítulo; newRun lo limpia. Cinco juguetes, reparto 1/1/2/1 por pared; dos en pared 2 puerta/chaqueta (revelar chaqueta y huellas). Todos recogibles con luz. Botón estable, lock síncrono, feedback 220 ms, touch targets 48 px, cancelación de timer al desmontar, fallback de imagen custom. Movimiento reducido respetado.
Archivos: src/game/scenes/Ch1Ch2.tsx (solo imports y MG01; MG02 concurrente preservado literalmente), store.ts (estado/save), roomLayout.ts/test.ts, scenes/Ch1.test.tsx, styles.css (añadido MG01). Assets y resto de niveles no modificados.

Pruebas añadidas: doble toque, mismo muro, recuperación/remount, colección rápida completa sin expulsiones, luz/pause y cancelación al desmontar; distribución y ruta acotada.
Evidencia local: npm install falló EPERM; npm test/build no pueden iniciar porque faltan Vitest/Vite; TypeScript tampoco disponible. NO PASS local. QA visual y móvil físico NO realizada: confirmar ubicación exacta chaqueta en arte de pared 2, solapes en 375/390 px, recorrido/toques del muñeco caminante y fin MG01. No declarar DESPLEGADO.
Concurrencia: inicialmente main 36df643; se incorporaron 4378507 y 8816de4 preservando cocina/comedor, voz y capítulos 3–5. Publicación con expected_sha, sin force.
Siguiente paso: revisar CI del commit final, probar PC/iOS/Android, confirmar hotspot chaqueta y guardar vídeo con SHA; Publish separado de Git.
