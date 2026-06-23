# Cómo activar la sincronización en tiempo real

La app usa **Firebase Firestore** (gratis) para que los dos vean la misma lista al instante.
Solo hay que hacer esto una vez y toma unos 5 minutos.

---

## Paso 1 — Crear el proyecto Firebase

1. Ve a https://console.firebase.google.com
2. Clic en **"Agregar proyecto"**
3. Ponle un nombre (ej. `nuestros-suenos`) → continúa → puedes desactivar Google Analytics si quieres → **Crear proyecto**

---

## Paso 2 — Activar Firestore

1. En el menú izquierdo → **Build → Firestore Database**
2. Clic en **"Crear base de datos"**
3. Selecciona **"Comenzar en modo de prueba"** (es suficiente para uso personal)
4. Elige la región más cercana (ej. `us-east1`) → **Habilitar**

---

## Paso 3 — Obtener la configuración

1. En la pantalla principal del proyecto → clic en el ícono **`</>`** (Web)
2. Ponle un apodo (ej. `web`) → **Registrar app**
3. Verás un bloque de código como este:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "nuestros-suenos.firebaseapp.com",
  projectId: "nuestros-suenos",
  storageBucket: "nuestros-suenos.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

Copia esos valores.

---

## Paso 4 — Pegar la config en index.html

Abre `index.html` y busca este bloque cerca del inicio del `<script>`:

```js
const FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
```

Reemplaza cada valor con los que copiaste del paso anterior.

---

## Paso 5 — Subir a Vercel

1. Ve a https://vercel.com → **New Project**
2. Arrastra la carpeta con `index.html` y `vercel.json`, o conéctala desde GitHub
3. Despliega — en 1 minuto tendrás una URL

---

## Cómo usarlo en pareja

- Los **dos** entran a la misma URL
- Cada uno pone **su nombre** y el **mismo código** (ej. `amor2024`)
- El código es como la "sala" compartida — cualquier palabra funciona
- Cuando uno agrega algo, aparece en la pantalla del otro **en segundos**, con una notificación
- El punto verde ✦ en la app indica que están conectados en vivo

---

## Plan gratuito de Firebase

El plan Spark (gratis) incluye:
- 1 GB de almacenamiento
- 50.000 lecturas / día
- 20.000 escrituras / día

Para una lista de pareja esto es más que suficiente para siempre.
