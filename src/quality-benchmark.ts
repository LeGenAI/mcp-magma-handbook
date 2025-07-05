// Polyfill fetch for Node.js
import fetch from 'node-fetch';
// @ts-ignore
global.fetch = fetch;

import { AdvancedMagmaKnowledgeBase } from './advanced-knowledge-base.js';
import { config } from 'dotenv';

config();

interface BenchmarkQuery {
  query: string;
  expectedTerms: string[];
  expectedCategory?: string;
  expectedFunctions?: string[];
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface BenchmarkResult {
  query: string;
  relevanceScore: number;
  speedMs: number;
  foundExpectedTerms: string[];
  foundExpectedFunctions: string[];
  topScore: number;
  resultCount: number;
  category: string;
}

export class QualityBenchmark {
  private kb: AdvancedMagmaKnowledgeBase;
  
  // Comprehensive test suite for MAGMA functionality
  private benchmarkQueries: BenchmarkQuery[] = [
    // Coding Theory
    {
      query: 'Hamming code generator matrix',
      expectedTerms: ['hamming', 'generator', 'matrix', 'code'],
      expectedCategory: 'function',
      expectedFunctions: ['HammingCode', 'GeneratorMatrix'],
      description: 'Basic coding theory - Hamming codes',
      difficulty: 'easy'
    },
    {
      query: 'Reed Solomon error correction',
      expectedTerms: ['reed', 'solomon', 'error', 'correction'],
      expectedCategory: 'algorithm',
      description: 'Advanced coding theory',
      difficulty: 'medium'
    },
    {
      query: 'BCH code construction polynomial',
      expectedTerms: ['bch', 'construction', 'polynomial'],
      description: 'Complex coding theory concepts',
      difficulty: 'hard'
    },
    
    // Group Theory
    {
      query: 'permutation group symmetric alternating',
      expectedTerms: ['permutation', 'group', 'symmetric', 'alternating'],
      expectedFunctions: ['PermutationGroup', 'SymmetricGroup', 'AlternatingGroup'],
      description: 'Basic group theory',
      difficulty: 'easy'
    },
    {
      query: 'Sylow subgroup computation',
      expectedTerms: ['sylow', 'subgroup'],
      expectedFunctions: ['SylowSubgroup'],
      description: 'Intermediate group theory',
      difficulty: 'medium'
    },
    {
      query: 'group cohomology calculation',
      expectedTerms: ['cohomology', 'group'],
      description: 'Advanced group theory',
      difficulty: 'hard'
    },
    
    // Number Theory
    {
      query: 'integer factorization algorithm',
      expectedTerms: ['integer', 'factorization', 'algorithm'],
      expectedFunctions: ['Factorization', 'FactorInteger'],
      description: 'Basic number theory',
      difficulty: 'easy'
    },
    {
      query: 'quadratic residue legendre symbol',
      expectedTerms: ['quadratic', 'residue', 'legendre'],
      description: 'Intermediate number theory',
      difficulty: 'medium'
    },
    {
      query: 'L-function analytic continuation',
      expectedTerms: ['function', 'analytic', 'continuation'],
      description: 'Advanced number theory',
      difficulty: 'hard'
    },
    
    // Algebraic Geometry
    {
      query: 'elliptic curve point addition',
      expectedTerms: ['elliptic', 'curve', 'point', 'addition'],
      expectedFunctions: ['EllipticCurve', 'Points'],
      description: 'Basic algebraic geometry',
      difficulty: 'easy'
    },
    {
      query: 'jacobian variety divisor class',
      expectedTerms: ['jacobian', 'variety', 'divisor'],
      description: 'Intermediate algebraic geometry',
      difficulty: 'medium'
    },
    {
      query: 'motives categorical framework',
      expectedTerms: ['motives', 'categorical'],
      description: 'Advanced algebraic geometry',
      difficulty: 'hard'
    },
    
    // Linear Algebra
    {
      query: 'matrix eigenvalue computation',
      expectedTerms: ['matrix', 'eigenvalue', 'computation'],
      expectedFunctions: ['Eigenvalues', 'Matrix'],
      description: 'Basic linear algebra',
      difficulty: 'easy'
    },
    {
      query: 'jordan normal form decomposition',
      expectedTerms: ['jordan', 'normal', 'form'],
      description: 'Intermediate linear algebra',
      difficulty: 'medium'
    },
    
    // Commutative Algebra
    {
      query: 'polynomial ring ideal computation',
      expectedTerms: ['polynomial', 'ring', 'ideal'],
      expectedFunctions: ['PolynomialRing', 'Ideal'],
      description: 'Basic commutative algebra',
      difficulty: 'easy'
    },
    {
      query: 'Groebner basis algorithm',
      expectedTerms: ['groebner', 'basis', 'algorithm'],
      description: 'Intermediate commutative algebra',
      difficulty: 'medium'
    },
    
    // Function-specific queries
    {
      query: 'GF finite field arithmetic',
      expectedTerms: ['finite', 'field', 'arithmetic'],
      expectedFunctions: ['GF'],
      description: 'Finite field construction',
      difficulty: 'easy'
    },
    {
      query: 'IsIrreducible polynomial test',
      expectedTerms: ['irreducible', 'polynomial'],
      expectedFunctions: ['IsIrreducible'],
      description: 'Polynomial irreducibility testing',
      difficulty: 'easy'
    },
  ];

