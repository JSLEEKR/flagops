import { hashString, hashRange, generateId } from './hash';

describe('Hash Utils', () => {
  describe('hashString', () => {
    it('should produce consistent hash', () => {
      expect(hashString('test')).toBe(hashString('test'));
    });

    it('should produce different hashes for different strings', () => {
      expect(hashString('a')).not.toBe(hashString('b'));
    });

    it('should handle empty string', () => {
      const result = hashString('');
      expect(typeof result).toBe('number');
    });
  });

  describe('hashRange', () => {
    it('should return value in range', () => {
      const result = hashRange('test', 10);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(10);
    });

    it('should be deterministic', () => {
      expect(hashRange('test', 100)).toBe(hashRange('test', 100));
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should include prefix', () => {
      const id = generateId('flag');
      expect(id.startsWith('flag_')).toBe(true);
    });

    it('should generate without prefix', () => {
      const id = generateId();
      expect(id.length).toBeGreaterThan(0);
    });
  });
});
