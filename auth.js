// =============================================
// AUTENTICACIÓN - ACM SF La Fe
// =============================================

const Auth = {
    // Usuario actual
    usuario: null,
    perfil: null,

    // Iniciar sesión
    async login(email, password) {
        const { data, error } = await db.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Obtener perfil del usuario
        await this.cargarPerfil(data.user.id);

        return data;
    },

    // Cerrar sesión
    async logout() {
        const { error } = await db.auth.signOut();
        if (error) throw error;

        this.usuario = null;
        this.perfil = null;

        window.location.href = 'login.html';
    },

    // Registrar nuevo usuario (solo admins)
    async registrar(email, password, nombre, perfil = 'usuario') {
        // Guardar sesión actual
        const { data: { session: currentSession } } = await db.auth.getSession();

        // Crear nuevo usuario con signUp
        const { data: authData, error: authError } = await db.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nombre: nombre,
                    perfil: perfil
                }
            }
        });

        if (authError) throw authError;

        // Restaurar la sesión del admin
        if (currentSession) {
            await db.auth.setSession({
                access_token: currentSession.access_token,
                refresh_token: currentSession.refresh_token
            });
        }

        // Esperar un momento para que el trigger cree el registro
        await new Promise(resolve => setTimeout(resolve, 500));

        // Actualizar el perfil con nombre y perfil correctos
        const { data: userData, error: userError } = await db
            .from('usuarios')
            .update({ nombre: nombre, perfil: perfil })
            .eq('id', authData.user.id)
            .select()
            .single();

        if (userError) throw userError;

        return userData;
    },

    // Cargar perfil del usuario
    async cargarPerfil(userId) {
        const { data, error } = await db
            .from('usuarios')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error cargando perfil:', error);
            this.perfil = { perfil: 'usuario' }; // Por defecto
            return;
        }

        this.perfil = data;
    },

    // Verificar si hay sesión activa
    async verificarSesion() {
        const { data: { session } } = await db.auth.getSession();

        if (session) {
            this.usuario = session.user;
            await this.cargarPerfil(session.user.id);
            return true;
        }

        return false;
    },

    // Verificar si es administrador
    esAdmin() {
        return this.perfil && this.perfil.perfil === 'administrador';
    },

    // Obtener nombre del usuario
    getNombre() {
        return this.perfil ? this.perfil.nombre : 'Usuario';
    },

    // Proteger página (redirige a login si no hay sesión)
    async protegerPagina() {
        const haySession = await this.verificarSesion();

        if (!haySession) {
            window.location.href = 'login.html';
            return false;
        }

        return true;
    },

    // Proteger página solo para admins
    async protegerPaginaAdmin() {
        const haySession = await this.protegerPagina();

        if (haySession && !this.esAdmin()) {
            window.location.href = 'index.html';
            return false;
        }

        return true;
    },

    // Cambiar contraseña (usuario actual)
    async cambiarPassword(nuevaPassword) {
        const { data, error } = await db.auth.updateUser({
            password: nuevaPassword
        });

        if (error) throw error;
        return data;
    },

    // Resetear contraseña de otro usuario (solo admin)
    // Nota: Esta función requiere enviar email de reset
    async resetearPassword(userId, nuevaPassword) {
        // Obtener email del usuario
        const { data: usuario, error: userError } = await db
            .from('usuarios')
            .select('email')
            .eq('id', userId)
            .single();

        if (userError) throw userError;

        // Enviar email de reset de contraseña
        const { error } = await db.auth.resetPasswordForEmail(usuario.email, {
            redirectTo: window.location.origin + '/login.html'
        });

        if (error) throw error;

        return { message: 'Email de restablecimiento enviado' };
    },

    // Aplicar permisos en la UI
    aplicarPermisos() {
        const esAdmin = this.esAdmin();

        // Ocultar elementos solo para admins
        document.querySelectorAll('[data-admin-only]').forEach(el => {
            el.style.display = esAdmin ? '' : 'none';
        });

        // Ocultar enlaces del menú para usuarios (solo Usuarios, NO Programación)
        if (!esAdmin) {
            document.querySelectorAll('.nav-item a[href="usuarios.html"]').forEach(el => {
                el.parentElement.style.display = 'none';
            });
        }

        // Mostrar nombre de usuario en el header si existe
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) {
            userDisplay.textContent = this.getNombre();
        }

        // Mostrar botón de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
        }
    }
};

