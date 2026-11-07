<div align="center">
  <img src="public/app-icon.png" alt="Easy Project Logo" width="120" height="120" style="border-radius: 24px;" />

  # Easy Project

  **Herramienta moderna, ligera y de alto rendimiento para la planificación y gestión de proyectos.**

  <p>
    <a href="README.md">English</a> •
    <b>Español</b>
  </p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Version](https://img.shields.io/badge/version-0.1.0-emerald.svg)](https://github.com/formatocd/easy-project/releases)
  [![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8D8?logo=tauri&logoColor=white)](https://tauri.app/)
  [![Rust](https://img.shields.io/badge/Rust-2024-black?logo=rust&logoColor=white)](https://www.rust-lang.org/)
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

  [Características](#-características-principales) •
  [Descargas](#-descargas-e-instalación) •
  [Atajos de Teclado](#-atajos-de-teclado) •
  [Construcción](#-compilación-desde-el-código-fuente) •
  [Licencia](#-licencia)
</div>

---

## 📌 Acerca de Easy Project

**Easy Project** es una aplicación de escritorio diseñada para profesionales y equipos que necesitan gestionar cronogramas de proyectos sin la sobrecarga ni la lentitud de herramientas tradicionales. 

Combina la velocidad y seguridad de **Rust** en el backend con una interfaz fluida e interactiva en **React 19**, proporcionando cálculo de ruta crítica instantáneo (sub-milisegundo) y soporte nativo sin dependencias pesadas.

---

## ✨ Características Principales

### 📊 Diagrama de Gantt Interactivo
- **Edición visual intuitiva:** Arrastra para mover fechas de inicio o redimensiona para cambiar duraciones.
- **Vinculación dinámica:** Conecta dependencias entre tareas arrastrando desde el conector de una tarea a otra.
- **Ruta Crítica (CPM):** Cálculo automático de holguras totales y libres (*Critical Path Method*) ejecutado en el motor de Rust en tiempo real.
- **Líneas Base (Baseline):** Guarda líneas base comparativas para analizar desviaciones entre lo planificado y lo real.
- **Días no laborables y festivos:** Visualización suave y difuminada de fines de semana y festivos configurables.

### 🌳 Estructura de Desglose del Trabajo (EDT / WBS)
- **Jerarquía multinivel:** Niveles de indentación ilimitados con cálculo automático de códigos EDT correlativos (`1`, `1.1`, `1.1.1`).
- **Tareas de Resumen dinámicas:** Agrupación con soporte para contraer/expandir secciones. Si una tarea padre pierde todas sus hijas, se transforma automáticamente en tarea estándar.
- **Reordenación inteligente:** Desplaza tareas manteniendo su nivel de indentación o entre diferentes bloques de proyecto sin romper la estructura.
- **Edición en cuadrícula:** Añade, edita, borra o pega listas de tareas directamente con atajos de teclado estándar.

### 📅 Calendario Laboral y Festivos
- Horarios de trabajo personalizables por cada día de la semana.
- Excepciones de calendario para definir días festivos o jornadas especiales.

### 🔄 Interoperabilidad e Informes
- **Importación XML:** Compatible con archivos `.xml` generados por Microsoft Project.
- **Exportación:** Exporta tus tablas a Excel (`.xlsx`) y CSV (`.csv`).
- **Asistente de Impresión y PDF:** Genera documentos en formato vertical u horizontal (A4, etc.) de la tabla, del diagrama de Gantt o de ambos combinados.

### 🎨 Experiencia de Usuario de Primer Nivel
- **Formato nativo seguro:** Guarda y abre proyectos en ficheros compactos `.epr` basados en SQLite transaccional.
- **Deshacer / Rehacer:** Historial completo de operaciones (`Ctrl+Z` / `Ctrl+Y`).
- **Temas:** Modo oscuro y modo claro automáticos y alternables.
- **Multilingüe:** Traducido a 6 idiomas: Español, Inglés, Francés, Alemán, Italiano y Portugués.

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
| :--- | :--- |
| `Ctrl + N` | Nuevo proyecto |
| `Ctrl + O` | Abrir archivo de proyecto (`.epr`) |
| `Ctrl + S` | Guardar proyecto |
| `Ctrl + Shift + S` | Guardar como... |
| `Ctrl + Z` | Deshacer |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Rehacer |
| `Alt + ↑` | Desplazar tarea hacia arriba |
| `Alt + ↓` | Desplazar tarea hacia abajo |
| `Alt + →` | Aumentar sangría (Indentar) |
| `Alt + ←` | Reducir sangría (Desindentar) |
| `Supr` / `Delete` | Eliminar tarea(s) seleccionada(s) |
| `Enter` | Confirmar edición o crear nueva tarea en la fila rápida |

---

## 🚀 Descargas e Instalación

Puedes descargar el instalador oficial para Windows desde la sección de [Releases de GitHub](https://github.com/formatocd/easy-project/releases/latest).

### Requisitos del Sistema
- **Sistema Operativo:** Windows 10 / 11 (64-bit).
- **Espacio en disco:** ~30 MB.

---

## 🛠️ Compilación desde el Código Fuente

Si deseas contribuir o compilar el proyecto por tu cuenta, necesitarás tener instalado:

- [Node.js](https://nodejs.org/) (v18+) y [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) y Cargo
- Entorno de compilación de C++ (Visual Studio Build Tools en Windows)

### 1. Clonar el repositorio
```bash
git clone https://github.com/formatocd/easy-project.git
cd easy-project
```

### 2. Instalar dependencias
```bash
pnpm install
```

### 3. Ejecutar en modo desarrollo
```bash
pnpm tauri dev
```

### 4. Generar el instalador de producción
```bash
pnpm tauri build
```
El instalador generado se ubicará en:
`src-tauri/target/release/bundle/nsis/Easy Project_0.1.0_x64-setup.exe`

---

## 👤 Autor y Contacto

- **Autor:** Carlos Durán
- **Organización:** [Formato CD](https://formatocd.es)
- **Email:** [carlos.duran@formatocd.es](mailto:carlos.duran@formatocd.es)
- **Repositorio:** [github.com/formatocd/easy-project](https://github.com/formatocd/easy-project)

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia **MIT**. Para más detalles, consulta el archivo [LICENSE](LICENSE).
