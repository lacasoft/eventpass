import { PasswordValidator } from '../../../../src/common/utils/password-validator.util';

describe('PasswordValidator', () => {
  describe('validate', () => {
    it('should return valid for strong password', () => {
      const result = PasswordValidator.validate('Test123!');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return multiple valid results for different strong passwords', () => {
      const validPasswords = [
        'MyP@ssw0rd',
        'Str0ng!Pass',
        'C0mpl3x#Pwd',
        'S3cur3$Password',
      ];

      validPasswords.forEach((password) => {
        const result = PasswordValidator.validate(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should return error for password shorter than 8 characters', () => {
      const result = PasswordValidator.validate('Test1!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 8 characters long',
      );
    });

    it('should return error for password without uppercase letter', () => {
      const result = PasswordValidator.validate('test123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter',
      );
    });

    it('should return error for password without lowercase letter', () => {
      const result = PasswordValidator.validate('TEST123!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter',
      );
    });

    it('should return error for password without number', () => {
      const result = PasswordValidator.validate('TestPass!');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one number',
      );
    });

    it('should return error for password without special character', () => {
      const result = PasswordValidator.validate('Test1234');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character',
      );
    });

    it('should return multiple errors for weak password', () => {
      const result = PasswordValidator.validate('test');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept various special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{};\'"\\|,.<>/?';
      const basePassword = 'Test123';

      for (const char of specialChars) {
        const password = basePassword + char;
        const result = PasswordValidator.validate(password);
        expect(result.isValid).toBe(true);
      }
    });
  });
});
