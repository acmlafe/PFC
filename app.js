// =============================================
// SESIONES FORMATIVAS SFLaFe - APP.JS
// =============================================

// =============================================
// UTILIDADES
// =============================================

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'success') {
    // Eliminar notificación anterior si existe
    const anterior = document.querySelector('.notification');
    if (anterior) anterior.remove();

    const notif = document.createElement('div');
    notif.className = `notification ${tipo}`;
    notif.textContent = mensaje;
    document.body.appendChild(notif);

    setTimeout(() => notif.remove(), 3000);
}

// Formatear fecha
function formatearFecha(fecha) {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Formatear hora
function formatearHora(hora) {
    if (!hora) return '-';
    return hora.substring(0, 5);
}

// Obtener clase de badge según estado
function getBadgeEstado(estado) {
    const badges = {
        'pendiente': 'badge-pending',
        'fecha confirmada': 'badge-confirmed',
        'realizada': 'badge-done',
        'anulada': 'badge-cancelled'
    };
    return badges[estado] || 'badge-pending';
}

// =============================================
// MODALES
// =============================================

function abrirModal(id) {
    document.getElementById(id).classList.add('active');
}

function cerrarModal(id) {
    document.getElementById(id).classList.remove('active');
    // Limpiar formulario
    const form = document.querySelector(`#${id} form`);
    if (form) form.reset();
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
});

// =============================================
// FUNCIONES DE SESIONES
// =============================================

// Cargar tabla de sesiones (programación - NO realizadas)
async function cargarTablaSesiones(sesiones = null) {
    const tbody = document.getElementById('tablaSesiones');
    if (!tbody) return;

    try {
        const data = sesiones || await Sesiones.getProgramadas();

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-calendar-times"></i>
                        <p>No hay sesiones registradas</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(s => {
            const fechasDiferentes = s.fecha_exposicion && s.fecha_prevista && s.fecha_exposicion !== s.fecha_prevista;
            const claseRojo = fechasDiferentes ? 'fecha-diferente' : '';
            return `
            <tr>
                <td><a href="sesion.html?id=${s.id}">${s.titulo}</a></td>
                <td class="${claseRojo}">${formatearFecha(s.fecha_exposicion)}</td>
                <td>${formatearFecha(s.fecha_prevista)}</td>
                <td>${s.ponente}</td>
                <td>${s.grupo || '-'}</td>
                <td><span class="badge ${getBadgeEstado(s.estado)}">${s.estado}</span></td>
                <td class="table-actions">
                    <button class="btn-icon edit" onclick="editarSesion('${s.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="eliminarSesion('${s.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `}).join('');
    } catch (error) {
        mostrarNotificacion('Error al cargar sesiones: ' + error.message, 'error');
    }
}

// Cargar próximas sesiones (dashboard)
async function cargarProximasSesiones() {
    const tbody = document.getElementById('proximasSesiones');
    if (!tbody) return;

    try {
        const data = await Sesiones.getProximas(5);

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">No hay sesiones próximas</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(s => {
            const fechasDiferentes = s.fecha_exposicion && s.fecha_prevista && s.fecha_exposicion !== s.fecha_prevista;
            const claseRojo = fechasDiferentes ? 'fecha-diferente' : '';
            return `
            <tr>
                <td><a href="sesion.html?id=${s.id}">${s.titulo}</a></td>
                <td class="${claseRojo}">${formatearFecha(s.fecha_exposicion)}</td>
                <td>${formatearFecha(s.fecha_prevista)}</td>
                <td>${s.ponente}</td>
                <td>${s.grupo || '-'}</td>
                <td><span class="badge ${getBadgeEstado(s.estado)}">${s.estado}</span></td>
            </tr>
        `}).join('');
    } catch (error) {
        console.error('Error cargando próximas sesiones:', error);
    }
}

