import * as bcrypt from 'bcryptjs';

export class PasswordUtil {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Genera una contraseña temporal aleatoria segura
   * Formato: 16 caracteres con mayúsculas, minúsculas, números y símbolos
   * Ejemplo: Xk9mP2nQ7wR5tY8u
   */
  static generateTemporaryPassword(): string {
    const length = 16;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';

    // Asegurar al menos un carácter de cada tipo
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Completar el resto de caracteres
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Mezclar los caracteres para que no sean predecibles
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
}