// =============================================
// FUNCIONES DE LOGIN
// =============================================

async function iniciarSesion(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');
    const errorDiv = document.getElementById('loginError');
    const errorMsg = document.getElementById('errorMessage');

    // Deshabilitar botón
    btn.disabled = true;
    btnText.textContent = 'Iniciando sesión...';
    errorDiv.classList.remove('show');

    try {
        await Auth.login(email, password);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error de login:', error);

        let mensaje = 'Error de autenticación';
        if (error.message.includes('Invalid login')) {
            mensaje = 'Email o contraseña incorrectos';
        } else if (error.message.includes('Email not confirmed')) {
            mensaje = 'Debes confirmar tu email primero';
        }

        errorMsg.textContent = mensaje;
        errorDiv.classList.add('show');

        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
    }
}

// Verificar si ya hay sesión al cargar login
async function verificarSesionEnLogin() {
    const haySession = await Auth.verificarSesion();
    if (haySession) {
        window.location.href = 'index.html';
    }
}

// Si estamos en la página de login, verificar sesión
if (window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', verificarSesionEnLogin);
}

// =============================================
// CAMBIO DE CONTRASEÑA
// =============================================

function abrirModalPassword() {
    document.getElementById('modalCambiarPassword').classList.add('active');
}

function cerrarModalPassword() {
    document.getElementById('modalCambiarPassword').classList.remove('active');
    document.getElementById('formCambiarPassword').reset();
}

async function cambiarPassword(event) {
    event.preventDefault();

    const nuevaPassword = document.getElementById('nuevaPassword').value;
    const confirmarPassword = document.getElementById('confirmarPassword').value;

    if (nuevaPassword.length < 6) {
        mostrarNotificacion('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    if (nuevaPassword !== confirmarPassword) {
        mostrarNotificacion('Las contraseñas no coinciden', 'error');
        return;
    }

    try {
        await Auth.cambiarPassword(nuevaPassword);
        mostrarNotificacion('Contraseña actualizada correctamente', 'success');
        cerrarModalPassword();
    } catch (error) {
        mostrarNotificacion('Error: ' + error.message, 'error');
    }
}

// =============================================
// RESET DE CONTRASEÑA (ADMIN)
// =============================================

let usuarioResetId = null;

function abrirModalResetPassword(userId, nombreUsuario) {
    usuarioResetId = userId;
    document.getElementById('resetUsuarioNombre').textContent = nombreUsuario;
    document.getElementById('modalResetPassword').classList.add('active');
}

function cerrarModalResetPassword() {
    document.getElementById('modalResetPassword').classList.remove('active');
    document.getElementById('formResetPassword').reset();
    usuarioResetId = null;
}

async function resetearPasswordUsuario(event) {
    event.preventDefault();

    const nuevaPassword = document.getElementById('resetNuevaPassword').value;
    const confirmarPassword = document.getElementById('resetConfirmarPassword').value;

    if (nuevaPassword.length < 6) {
        mostrarNotificacion('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    if (nuevaPassword !== confirmarPassword) {
        mostrarNotificacion('Las contraseñas no coinciden', 'error');
        return;
    }

    try {
        await Auth.resetearPassword(usuarioResetId, nuevaPassword);
        mostrarNotificacion('Contraseña restablecida correctamente', 'success');
        cerrarModalResetPassword();
    } catch (error) {
        mostrarNotificacion('Error: ' + error.message, 'error');
    }
}
