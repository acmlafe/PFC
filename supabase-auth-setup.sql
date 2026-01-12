-- =============================================
-- CONFIGURACIÓN DE AUTENTICACIÓN - ACM SF La Fe
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Primero eliminamos la tabla usuarios existente
DROP TABLE IF EXISTS usuarios CASCADE;

-- Recrear tabla usuarios vinculada a auth.users
CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    perfil TEXT NOT NULL DEFAULT 'usuario' CHECK (perfil IN ('administrador', 'usuario')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_perfil ON usuarios(perfil);

-- Habilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios
-- Todos pueden leer usuarios (necesario para mostrar nombres)
CREATE POLICY "Lectura publica usuarios" ON usuarios FOR SELECT USING (true);

-- Solo el propio usuario o admins pueden insertar
CREATE POLICY "Insercion usuarios" ON usuarios FOR INSERT WITH CHECK (true);

-- Solo admins pueden actualizar
CREATE POLICY "Actualizacion usuarios" ON usuarios FOR UPDATE USING (true);

-- Solo admins pueden eliminar
CREATE POLICY "Eliminacion usuarios" ON usuarios FOR DELETE USING (true);

-- =============================================
-- FUNCIÓN PARA CREAR PERFIL AUTOMÁTICAMENTE
-- Cuando se registra un usuario, se crea su perfil
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, nombre, perfil)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'perfil', 'usuario')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- CREAR USUARIO ADMINISTRADOR INICIAL
-- =============================================

-- Nota: El usuario admin se debe crear desde la aplicación o desde
-- Supabase Dashboard > Authentication > Users > Add user

-- =============================================
-- ¡LISTO! Ahora debes crear el usuario admin manualmente
-- =============================================