// Guardar sesión (crear o actualizar)
async function guardarSesion(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const id = formData.get('id');

    const sesion = {
        titulo: formData.get('titulo'),
        fecha_prevista: formData.get('fecha_prevista') || null,
        hora: formData.get('hora') || null,
        ponente: formData.get('ponente'),
        grupo: formData.get('grupo') || null,
        estado: formData.get('estado') || 'pendiente',
        fecha_exposicion: formData.get('fecha_exposicion') || null,
        palabras_clave: formData.get('palabras_clave') || null,
        url_acceso: formData.get('url_acceso') || null,
        observaciones: formData.get('observaciones') || null
    };

    try {
        if (id) {
            await Sesiones.update(id, sesion);
            mostrarNotificacion('Sesión actualizada correctamente');
        } else {
            await Sesiones.create(sesion);
            mostrarNotificacion('Sesión creada correctamente');
        }
        cerrarModal('modalSesion');

        // Recargar vista activa (calendario o tabla)
        const vistaCalendario = document.getElementById('vistaCalendario');
        if (vistaCalendario && vistaCalendario.style.display !== 'none') {
            cargarCalendario();
        } else {
            cargarTablaSesiones();
        }
        cargarEstadisticas();
    } catch (error) {
        mostrarNotificacion('Error: ' + error.message, 'error');
    }
}

// Editar sesión
async function editarSesion(id) {
    try {
        const sesion = await Sesiones.getById(id);
        const form = document.getElementById('formSesion');

        // Cargar ponentes primero
        await cargarSelectPonentes();

        // Rellenar formulario
        form.querySelector('[name="id"]').value = sesion.id;
        form.querySelector('[name="titulo"]').value = sesion.titulo;
        form.querySelector('[name="fecha_prevista"]').value = sesion.fecha_prevista || '';
        form.querySelector('[name="hora"]').value = sesion.hora || '';
        form.querySelector('[name="ponente"]').value = sesion.ponente;
        form.querySelector('[name="grupo"]').value = sesion.grupo || '';
        form.querySelector('[name="estado"]').value = sesion.estado;
        form.querySelector('[name="fecha_exposicion"]').value = sesion.fecha_exposicion || '';
        form.querySelector('[name="palabras_clave"]').value = sesion.palabras_clave || '';
        form.querySelector('[name="url_acceso"]').value = sesion.url_acceso || '';
        form.querySelector('[name="observaciones"]').value = sesion.observaciones || '';

        // Configurar copia automática de fecha (solo copiará si fecha_exposicion está vacía)
        configurarCopiaFechaExposicion();

        // Mostrar botón eliminar en edición
        const btnEliminar = document.getElementById('btnEliminarSesion');
        if (btnEliminar) btnEliminar.style.display = 'inline-flex';

        document.querySelector('#modalSesion .modal-header h2').textContent = 'Editar Sesión';
        abrirModal('modalSesion');
    } catch (error) {
        mostrarNotificacion('Error al cargar sesión: ' + error.message, 'error');
    }
}

// Confirmar eliminación desde el modal de edición
function confirmarEliminarSesion() {
    const form = document.getElementById('formSesion');
    const id = form.querySelector('[name="id"]').value;

    if (!id) return;

    if (confirm('¿Estás seguro de eliminar esta sesión? Esta acción no se puede deshacer.')) {
        eliminarSesionYCerrarModal(id);
    }
}

// Eliminar sesión y cerrar modal
async function eliminarSesionYCerrarModal(id) {
    try {
        await Sesiones.delete(id);
        mostrarNotificacion('Sesión eliminada');
        cerrarModal('modalSesion');

        // Recargar vista activa (calendario o tabla)
        const vistaCalendario = document.getElementById('vistaCalendario');
        if (vistaCalendario && vistaCalendario.style.display !== 'none') {
            cargarCalendario();
        } else {
            cargarTablaSesiones();
        }
        cargarEstadisticas();
    } catch (error) {
        mostrarNotificacion('Error al eliminar: ' + error.message, 'error');
    }
}