  constructor() {
    this.kb = new AdvancedMagmaKnowledgeBase();
  }

  async runBenchmark(): Promise<void> {
    console.log('🎯 Starting MAGMA Knowledge Base Quality Benchmark\n');
    
    await this.kb.initialize();
    
    const results: BenchmarkResult[] = [];
    
    console.log(`📊 Running ${this.benchmarkQueries.length} benchmark queries...\n`);
    
    for (let i = 0; i < this.benchmarkQueries.length; i++) {
      const query = this.benchmarkQueries[i];
      console.log(`[${i+1}/${this.benchmarkQueries.length}] Testing: "${query.query}" (${query.difficulty})`);
      
      const result = await this.evaluateQuery(query);
      results.push(result);
      
      console.log(`   Relevance: ${result.relevanceScore.toFixed(2)} | Speed: ${result.speedMs}ms | Results: ${result.resultCount}`);
      console.log(`   Found terms: ${result.foundExpectedTerms.join(', ') || 'none'}`);
      console.log(`   Found functions: ${result.foundExpectedFunctions.join(', ') || 'none'}\n`);
    }
    
    // Generate comprehensive report
    this.generateReport(results);
  }

  private async evaluateQuery(query: BenchmarkQuery): Promise<BenchmarkResult> {
    const startTime = Date.now();
    
    // Perform hybrid search
    const searchResults = await this.kb.hybridSearch(query.query, 5, query.expectedCategory || 'all');
    
    const endTime = Date.now();
    const speedMs = endTime - startTime;
    
    // Evaluate relevance
    const foundExpectedTerms = this.findExpectedTerms(searchResults, query.expectedTerms);
    
    // Search for expected functions
    let foundExpectedFunctions: string[] = [];
    if (query.expectedFunctions) {
      for (const func of query.expectedFunctions) {
        const funcResults = await this.kb.searchFunctions(func, 3);
        if (funcResults.length > 0) {
          foundExpectedFunctions.push(func);
        }
      }
    }
    
    // Calculate relevance score
    const termRelevance = foundExpectedTerms.length / query.expectedTerms.length;
    const functionRelevance = query.expectedFunctions ? 
      foundExpectedFunctions.length / query.expectedFunctions.length : 1;
    
    const relevanceScore = (termRelevance * 0.6) + (functionRelevance * 0.4);
    
    return {
      query: query.query,
      relevanceScore,
      speedMs,
      foundExpectedTerms,
      foundExpectedFunctions,
      topScore: searchResults[0]?.score || 0,
      resultCount: searchResults.length,
      category: query.expectedCategory || 'general'
    };
  }

  private findExpectedTerms(results: any[], expectedTerms: string[]): string[] {
    const foundTerms: string[] = [];
    const allContent = results.map(r => r.content.toLowerCase()).join(' ');
    
    for (const term of expectedTerms) {
      if (allContent.includes(term.toLowerCase())) {
        foundTerms.push(term);
      }
    }
    
    return foundTerms;
  }

