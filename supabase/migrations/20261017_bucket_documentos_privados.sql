-- Bucket PRIVADO para documentación de titulares (constancias de habilitación).
-- Antes iban al bucket público consignataria-assets como `hab-<cuit>.<ext>`: con el
-- CUIT, cualquiera podía bajar la constancia de cualquier planta (revisión 17-10-2026).
-- Sin políticas de lectura: solo el service role (servidor / admin) accede.
insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos-privados', 'documentos-privados', false, 10485760)
on conflict (id) do update set public = false;
