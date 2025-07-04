# 🧙‍♂️ MCP MAGMA Handbook Server

[![npm version](https://badge.fury.io/js/mcp-magma-handbook.svg)](https://badge.fury.io/js/mcp-magma-handbook)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An intelligent MCP (Model Context Protocol) server that provides AI assistants with comprehensive access to the MAGMA computational algebra system handbook through advanced vector search and semantic understanding.

## ✨ Features

- 🔍 **Semantic Search**: Natural language queries across the entire MAGMA handbook
- 📚 **Smart Examples**: Retrieve code examples categorized by complexity and topic
- 🧠 **Code Explanation**: Get detailed, contextual explanations of MAGMA code
- 🏷️ **Category Filtering**: Search within specific categories (syntax, functions, algorithms, examples, theory)
- ⚡ **Vector Database**: Powered by Supabase pgvector for lightning-fast similarity search
- 🎯 **MAGMA-Optimized**: Specialized parsing and understanding of MAGMA syntax and concepts

## 🎯 Perfect For

- 🔬 **Researchers** working with computational algebra
- 👨‍🎓 **Students** learning MAGMA and algebraic computation
- 💻 **Developers** building mathematical software
- 📖 **Anyone** needing quick access to MAGMA documentation

## 🚀 Quick Start

### Installation

```bash
npm install -g mcp-magma-handbook
```

### Prerequisites

- Node.js 18+
- OpenAI API key (for embeddings)
- Supabase account (free tier works great!)
- MAGMA Handbook PDF

## Setup

1. Place your MAGMA handbook PDF in the `data/pdfs/` directory:
   ```bash
   mkdir -p data/pdfs
   cp /path/to/MAGMA_HANDBOOK.pdf data/pdfs/
   ```

2. Index the handbook:
   ```bash
   npm run index
   ```

3. Configure your MCP client (e.g., Claude Desktop):
   ```json
   {
     "mcpServers": {
       "magma-handbook": {
         "command": "npx",
         "args": ["mcp-magma-handbook"],
         "env": {
           "OPENAI_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

## Usage

Once configured, the AI assistant can use these tools:

### search_magma
Search for specific topics in the MAGMA handbook:
```
"Search for information about elliptic curves in MAGMA"
```

### get_magma_example
Get code examples for mathematical topics:
```
"Show me MAGMA examples for computing Galois groups"
```

### explain_magma_code
Get explanations for MAGMA code:
```
"Explain this MAGMA code: E := EllipticCurve([GF(23) | 1, 1]);"
```

## 💬 Example Conversations

Once configured, you can ask Claude questions like:

**Basic Syntax:**
> "How do I define a finite field in MAGMA?"

**Code Examples:**
> "Show me examples of computing with elliptic curves over finite fields"

**Code Explanation:**
> "Explain this MAGMA code: `G := PerfectClosure(GF(8)); H := AutomorphismGroup(G);`"

**Advanced Topics:**
> "Find algorithms for computing Galois groups of polynomials"

**Research Help:**
> "What are the available functions for working with algebraic curves in MAGMA?"

## Environment Variables

- `OPENAI_API_KEY`: Required for embedding generation (uses text-embedding-3-small)
- `CHROMA_SERVER_HOST`: Optional, for remote ChromaDB instance
- `CHROMA_SERVER_PORT`: Optional, for remote ChromaDB instance

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## 🛠️ Technical Details

### Architecture
- **Backend**: Node.js with TypeScript
- **Vector DB**: Supabase with pgvector extension
- **Embeddings**: OpenAI text-embedding-3-small
- **Document Processing**: LangChain with optimized chunking
- **Protocol**: MCP (Model Context Protocol) 1.0

### Performance
- **8,730+** indexed document chunks
- **~175 batches** for efficient processing
- **Sub-second** search responses
- **Semantic similarity** scoring

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/LeGenAI/mcp-magma-handbook.git
cd mcp-magma-handbook
npm install
npm run dev
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **MAGMA Team** for the comprehensive computational algebra system
- **Anthropic** for the Model Context Protocol
- **Supabase** for the excellent vector database platform
- **OpenAI** for powerful embedding models

---

**Made with ❤️ for the computational algebra community**