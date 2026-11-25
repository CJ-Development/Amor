# Cómo activar y proteger la sincronización en tiempo real

La app usa **Firebase Firestore** (plan gratuito Spark) para que los dos vean la misma lista al instante, incluso con soporte offline.

---

## Paso 1 — Crear el proyecto Firebase

1. Ve a https://console.firebase.google.com
2. Clic en **"Agregar proyecto"**
3. Ponle un nombre (ej. `nuestros-suenos`) → continúa → puedes desactivar Google Analytics → **Crear proyecto**

---

## Paso 2 — Activar Firestore y configurar reglas permanentes

> **Importante:** El "modo de prueba" de Firestore **caduca automáticamente a los 30 días** y bloquea la app. Reemplaza las reglas por las de abajo para que tu lista funcione indefinidamente y valide los datos.

1. En el menú izquierdo → **Build → Firestore Database** → **Crear base de datos**
2. Elige la región más cercana (ej. `us-east1`) → **Habilitar**
3. Ve a la pestaña **Reglas (Rules)**, reemplaza el contenido y haz clic en **Publicar**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Bloquea acceso a cualquier otra colección y evita listar códigos de salas
    match /lists/{coupleCode}/items/{itemId} {
      allow read: if coupleCode.size() >= 3 && coupleCode.size() <= 40;

      allow create: if coupleCode.size() >= 3 && coupleCode.size() <= 40
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.text.size() <= 120
        && request.resource.data.who is string
        && request.resource.data.who.size() <= 30
        && request.resource.data.cat is string
        && request.resource.data.done is bool;

      allow update: if coupleCode.size() >= 3 && coupleCode.size() <= 40
        && (!('text' in request.resource.data) || (request.resource.data.text is string && request.resource.data.text.size() <= 120))
        && (!('note' in request.resource.data) || (request.resource.data.note is string && request.resource.data.note.size() <= 200));

      allow delete: if coupleCode.size() >= 3 && coupleCode.size() <= 40;
    }

    // Presencia en tiempo real (quién está conectado en la sala)
    match /lists/{coupleCode}/presence/{memberId} {
      allow read: if coupleCode.size() >= 3 && coupleCode.size() <= 40;
      allow write: if coupleCode.size() >= 3 && coupleCode.size() <= 40
        && request.resource.data.name is string
        && request.resource.data.name.size() <= 30
        && request.resource.data.online is bool;
    }
  }
}
```

> **Consejo:** Usa un código de pareja poco predecible (ej. `lunas-julio-2026` en lugar de `amor`).

---

## Paso 3 — Obtener la configuración Web

1. En la pantalla principal del proyecto → clic en el ícono **`</>`** (Web)
2. Ponle un apodo (ej. `web`) → **Registrar app**
3. Copia los valores de `firebaseConfig` y pégalos en `firebase.initializeApp({ ... })` dentro de `index.html`.

---

## Paso 4 — Subir a Vercel

1. Ve a https://vercel.com → **New Project**
2. Sube la carpeta con `index.html`, `flowers.js`, `og-image.jpg`, `manifest.json`, `icon.svg` y `vercel.json` (o conéctala desde GitHub)
3. Despliega — en 1 minuto tendrás tu URL lista.
4. *(Recomendado para WhatsApp)* En `index.html`, reemplaza `/og-image.jpg` en `og:image` y `twitter:image` por tu URL completa `https://TU-DOMINIO.vercel.app/og-image.jpg` para que WhatsApp muestre siempre la vista previa grande con imagen.

---

## Cómo usarlo en pareja

- Entra a tu URL, escribe tu nombre y un **código de pareja** (mínimo 3 caracteres, sin `/`).
- Una vez dentro, pulsa **Invitar** en la barra superior para copiar un enlace directo (`?code=...`) y enviárselo a tu pareja: así entrará a la misma sala sin errores de escritura.
- En el teléfono, abre el menú del navegador y elige **"Agregar a pantalla de inicio"** para usarla como app instalada (PWA).
- Cuando uno agrega un sueño, aparece en la pantalla del otro en segundos con una notificación.

---

## Plan gratuito de Firebase (Spark)

- 1 GB de almacenamiento
- 50.000 lecturas / día
- 20.000 escrituras / día

Para una lista de pareja es más que suficiente.