// Eliminar sesión
async function eliminarSesion(id) {
    if (!confirm('¿Estás seguro de eliminar esta sesión?')) return;

    try {
        await Sesiones.delete(id);
        mostrarNotificacion('Sesión eliminada');

        // Recargar vista activa (calendario o tabla)
        const vistaCalendario = document.getElementById('vistaCalendario');
        if (vistaCalendario && vistaCalendario.style.display !== 'none') {
            cargarCalendario();
        } else {
            cargarTablaSesiones();
        }
        cargarEstadisticas();
    } catch (error) {
        mostrarNotificacion('Error: ' + error.message, 'error');
    }
}

// Cargar usuarios en el select de ponente
async function cargarSelectPonentes() {
    const select = document.getElementById('selectPonente');
    if (!select) return;

    try {
        const usuarios = await Usuarios.getAll();
        select.innerHTML = '<option value="">Seleccionar...</option>';
        usuarios.forEach(u => {
            select.innerHTML += `<option value="${u.nombre}">${u.nombre}</option>`;
        });
    } catch (error) {
        console.error('Error cargando ponentes:', error);
    }
}

// Abrir modal nueva sesión
async function abrirModalSesion() {
    document.getElementById('formSesion').reset();
    document.querySelector('#modalSesion .modal-header h2').textContent = 'Nueva Sesión';
    // Ocultar botón eliminar en nueva sesión
    const btnEliminar = document.getElementById('btnEliminarSesion');
    if (btnEliminar) btnEliminar.style.display = 'none';
    await cargarSelectPonentes();
    configurarCopiaFechaExposicion();
    abrirModal('modalSesion');
}

// Configurar copia automática de fecha prevista a fecha exposición
function configurarCopiaFechaExposicion() {
    const fechaPrevista = document.querySelector('#formSesion [name="fecha_prevista"]');
    const fechaExposicion = document.querySelector('#formSesion [name="fecha_exposicion"]');

    if (fechaPrevista && fechaExposicion) {
        // Eliminar listener anterior si existe
        fechaPrevista.removeEventListener('change', copiarFechaExposicion);
        // Añadir nuevo listener
        fechaPrevista.addEventListener('change', copiarFechaExposicion);
    }
}

// Copiar fecha prevista a fecha exposición si está vacía
function copiarFechaExposicion(event) {
    const fechaExposicion = document.querySelector('#formSesion [name="fecha_exposicion"]');
    if (fechaExposicion && !fechaExposicion.value) {
        fechaExposicion.value = event.target.value;
    }
}

// Filtrar sesiones (programación - NO realizadas)
async function filtrarSesiones() {
    const filtros = {
        titulo: document.getElementById('filtroTitulo')?.value,
        ponente: document.getElementById('filtroPonente')?.value,
        grupo: document.getElementById('filtroGrupo')?.value,
        estado: document.getElementById('filtroEstado')?.value,
        palabras_clave: document.getElementById('filtroPalabras')?.value,
        fecha_desde: document.getElementById('filtroFechaDesde')?.value,
        fecha_hasta: document.getElementById('filtroFechaHasta')?.value
    };

    // Limpiar filtros vacíos
    Object.keys(filtros).forEach(k => {
        if (!filtros[k]) delete filtros[k];
    });

    try {
        const sesiones = await Sesiones.filtrarProgramadas(filtros);
        cargarTablaSesiones(sesiones);
    } catch (error) {
        mostrarNotificacion('Error al filtrar: ' + error.message, 'error');
    }
}

// Limpiar filtros
function limpiarFiltros() {
    document.querySelectorAll('.filters input, .filters select').forEach(el => {
        if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
        } else {
            el.value = '';
        }
    });
    cargarTablaSesiones();
}

// =============================================
// FUNCIONES DE USUARIOS
// =============================================

