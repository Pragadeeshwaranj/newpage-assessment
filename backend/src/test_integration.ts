import { mcpManager } from './mcpClient.js';
import { IngestService } from './services/ingestService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('=== Starting Backend TypeScript Integration Tests ===');

  // Test 1: Connect to Python MCP tools server
  console.log('\n[Test 1] Testing MCP connection and tool discovery...');
  await mcpManager.connect();
  const tools = await mcpManager.getTools();
  console.log(`Found ${tools.length} MCP tools:`, tools.map((t: any) => t.name).join(', '));
  if (tools.length === 0) {
    throw new Error('No MCP tools found!');
  }
  console.log('✓ MCP tools discovered successfully.');

  // Test 2: Test GenAI function declaration transformation
  console.log('\n[Test 2] Testing MCP -> Gemini tool declaration conversion...');
  const declarations = await mcpManager.getGenAiToolDeclarations();
  console.log(`Converted declarations: ${declarations[0]?.functionDeclarations?.length} function declarations.`);
  if (!declarations[0]?.functionDeclarations?.length) {
    throw new Error('Failed to generate Gemini function declarations!');
  }
  console.log('✓ Gemini tool declarations generated successfully.');

  // Test 3: Ingest a local codebase
  console.log('\n[Test 3] Testing local directory ingestion via MCP...');
  const targetDir = path.resolve(__dirname, '..', '..', 'tools');
  const workspace = await IngestService.ingest({
    type: 'local',
    target: targetDir,
  });
  console.log(`Ingested workspace: ID=${workspace.id}, Name=${workspace.name}, Entries=${workspace.initialEntries?.length}`);
  if (!workspace.id || !workspace.initialEntries || workspace.initialEntries.length === 0) {
    throw new Error('Failed to ingest workspace or list initial entries!');
  }
  console.log('✓ Local codebase ingested successfully via MCP tools.');

  // Test 4: Call MCP tool 'list_directory' on workspace
  console.log('\n[Test 4] Testing MCP list_directory tool execution...');
  const treeResult = await mcpManager.callTool('list_directory', { path: '.' }, workspace.path);
  if (treeResult.isError) {
    throw new Error(`MCP list_directory failed: ${treeResult.text}`);
  }
  const parsedTree = JSON.parse(treeResult.text);
  console.log(`Directory listing retrieved: ${parsedTree.entries?.length} entries.`);
  console.log('✓ MCP list_directory executed successfully.');

  // Test 5: Call MCP tool 'grep_search' on workspace
  console.log('\n[Test 5] Testing MCP grep_search tool execution...');
  const grepResult = await mcpManager.callTool('grep_search', { query: 'FastAPI', path: '.' }, workspace.path);
  if (grepResult.isError) {
    throw new Error(`MCP grep_search failed: ${grepResult.text}`);
  }
  const parsedGrep = JSON.parse(grepResult.text);
  console.log(`Grep matches found: ${parsedGrep.count ?? (Array.isArray(parsedGrep) ? parsedGrep.length : 'ok')}`);
  console.log('✓ MCP grep_search executed successfully.');

  // Test 6: Call MCP tool 'read_file' on workspace
  console.log('\n[Test 6] Testing MCP read_file tool execution...');
  const readResult = await mcpManager.callTool('read_file', { path: 'server.py', max_lines: 10 }, workspace.path);
  if (readResult.isError) {
    throw new Error(`MCP read_file failed: ${readResult.text}`);
  }
  console.log('File preview:\n' + readResult.text.split('\n').slice(0, 5).join('\n'));
  console.log('✓ MCP read_file executed successfully.');

  console.log('\n=======================================');
  console.log('🎉 ALL TYPESCRIPT INTEGRATION TESTS PASSED!');
  console.log('=======================================');

  await mcpManager.close();
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error('\n❌ Test failed:', err);
  await mcpManager.close().catch(() => {});
  process.exit(1);
});
