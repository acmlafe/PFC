-- =============================================
-- SESIONES FORMATIVAS SFLaFe
-- Script de creación de tablas en Supabase
-- =============================================

-- Eliminar tablas si existen (para reinstalación limpia)
DROP TABLE IF EXISTS sesiones CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Tabla de usuarios
CREATE TABLE usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    perfil TEXT NOT NULL DEFAULT 'usuario' CHECK (perfil IN ('administrador', 'usuario')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de sesiones
CREATE TABLE sesiones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    fecha_prevista DATE,
    hora TIME,
    ponente TEXT NOT NULL,
    grupo TEXT CHECK (grupo IN ('FIR', 'Plantilla', 'Rotante externo')),
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'fecha confirmada', 'realizada', 'anulada')),
    fecha_exposicion DATE,
    palabras_clave TEXT,
    url_acceso TEXT,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX idx_sesiones_fecha ON sesiones(fecha_prevista);
CREATE INDEX idx_sesiones_estado ON sesiones(estado);
CREATE INDEX idx_sesiones_ponente ON sesiones(ponente);
CREATE INDEX idx_sesiones_grupo ON sesiones(grupo);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_perfil ON usuarios(perfil);

-- Habilitar Row Level Security
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público (para desarrollo)
CREATE POLICY "Lectura pública usuarios" ON usuarios FOR SELECT USING (true);
CREATE POLICY "Inserción pública usuarios" ON usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización pública usuarios" ON usuarios FOR UPDATE USING (true);
CREATE POLICY "Eliminación pública usuarios" ON usuarios FOR DELETE USING (true);

CREATE POLICY "Lectura pública sesiones" ON sesiones FOR SELECT USING (true);
CREATE POLICY "Inserción pública sesiones" ON sesiones FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización pública sesiones" ON sesiones FOR UPDATE USING (true);
CREATE POLICY "Eliminación pública sesiones" ON sesiones FOR DELETE USING (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sesiones_timestamp
    BEFORE UPDATE ON sesiones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =============================================
-- DATOS DE EJEMPLO
-- =============================================

-- Usuarios de ejemplo
INSERT INTO usuarios (nombre, email, perfil) VALUES
('Administrador', 'admin@sflafe.com', 'administrador'),
('Usuario Demo', 'usuario@sflafe.com', 'usuario');

-- Sesiones de ejemplo
INSERT INTO sesiones (titulo, fecha_prevista, hora, ponente, grupo, estado, fecha_exposicion, palabras_clave, url_acceso, observaciones) VALUES
('Introducción a la Farmacia Hospitalaria', '2025-01-15', '10:00', 'Dr. García López', 'Plantilla', 'fecha confirmada', NULL, 'introducción, farmacia, hospitalaria', 'https://ejemplo.com/sesion1', 'Sesión inaugural del programa'),
('Manejo de Citostáticos', '2025-01-22', '11:00', 'Dra. Martínez Ruiz', 'FIR', 'pendiente', NULL, 'citostáticos, oncología, seguridad', NULL, 'Requiere sala con campana de flujo laminar'),
('Farmacoterapia en UCI', '2025-02-05', '09:30', 'Dr. Sánchez Pérez', 'Plantilla', 'pendiente', NULL, 'UCI, críticos, farmacoterapia', NULL, NULL),
('Actualización en Antibióticos', '2024-12-10', '10:00', 'Dra. López García', 'FIR', 'realizada', '2024-12-10', 'antibióticos, resistencias, actualización', 'https://ejemplo.com/sesion4', 'Sesión muy bien valorada'),
('Nutrición Parenteral', '2024-11-20', '12:00', 'Dr. Fernández Torres', 'Rotante externo', 'realizada', '2024-11-20', 'nutrición, parenteral, formulación', 'https://ejemplo.com/sesion5', NULL);

-- =============================================
-- ¡LISTO! Ejecuta este script en Supabase SQL Editor
-- =============================================