async function cargarTablaUsuarios() {
    const tbody = document.getElementById('tablaUsuarios');
    if (!tbody) return;

    try {
        const data = await Usuarios.getAll();

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">No hay usuarios registrados</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(u => `
            <tr>
                <td>${u.nombre}</td>
                <td>${u.email}</td>
                <td><span class="badge ${u.perfil === 'administrador' ? 'badge-admin' : 'badge-user'}">${u.perfil}</span></td>
                <td class="table-actions">
                    <button class="btn-icon" onclick="abrirModalResetPassword('${u.id}', '${u.nombre}')" title="Resetear contraseña">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn-icon edit" onclick="editarUsuario('${u.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="eliminarUsuario('${u.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        mostrarNotificacion('Error al cargar usuarios: ' + error.message, 'error');
    }
}

async function guardarUsuario(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const id = formData.get('id');

    const nombre = formData.get('nombre');
    const email = formData.get('email');
    const perfil = formData.get('perfil');
    const password = formData.get('password');

    try {
        if (id) {
            // Actualizar usuario existente (solo nombre y perfil)
            await Usuarios.update(id, { nombre, perfil });
            mostrarNotificacion('Usuario actualizado');
        } else {
            // Crear nuevo usuario con Supabase Auth
            if (!password || password.length < 6) {
                mostrarNotificacion('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }
            await Auth.registrar(email, password, nombre, perfil);
            mostrarNotificacion('Usuario creado correctamente');
        }
        cerrarModal('modalUsuario');
        cargarTablaUsuarios();
        cargarEstadisticas();
    } catch (error) {
        mostrarNotificacion('Error: ' + error.message, 'error');
    }
}

async function editarUsuario(id) {
    try {
        const usuario = await Usuarios.getById(id);
        const form = document.getElementById('formUsuario');

        form.querySelector('[name="id"]').value = usuario.id;
        form.querySelector('[name="nombre"]').value = usuario.nombre;
        form.querySelector('[name="email"]').value = usuario.email;
        form.querySelector('[name="perfil"]').value = usuario.perfil;

        // Ocultar campo de contraseña al editar
        const grupoPassword = document.getElementById('grupoPassword');
        if (grupoPassword) grupoPassword.style.display = 'none';

        // Deshabilitar email al editar
        form.querySelector('[name="email"]').disabled = true;

        document.querySelector('#modalUsuario .modal-header h2').textContent = 'Editar Usuario';
        abrirModal('modalUsuario');
    } catch (error) {
        mostrarNotificacion('Error: ' + error.message, 'error');
    }
}

async function eliminarUsuario(id) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
        await Usuarios.delete(id);
        mostrarNotificacion('Usuario eliminado');
        cargarTablaUsuarios();
    } catch (error) {
        mostrarNotificacion('Error: ' + error.message, 'error');
    }
}

function abrirModalUsuario() {
    const form = document.getElementById('formUsuario');
    form.reset();
    form.querySelector('[name="id"]').value = '';

    // Mostrar campo de contraseña para nuevo usuario
    const grupoPassword = document.getElementById('grupoPassword');
    if (grupoPassword) grupoPassword.style.display = 'block';

    // Habilitar email para nuevo usuario
    form.querySelector('[name="email"]').disabled = false;

    document.querySelector('#modalUsuario .modal-header h2').textContent = 'Nuevo Usuario';
    abrirModal('modalUsuario');
}

// =============================================
// ESTADÍSTICAS (Dashboard)
// =============================================

async function cargarEstadisticas() {
    try {
        // Total sesiones
        const sesiones = await Sesiones.getAll();
        const totalSesiones = document.getElementById('totalSesiones');
        if (totalSesiones) totalSesiones.textContent = sesiones.length;

        // Sesiones realizadas
        const realizadas = sesiones.filter(s => s.estado === 'realizada').length;
        const totalRealizadas = document.getElementById('totalRealizadas');
        if (totalRealizadas) totalRealizadas.textContent = realizadas;

        // Sesiones pendientes
        const pendientes = sesiones.filter(s => s.estado === 'pendiente' || s.estado === 'fecha confirmada').length;
        const totalPendientes = document.getElementById('totalPendientes');
        if (totalPendientes) totalPendientes.textContent = pendientes;

        // Sesiones atrasadas
        const atrasadas = await Sesiones.getAtrasadas();
        const totalAtrasadas = document.getElementById('totalAtrasadas');
        if (totalAtrasadas) totalAtrasadas.textContent = atrasadas.length;
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// =============================================
// DETALLES DE SESIÓN
// =============================================

async function cargarDetalleSesion() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        window.location.href = 'repositorio.html';
        return;
    }

    try {
        const sesion = await Sesiones.getById(id);

        document.getElementById('detTitulo').textContent = sesion.titulo;
        document.getElementById('detFechaPrevista').textContent = formatearFecha(sesion.fecha_prevista);
        document.getElementById('detHora').textContent = formatearHora(sesion.hora);
        document.getElementById('detPonente').textContent = sesion.ponente;
        document.getElementById('detGrupo').textContent = sesion.grupo || '-';
        document.getElementById('detEstado').innerHTML = `<span class="badge ${getBadgeEstado(sesion.estado)}">${sesion.estado}</span>`;
        document.getElementById('detFechaExposicion').textContent = formatearFecha(sesion.fecha_exposicion);
        document.getElementById('detPalabras').textContent = sesion.palabras_clave || '-';

        const urlEl = document.getElementById('detUrl');
        if (sesion.url_acceso) {
            urlEl.innerHTML = `<a href="${sesion.url_acceso}" target="_blank">${sesion.url_acceso}</a>`;
        } else {
            urlEl.textContent = '-';
        }

        document.getElementById('detObservaciones').textContent = sesion.observaciones || '-';

        // Guardar ID para editar
        window.sesionActual = sesion;
    } catch (error) {
        mostrarNotificacion('Error al cargar sesión: ' + error.message, 'error');
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // Detectar página actual y cargar datos
    const path = window.location.pathname;

    if (path.includes('index.html') || path.endsWith('/')) {
        cargarEstadisticas();
        cargarProximasSesiones();
    }

    if (path.includes('repositorio.html')) {
        cargarTablaSesiones();
    }

    if (path.includes('programacion.html')) {
        // Por defecto mostrar vista calendario
        inicializarCalendarioProgramacion();
    }

    if (path.includes('usuarios.html')) {
        cargarTablaUsuarios();
    }

    if (path.includes('sesion.html')) {
        cargarDetalleSesion();
    }

    if (path.includes('informes.html')) {
        cargarInformes();
    }
});

// =============================================
// INFORMES
// =============================================

async function cargarInformes() {
    try {
        const stats = await Sesiones.getEstadisticas();
        const atrasadas = await Sesiones.getAtrasadas();

        // Resumen general
        document.getElementById('infTotal').textContent = stats.total;
        document.getElementById('infRealizadas').textContent = stats.realizadas;
        document.getElementById('infPendientes').textContent = stats.pendientes + stats.confirmadas;
        document.getElementById('infAnuladas').textContent = stats.anuladas;
        document.getElementById('infAtrasadas').textContent = atrasadas.length;

        // Por grupo
        const listaGrupos = document.getElementById('listaGrupos');
        if (listaGrupos) {
            listaGrupos.innerHTML = Object.entries(stats.porGrupo)
                .map(([grupo, count]) => `
                    <li>
                        <span class="label">${grupo}</span>
                        <span class="value">${count}</span>
                    </li>
                `).join('');
        }

        // Por ponente
        const listaPonentes = document.getElementById('listaPonentes');
        if (listaPonentes) {
            const ponentes = Object.entries(stats.porPonente)
                .sort((a, b) => b[1] - a[1]);

            listaPonentes.innerHTML = ponentes.map(([ponente, count]) => `
                <li>
                    <span class="label">${ponente}</span>
                    <span class="value">${count}</span>
                </li>
            `).join('');
        }
    } catch (error) {
        mostrarNotificacion('Error al cargar informes: ' + error.message, 'error');
    }
}

// =============================================
// CALENDARIO DE PROGRAMACIÓN
// =============================================

// Estado del calendario
let calendarioMesActual = new Date();
let sesionesCalendario = [];

// Nombres de meses en español
const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Cambiar entre vista calendario y tabla
function cambiarVista(vista) {
    const vistaCalendario = document.getElementById('vistaCalendario');
    const vistaTabla = document.getElementById('vistaTabla');
    const btnCalendario = document.getElementById('btnVistaCalendario');
    const btnTabla = document.getElementById('btnVistaTabla');

    if (!vistaCalendario || !vistaTabla) return;

    if (vista === 'calendario') {
        vistaCalendario.style.display = 'block';
        vistaTabla.style.display = 'none';
        btnCalendario.classList.add('active');
        btnTabla.classList.remove('active');
        cargarCalendario();
    } else {
        vistaCalendario.style.display = 'none';
        vistaTabla.style.display = 'block';
        btnCalendario.classList.remove('active');
        btnTabla.classList.add('active');
        cargarTablaSesiones();
    }
}

// Navegar entre meses
function navegarMes(direccion) {
    calendarioMesActual.setMonth(calendarioMesActual.getMonth() + direccion);
    cargarCalendario();
}

// Cargar y renderizar calendario
async function cargarCalendario() {
    const contenedor = document.getElementById('calendarioDias');
    const tituloMes = document.getElementById('calendarioMesActual');

    if (!contenedor || !tituloMes) return;

    try {
        // Cargar sesiones programadas
        sesionesCalendario = await Sesiones.getProgramadas();

        // Actualizar título del mes
        const mes = calendarioMesActual.getMonth();
        const anio = calendarioMesActual.getFullYear();
        tituloMes.textContent = `${MESES[mes]} ${anio}`;

        // Generar días del calendario
        contenedor.innerHTML = generarDiasCalendario(mes, anio);

    } catch (error) {
        mostrarNotificacion('Error al cargar calendario: ' + error.message, 'error');
    }
}

// Generar HTML de los días del calendario
function generarDiasCalendario(mes, anio) {
    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);
    const diasEnMes = ultimoDia.getDate();

    // Día de la semana del primer día (0=domingo, ajustamos a lunes=0)
    let primerDiaSemana = primerDia.getDay();
    primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

    // Días del mes anterior para completar la primera semana
    const diasMesAnterior = new Date(anio, mes, 0).getDate();

    let html = '';
    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    // Días del mes anterior
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
        const dia = diasMesAnterior - i;
        const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        html += `<div class="calendario-dia otro-mes">
            <div class="calendario-dia-numero">${dia}</div>
        </div>`;
    }

    // Días del mes actual
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fecha = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const esHoy = fecha === hoyStr;
        const sesionesDelDia = obtenerSesionesDelDia(fecha);

        html += `<div class="calendario-dia${esHoy ? ' hoy' : ''}">
            <div class="calendario-dia-numero">${dia}</div>
            ${sesionesDelDia.map(s => {
                const fechasIguales = s.fecha_exposicion === s.fecha_prevista;
                const clase = fechasIguales ? 'fecha-igual' : 'fecha-diferente';
                return `<a href="sesion.html?id=${s.id}" class="calendario-sesion ${clase}" title="${s.titulo}">${s.ponente}</a>`;
            }).join('')}
        </div>`;
    }

    // Días del mes siguiente para completar la última semana
    const totalDiasMostrados = primerDiaSemana + diasEnMes;
    const diasRestantes = totalDiasMostrados % 7 === 0 ? 0 : 7 - (totalDiasMostrados % 7);

    for (let dia = 1; dia <= diasRestantes; dia++) {
        html += `<div class="calendario-dia otro-mes">
            <div class="calendario-dia-numero">${dia}</div>
        </div>`;
    }

    return html;
}

// Obtener sesiones para una fecha específica
function obtenerSesionesDelDia(fecha) {
    return sesionesCalendario.filter(s => s.fecha_exposicion === fecha);
}

// Inicializar calendario en página de programación
function inicializarCalendarioProgramacion() {
    const vistaCalendario = document.getElementById('vistaCalendario');
    if (vistaCalendario) {
        calendarioMesActual = new Date();
        cargarCalendario();
    }
}
