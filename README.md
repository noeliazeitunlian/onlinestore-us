# Generador de Clases — Pilates & Yoga

## Qué es esto
Un motor de reglas (NO IA en vivo) que arma una clase en 6 bloques a partir de
6 decisiones: disciplina, modalidad, objetivo, nivel, población y duración.
Filtra ejercicios de `data.js` según esos criterios y arma la secuencia.

## Archivos
- `index.html` — estructura de la página (una sola pantalla)
- `style.css` — estilos, paleta rosa/bordó/gold sobre blush
- `data.js` — **acá vive tu contenido real**: bloques, objetivos, modalidades y
  la base de ejercicios. Ahora mismo tiene ejercicios de ejemplo (5-6 por
  disciplina) para que el flujo funcione de punta a punta.
- `app.js` — la lógica: arma el formulario según la disciplina elegida, filtra
  ejercicios, arma bloques y renderiza el resultado.

## Cómo publicarlo en Netlify
Opción rápida (sin git):
1. Entrá a app.netlify.com → "Add new site" → "Deploy manually"
2. Arrastrá esta carpeta completa (o un .zip de su contenido)
3. Netlify te da la URL al toque

Opción con git (recomendada a mediano plazo, para poder editar y que se
actualice solo):
1. Subí esta carpeta a un repo de GitHub
2. En Netlify: "Add new site" → "Import from Git" → elegís el repo
3. Build command: (vacío) — Publish directory: `.`

## Cómo expandir la base de ejercicios
Cada ejercicio en `data.js` sigue esta forma:

```js
{
  id: "p12",                          // único
  discipline: "pilates",              // "pilates" o "yoga"
  name: "Nombre del ejercicio",
  position: "Supino",                 // texto libre
  modality: ["mat", "reformer"],      // ver MODALITIES arriba en el archivo
  level: ["inicial", "intermedio"],   // uno o varios
  moment: 3,                          // 1 a 6, ver BLOCKS
  objective: ["lumbopelvica"],        // ver OBJECTIVES
  avoid: ["Hernia de disco lumbar"],  // opcional, ver AVOID_TAGS
  description: "Consigna para la alumna...",
  howTo: "Cómo explicarlo (opcional)",
  adaptation: "Adaptación por patología (opcional)",
  seriesDefault: 3,
}
```

Para agregar objetivos o modalidades nuevas, editá los arrays `OBJECTIVES`,
`MODALITIES` o `POPULATIONS` al principio de `data.js`.

## Ejercicios cargados por las usuarias
El botón "+ Agregar ejercicio propio" guarda en el `localStorage` del
navegador de quien lo usa (no se comparte entre dispositivos ni te llega a
vos). Si más adelante querés que esos ejercicios se guarden en una base
central que vos puedas ver, hay que sumar un backend (por ejemplo Netlify
Forms, o una base como Airtable/Supabase). Avisame cuando llegues a ese
punto y lo armamos.

## Pendientes a definir con Noe
- [ ] Nombre de marca definitivo (hoy dice "Armá tu clase", placeholder)
- [ ] Completar la base real de ejercicios de pilates (fuente de contenido)
- [ ] Completar la base real de ejercicios de yoga (fuente de contenido)
- [ ] Definir si el acceso va a estar protegido con contraseña
- [ ] Sumar fotos/ilustraciones propias por ejercicio (opcional)
