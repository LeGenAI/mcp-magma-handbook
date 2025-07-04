# MAGMA Handbook MCP Server - Usage Guide

## Quick Start

### 1. Installation
```bash
npm install -g mcp-magma-handbook
```

### 2. Setup PDF
```bash
# Create data directory
mkdir -p data/pdfs

# Copy your MAGMA handbook PDF
cp /path/to/MAGMA_HANDBOOK.pdf data/pdfs/
```

### 3. Index the Handbook
```bash
npm run index
```

### 4. Configure MCP Client
Add to your Claude Desktop configuration:
```json
{
  "mcpServers": {
    "magma-handbook": {
      "command": "npx",
      "args": ["mcp-magma-handbook"],
      "env": {
        "OPENAI_API_KEY": "your-openai-api-key"
      }
    }
  }
}
```

## Available Tools

### search_magma
Search for information in the MAGMA handbook.

**Parameters:**
- `query` (required): Search query
- `limit` (optional): Maximum results (default: 5)
- `category` (optional): Filter by category

**Categories:**
- `syntax`: Language syntax and grammar
- `function`: Built-in functions and intrinsics
- `algorithm`: Mathematical algorithms
- `example`: Code examples and usage
- `theory`: Mathematical theory and background
- `all`: All categories (default)

**Example:**
```
Search for "elliptic curve point addition" in the MAGMA handbook
```

### get_magma_example
Get code examples for specific mathematical topics.

**Parameters:**
- `topic` (required): Mathematical topic or function name
- `complexity` (optional): Complexity level (basic, intermediate, advanced)

**Example:**
```
Show me basic examples of working with finite fields in MAGMA
```

### explain_magma_code
Explain what a piece of MAGMA code does.

**Parameters:**
- `code` (required): MAGMA code to explain
- `context` (optional): Additional context

**Example:**
```
Explain this MAGMA code:
E := EllipticCurve([GF(101) | 1, 2]);
P := RandomPoint(E);
```

## Common Use Cases

### 1. Learning MAGMA Syntax
```
"How do I define a polynomial ring in MAGMA?"
"What's the syntax for creating a permutation group?"
```

### 2. Finding Functions
```
"Find functions for computing Galois groups"
"Search for elliptic curve functions"
```

### 3. Code Examples
```
"Show me examples of factoring polynomials"
"Get examples for computing with matrices over finite fields"
```

### 4. Understanding Code
```
"Explain this MAGMA code: [paste code here]"
"What does the IsIrreducible function do?"
```

## Best Practices

### Search Queries
- Use specific mathematical terms
- Include context about the mathematical area
- Try different phrasings if first search doesn't find what you need

### Getting Examples
- Start with basic complexity for learning
- Specify the mathematical context clearly
- Ask for multiple examples if needed

### Code Explanation
- Include the full code context
- Provide background about what you're trying to achieve
- Ask follow-up questions about specific parts

## Troubleshooting

### No Results Found
- Try broader search terms
- Check different categories
- Verify the PDF was indexed correctly

### Code Explanation Issues
- Make sure the code syntax is correct
- Include more context about the mathematical problem
- Break down complex code into smaller parts

### Performance Issues
- Large PDFs may take time to index initially
- Search results are cached for better performance
- Consider using more specific queries to reduce search time

## Environment Variables

Set these in your environment or `.env` file:

```bash
# Required: OpenAI API key for embeddings
OPENAI_API_KEY=your-api-key

# Optional: ChromaDB configuration
CHROMA_SERVER_HOST=localhost
CHROMA_SERVER_PORT=8000
```

## Development Mode

For development and testing:

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```