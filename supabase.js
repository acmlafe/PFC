// =============================================
// CLIENTE SUPABASE - SFLaFe
// =============================================
// La configuración (URL y ANON_KEY) se carga desde config.js
// =============================================

const { createClient } = supabase;

// Cliente principal (usa ANON_KEY - seguro para frontend)
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================
// FUNCIONES DE SESIONES
// =============================================

const Sesiones = {
    // Obtener todas las sesiones (ordenadas por fecha de exposición)
    async getAll() {
        const { data, error } = await db
            .from('sesiones')
            .select('*')
            .order('fecha_exposicion', { ascending: false, nullsFirst: false });
        if (error) throw error;
        return data || [];
    },

    // Obtener una sesión por ID
    async getById(id) {
        const { data, error } = await db
            .from('sesiones')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    // Obtener sesiones atrasadas (pendientes con fecha anterior a hoy)
    async getAtrasadas() {
        const hoy = new Date().toISOString().split('T')[0];
        const { data, error } = await db
            .from('sesiones')
            .select('*')
            .eq('estado', 'pendiente')
            .lt('fecha_prevista', hoy)
            .order('fecha_prevista', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    // Obtener sesiones pendientes o programadas (ordenadas por fecha de exposición)
    async getProximas(limite = 5) {
        const { data, error } = await db
            .from('sesiones')
            .select('*')
            .in('estado', ['pendiente', 'fecha confirmada'])
            .order('fecha_exposicion', { ascending: true, nullsFirst: false })
            .limit(limite);
        if (error) throw error;
        return data || [];
    },

    // Obtener sesiones recientes (realizadas)
    async getRecientes(limite = 5) {
        const { data, error } = await db
            .from('sesiones')
            .select('*')
            .eq('estado', 'realizada')
            .order('fecha_exposicion', { ascending: false })
            .limit(limite);
        if (error) throw error;
        return data || [];
    },

    // Obtener sesiones programadas (NO realizadas) - para sección Programación
    async getProgramadas() {
        const { data, error } = await db
            .from('sesiones')
            .select('*')
            .neq('estado', 'realizada')
            .order('fecha_exposicion', { ascending: true, nullsFirst: false });
        if (error) throw error;
        return data || [];
    },

    // Obtener sesiones realizadas - para sección Repositorio
    async getRealizadas() {
        const { data, error } = await db
            .from('sesiones')
            .select('*')
            .eq('estado', 'realizada')
            .order('fecha_exposicion', { ascending: false, nullsFirst: false });
        if (error) throw error;
        return data || [];
    },

    // Crear nueva sesión
    async create(sesion) {
        const { data, error } = await db
            .from('sesiones')
            .insert([sesion])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Actualizar sesión
    async update(id, cambios) {
        const { data, error } = await db
            .from('sesiones')
            .update(cambios)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Eliminar sesión
    async delete(id) {
        const { error } = await db
            .from('sesiones')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    // Filtrar sesiones (base)
    // modoFiltro: 'todas' | 'programadas' | 'realizadas'
    async filtrar(filtros, modoFiltro = 'todas') {
        let query = db.from('sesiones').select('*');

        // Filtrar por modo (programación vs repositorio)
        if (modoFiltro === 'programadas') {
            query = query.neq('estado', 'realizada');
        } else if (modoFiltro === 'realizadas') {
            query = query.eq('estado', 'realizada');
        }

        if (filtros.titulo) {
            query = query.ilike('titulo', `%${filtros.titulo}%`);
        }
        if (filtros.ponente) {
            query = query.ilike('ponente', `%${filtros.ponente}%`);
        }
        if (filtros.grupo) {
            query = query.eq('grupo', filtros.grupo);
        }
        if (filtros.estado && modoFiltro === 'todas') {
            query = query.eq('estado', filtros.estado);
        }
        if (filtros.palabras_clave) {
            query = query.ilike('palabras_clave', `%${filtros.palabras_clave}%`);
        }
        if (filtros.fecha_desde) {
            query = query.gte('fecha_prevista', filtros.fecha_desde);
        }
        if (filtros.fecha_hasta) {
            query = query.lte('fecha_prevista', filtros.fecha_hasta);
        }

        // Orden ascendente para programadas (próximas primero), descendente para realizadas (recientes primero)
        const ascending = modoFiltro === 'programadas';
        const { data, error } = await query.order('fecha_exposicion', { ascending, nullsFirst: false });
        if (error) throw error;
        return data || [];
    },

    // Filtrar solo sesiones programadas (NO realizadas)
    async filtrarProgramadas(filtros) {
        return this.filtrar(filtros, 'programadas');
    },

    // Filtrar solo sesiones realizadas
    async filtrarRealizadas(filtros) {
        return this.filtrar(filtros, 'realizadas');
    },

    // Estadísticas
    async getEstadisticas() {
        const todas = await this.getAll();

        const stats = {
            total: todas.length,
            pendientes: todas.filter(s => s.estado === 'pendiente').length,
            confirmadas: todas.filter(s => s.estado === 'fecha confirmada').length,
            realizadas: todas.filter(s => s.estado === 'realizada').length,
            anuladas: todas.filter(s => s.estado === 'anulada').length,
            porGrupo: {
                FIR: todas.filter(s => s.grupo === 'FIR').length,
                Plantilla: todas.filter(s => s.grupo === 'Plantilla').length,
                'Rotante externo': todas.filter(s => s.grupo === 'Rotante externo').length,
                Otros: todas.filter(s => s.grupo === 'Otros').length
            },
            porPonente: {}
        };

        // Contar por ponente
        todas.forEach(s => {
            if (s.ponente) {
                stats.porPonente[s.ponente] = (stats.porPonente[s.ponente] || 0) + 1;
            }
        });

        return stats;
    }
};

// =============================================
// FUNCIONES DE USUARIOS
// =============================================

const Usuarios = {
    // Obtener todos los usuarios
    async getAll() {
        const { data, error } = await db
            .from('usuarios')
            .select('*')
            .order('nombre');
        if (error) throw error;
        return data || [];
    },

    // Obtener usuario por ID
    async getById(id) {
        const { data, error } = await db
            .from('usuarios')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    // Crear usuario
    async create(usuario) {
        const { data, error } = await db
            .from('usuarios')
            .insert([usuario])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Actualizar usuario
    async update(id, cambios) {
        const { data, error } = await db
            .from('usuarios')
            .update(cambios)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Eliminar usuario
    async delete(id) {
        const { error } = await db
            .from('usuarios')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    // Contar usuarios
    async count() {
        const { data, error } = await db
            .from('usuarios')
            .select('id', { count: 'exact' });
        if (error) throw error;
        return data.length;
    }
};

// =============================================
// VERIFICAR CONEXIÓN
// =============================================

async function verificarConexion() {
    try {
        await db.from('usuarios').select('id').limit(1);
        console.log('✅ Conexión a Supabase establecida');
        return true;
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        return false;
    }
}

// Verificar al cargar
document.addEventListener('DOMContentLoaded', verificarConexion);
