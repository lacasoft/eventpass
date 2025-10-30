import { PasswordUtil } from '../../../../src/common/utils/password.util';

describe('PasswordUtil', () => {
  describe('hashPassword', () => {
    it('should hash a password and return a string', async () => {
      const password = 'testPassword123!';

      const result = await PasswordUtil.hashPassword(password);

      expect(typeof result).toBe('string');
      expect(result).not.toBe(password);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123!';

      const hash1 = await PasswordUtil.hashPassword(password);
      const hash2 = await PasswordUtil.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should hash different passwords differently', async () => {
      const password1 = 'testPassword123!';
      const password2 = 'differentPassword456!';

      const hash1 = await PasswordUtil.hashPassword(password1);
      const hash2 = await PasswordUtil.hashPassword(password2);

      expect(typeof hash1).toBe('string');
      expect(typeof hash2).toBe('string');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await PasswordUtil.hashPassword(password);

      const result = await PasswordUtil.comparePassword(
        password,
        hashedPassword,
      );

      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword456!';
      const hashedPassword = await PasswordUtil.hashPassword(password);

      const result = await PasswordUtil.comparePassword(
        wrongPassword,
        hashedPassword,
      );

      expect(result).toBe(false);
    });

    it('should handle case-sensitive comparison', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await PasswordUtil.hashPassword(password);

      const resultLower = await PasswordUtil.comparePassword(
        'testpassword123!',
        hashedPassword,
      );
      const resultUpper = await PasswordUtil.comparePassword(
        'TESTPASSWORD123!',
        hashedPassword,
      );

      expect(resultLower).toBe(false);
      expect(resultUpper).toBe(false);
    });
  });

  describe('generateTemporaryPassword', () => {
    it('should generate a password of length 16', () => {
      const password = PasswordUtil.generateTemporaryPassword();

      expect(password).toHaveLength(16);
    });

    it('should generate different passwords on multiple calls', () => {
      const password1 = PasswordUtil.generateTemporaryPassword();
      const password2 = PasswordUtil.generateTemporaryPassword();
      const password3 = PasswordUtil.generateTemporaryPassword();

      expect(password1).not.toBe(password2);
      expect(password2).not.toBe(password3);
      expect(password1).not.toBe(password3);
    });

    it('should generate password with uppercase letters', () => {
      const password = PasswordUtil.generateTemporaryPassword();

      expect(password).toMatch(/[A-Z]/);
    });

    it('should generate password with lowercase letters', () => {
      const password = PasswordUtil.generateTemporaryPassword();

      expect(password).toMatch(/[a-z]/);
    });

    it('should generate password with numbers', () => {
      const password = PasswordUtil.generateTemporaryPassword();

      expect(password).toMatch(/[0-9]/);
    });

    it('should generate password with special characters', () => {
      const password = PasswordUtil.generateTemporaryPassword();

      expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{}]/);
    });

    it('should generate passwords meeting all complexity requirements', () => {
      // Test multiple generations to ensure consistency
      for (let i = 0; i < 10; i++) {
        const password = PasswordUtil.generateTemporaryPassword();

        expect(password).toHaveLength(16);
        expect(password).toMatch(/[A-Z]/); // Has uppercase
        expect(password).toMatch(/[a-z]/); // Has lowercase
        expect(password).toMatch(/[0-9]/); // Has number
        expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{}]/); // Has special char
      }
    });

    it('should generate passwords that can be hashed', async () => {
      const tempPassword = PasswordUtil.generateTemporaryPassword();
      const hashed = await PasswordUtil.hashPassword(tempPassword);

      expect(typeof hashed).toBe('string');
      expect(hashed.length).toBeGreaterThan(0);

      const matches = await PasswordUtil.comparePassword(tempPassword, hashed);
      expect(matches).toBe(true);
    });
  });
});
