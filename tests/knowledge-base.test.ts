import { MagmaKnowledgeBase } from '../src/knowledge-base.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('chromadb');
jest.mock('@langchain/openai');

describe('MagmaKnowledgeBase', () => {
  let kb: MagmaKnowledgeBase;

  beforeEach(() => {
    kb = new MagmaKnowledgeBase();
  });

  describe('categorizeContent', () => {
    test('should categorize syntax content', () => {
      const content = 'The syntax for defining a group is: G := Group<generators>;';
      const category = (kb as any).categorizeContent(content);
      expect(category).toBe('syntax');
    });

    test('should categorize function content', () => {
      const content = 'The EllipticCurve intrinsic function creates an elliptic curve.';
      const category = (kb as any).categorizeContent(content);
      expect(category).toBe('function');
    });

    test('should categorize example content', () => {
      const content = 'Example: > E := EllipticCurve([1, 2]);';
      const category = (kb as any).categorizeContent(content);
      expect(category).toBe('example');
    });
  });

  describe('extractFunctions', () => {
    test('should extract MAGMA function names', () => {
      const code = 'E := EllipticCurve([1, 2]);\nP := RandomPoint(E);';
      const functions = (kb as any).extractFunctions(code);
      expect(functions).toContain('EllipticCurve');
      expect(functions).toContain('RandomPoint');
    });
  });

  describe('assessComplexity', () => {
    test('should assess basic complexity', () => {
      const code = 'E := EllipticCurve([1, 2]);';
      const complexity = (kb as any).assessComplexity(code);
      expect(complexity).toBe('basic');
    });

    test('should assess advanced complexity', () => {
      const code = `
        for i in [1..100] do
          if IsIrreducible(f) then
            G := GaloisGroup(f);
          end if;
        end for;
      `;
      const complexity = (kb as any).assessComplexity(code);
      expect(complexity).toBe('advanced');
    });
  });

  describe('cleanMagmaCode', () => {
    test('should clean MAGMA code blocks', () => {
      const code = '```magma\n> E := EllipticCurve([1, 2]);\n```';
      const cleaned = (kb as any).cleanMagmaCode(code);
      expect(cleaned).toBe('E := EllipticCurve([1, 2]);');
    });
  });
});