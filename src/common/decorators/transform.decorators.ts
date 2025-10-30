import { Transform } from 'class-transformer';

export function SanitizeSQL() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      // Remover caracteres potencialmente peligrosos para SQL
      return value.replace(/['";\\]/g, '');
    }
    return value;
  });
}