  private generateReport(results: BenchmarkResult[]): void {
    console.log('📈 BENCHMARK RESULTS SUMMARY\n');
    console.log('=' .repeat(60));
    
    // Overall statistics
    const avgRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length;
    const avgSpeed = results.reduce((sum, r) => sum + r.speedMs, 0) / results.length;
    const avgResults = results.reduce((sum, r) => sum + r.resultCount, 0) / results.length;
    
    console.log(`📊 OVERALL PERFORMANCE:`);
    console.log(`   Average Relevance Score: ${(avgRelevance * 100).toFixed(1)}%`);
    console.log(`   Average Response Time: ${avgSpeed.toFixed(0)}ms`);
    console.log(`   Average Results per Query: ${avgResults.toFixed(1)}`);
    console.log('');
    
    // Performance by difficulty
    const difficultyGroups = {
      easy: results.filter(r => this.benchmarkQueries.find(q => q.query === r.query)?.difficulty === 'easy'),
      medium: results.filter(r => this.benchmarkQueries.find(q => q.query === r.query)?.difficulty === 'medium'),
      hard: results.filter(r => this.benchmarkQueries.find(q => q.query === r.query)?.difficulty === 'hard')
    };
    
    console.log(`📊 PERFORMANCE BY DIFFICULTY:`);
    for (const [difficulty, group] of Object.entries(difficultyGroups)) {
      if (group.length > 0) {
        const avgRel = group.reduce((sum, r) => sum + r.relevanceScore, 0) / group.length;
        console.log(`   ${difficulty.toUpperCase()}: ${(avgRel * 100).toFixed(1)}% relevance (${group.length} queries)`);
      }
    }
    console.log('');
    
    // Top performers
    const sortedResults = [...results].sort((a, b) => b.relevanceScore - a.relevanceScore);
    console.log(`🏆 TOP PERFORMING QUERIES:`);
    sortedResults.slice(0, 5).forEach((result, i) => {
      console.log(`   ${i+1}. "${result.query}" - ${(result.relevanceScore * 100).toFixed(1)}%`);
    });
    console.log('');
    
    // Worst performers
    console.log(`🔧 QUERIES NEEDING IMPROVEMENT:`);
    sortedResults.slice(-5).reverse().forEach((result, i) => {
      console.log(`   ${i+1}. "${result.query}" - ${(result.relevanceScore * 100).toFixed(1)}%`);
    });
    console.log('');
    
    // Speed analysis
    const fastQueries = results.filter(r => r.speedMs < 1000).length;
    const slowQueries = results.filter(r => r.speedMs > 3000).length;
    
    console.log(`⚡ SPEED ANALYSIS:`);
    console.log(`   Fast queries (<1s): ${fastQueries}/${results.length} (${(fastQueries/results.length*100).toFixed(1)}%)`);
    console.log(`   Slow queries (>3s): ${slowQueries}/${results.length} (${(slowQueries/results.length*100).toFixed(1)}%)`);
    console.log('');
    
    // Recommendations
    console.log(`💡 RECOMMENDATIONS:`);
    if (avgRelevance < 0.7) {
      console.log(`   ⚠️  Relevance below 70% - consider improving embeddings or chunking`);
    }
    if (avgSpeed > 2000) {
      console.log(`   ⚠️  Average response time >2s - consider caching or indexing improvements`);
    }
    if (difficultyGroups.hard.length > 0) {
      const hardAvg = difficultyGroups.hard.reduce((sum, r) => sum + r.relevanceScore, 0) / difficultyGroups.hard.length;
      if (hardAvg < 0.5) {
        console.log(`   ⚠️  Hard queries performing poorly - need advanced query processing`);
      }
    }
    
    const excellentQueries = results.filter(r => r.relevanceScore > 0.8).length;
    if (excellentQueries / results.length > 0.7) {
      console.log(`   ✅ Excellent performance! ${excellentQueries}/${results.length} queries above 80% relevance`);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 Benchmark completed! Use results to guide improvements.');
  }
}

// Run benchmark if called directly
async function runBenchmark() {
  const benchmark = new QualityBenchmark();
  await benchmark.runBenchmark();
}

// Export for use in other modules
export { runBenchmark };

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmark().catch(console.error);
}