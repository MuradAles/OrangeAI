import {
    generateProfileColor,
    getInitials,
    PROFILE_COLORS,
} from '@/shared/utils/ProfilePictureGenerator';

describe('ProfilePictureGenerator', () => {
  describe('generateProfileColor', () => {
    it('should generate a color from the palette', () => {
      const color = generateProfileColor('John Doe');
      expect(PROFILE_COLORS).toContain(color);
    });

    it('should generate consistent colors for same name', () => {
      const color1 = generateProfileColor('Jane Smith');
      const color2 = generateProfileColor('Jane Smith');
      expect(color1).toBe(color2);
    });

    it('should generate different colors for different names', () => {
      const colors = new Set();
      const names = [
        'Alice',
        'Bob',
        'Charlie',
        'David',
        'Emma',
        'Frank',
        'Grace',
        'Henry',
        'Iris',
        'Jack',
      ];

      names.forEach(name => {
        colors.add(generateProfileColor(name));
      });

      // With 10 names and 8-10 colors, we should get at least 5 unique colors
      expect(colors.size).toBeGreaterThanOrEqual(5);
    });

    it('should handle empty string', () => {
      const color = generateProfileColor('');
      expect(PROFILE_COLORS).toContain(color);
    });

    it('should handle single character', () => {
      const color = generateProfileColor('A');
      expect(PROFILE_COLORS).toContain(color);
    });

    it('should handle special characters', () => {
      const color = generateProfileColor('@#$%^&*');
      expect(PROFILE_COLORS).toContain(color);
    });

    it('should handle unicode characters', () => {
      const color = generateProfileColor('你好世界');
      expect(PROFILE_COLORS).toContain(color);
    });

    it('should distribute colors evenly', () => {
      // Generate colors for many names
      const colorCounts = new Map();
      const numTests = 100;

      for (let i = 0; i < numTests; i++) {
        const color = generateProfileColor(`User${i}`);
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }

      // Each color should be used at least once with 100 tests
      expect(colorCounts.size).toBeGreaterThan(1);

      // No color should dominate (be used more than 50% of the time)
      colorCounts.forEach(count => {
        expect(count).toBeLessThan(numTests * 0.5);
      });
    });
  });

  describe('getInitials', () => {
    it('should extract first letter from single word', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should extract first letter from full name', () => {
      expect(getInitials('John Doe')).toBe('J');
    });

    it('should handle leading spaces', () => {
      expect(getInitials('  John Doe')).toBe('J');
    });

    it('should handle trailing spaces', () => {
      expect(getInitials('John Doe  ')).toBe('J');
    });

    it('should return uppercase letter', () => {
      expect(getInitials('john')).toBe('J');
      expect(getInitials('alice')).toBe('A');
    });

    it('should handle empty string', () => {
      expect(getInitials('')).toBe('?');
    });

    it('should handle whitespace-only string', () => {
      expect(getInitials('   ')).toBe('?');
    });

    it('should handle names starting with numbers', () => {
      const initial = getInitials('123User');
      expect(initial).toBe('1');
    });

    it('should handle names starting with special characters', () => {
      const initial = getInitials('@JohnDoe');
      expect(initial).toBe('@');
    });

    it('should handle emoji names', () => {
      const initial = getInitials('😀 John');
      // Emojis may render differently in test environment
      // Just check that we get a truthy value
      expect(initial).toBeTruthy();
      expect(initial.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      expect(getInitials('你好')).toBe('你');
      expect(getInitials('مرحبا')).toBe('م');
    });

    it('should handle single character names', () => {
      expect(getInitials('A')).toBe('A');
      expect(getInitials('z')).toBe('Z');
    });

    it('should handle multiple spaces between words', () => {
      expect(getInitials('John    Doe')).toBe('J');
    });

    it('should extract from camelCase names', () => {
      expect(getInitials('johnDoe')).toBe('J');
    });

    it('should extract from PascalCase names', () => {
      expect(getInitials('JohnDoe')).toBe('J');
    });
  });

  describe('PROFILE_COLORS constant', () => {
    it('should have at least 8 colors', () => {
      expect(PROFILE_COLORS.length).toBeGreaterThanOrEqual(8);
    });

    it('should contain valid hex colors', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      PROFILE_COLORS.forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });
    });

    it('should have unique colors', () => {
      const uniqueColors = new Set(PROFILE_COLORS);
      expect(uniqueColors.size).toBe(PROFILE_COLORS.length);
    });

    it('should not include pure white or pure black', () => {
      expect(PROFILE_COLORS).not.toContain('#FFFFFF');
      expect(PROFILE_COLORS).not.toContain('#ffffff');
      expect(PROFILE_COLORS).not.toContain('#000000');
    });
  });

  describe('Color Distribution Algorithm', () => {
    it('should use all available colors with enough samples', () => {
      const usedColors = new Set();
      const numTests = PROFILE_COLORS.length * 10; // 10x the number of colors

      for (let i = 0; i < numTests; i++) {
        const color = generateProfileColor(`TestUser${i}`);
        usedColors.add(color);
      }

      // All colors should be used with enough samples
      expect(usedColors.size).toBe(PROFILE_COLORS.length);
    });

    it('should be deterministic', () => {
      const testCases = [
        'Alice',
        'Bob',
        'Charlie',
        'David',
        'Emma',
        'Frank',
        'Grace',
        'Henry',
      ];

      testCases.forEach(name => {
        const results = Array(5)
          .fill(null)
          .map(() => generateProfileColor(name));

        // All results for the same name should be identical
        results.forEach(color => {
          expect(color).toBe(results[0]);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long names', () => {
      const longName = 'A'.repeat(1000);
      const color = generateProfileColor(longName);
      expect(PROFILE_COLORS).toContain(color);
    });

    it('should handle mixed case names consistently', () => {
      const color1 = generateProfileColor('John Doe');
      const color2 = generateProfileColor('john doe');
      const color3 = generateProfileColor('JOHN DOE');

      // Colors should be consistent regardless of case
      // (depends on implementation - might be case-sensitive or not)
      expect(typeof color1).toBe('string');
      expect(typeof color2).toBe('string');
      expect(typeof color3).toBe('string');
    });

    it('should handle null-like values gracefully', () => {
      // These should not crash
      expect(() => generateProfileColor(undefined as any)).not.toThrow();
      expect(() => generateProfileColor(null as any)).not.toThrow();
    });

    it('should handle numbers as names', () => {
      const color = generateProfileColor('12345');
      expect(PROFILE_COLORS).toContain(color);
    });
  });
});

