#!/bin/bash

echo "=== Teste de Integração Claude ==="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar comando Claude
test_claude_command() {
    local command="$1"
    local expected="$2"
    
    echo -e "${YELLOW}Testando comando:${NC} $command"
    
    # Executa o comando
    output=$(claude --print "$command" --output-format stream-json --verbose 2>&1)
    
    # Verifica se obteve resposta
    if echo "$output" | grep -q "session_id"; then
        echo -e "${GREEN}✓ Comando executado com sucesso${NC}"
        echo "Session ID capturado: $(echo "$output" | grep -o '"session_id":"[^"]*"' | head -1)"
        return 0
    else
        echo -e "${RED}✗ Falha ao executar comando${NC}"
        echo "Output: $output"
        return 1
    fi
}

# Teste 1: Comando simples
echo "1. Teste de comando simples"
test_claude_command "Hello, Claude!" "response"
echo ""

# Teste 2: Comando com pergunta
echo "2. Teste de comando com pergunta"
test_claude_command "What is 2+2?" "4"
echo ""

# Teste 3: Verificar formato JSON
echo "3. Verificando formato de saída JSON"
output=$(claude --print "Test JSON output" --output-format stream-json 2>&1)
if echo "$output" | jq empty 2>/dev/null; then
    echo -e "${GREEN}✓ Output é JSON válido${NC}"
else
    echo -e "${RED}✗ Output não é JSON válido${NC}"
    echo "Primeiras linhas do output:"
    echo "$output" | head -5
fi
echo ""

# Teste 4: Verificar se o servidor está rodando
echo "4. Verificando servidor WebSocket"
if lsof -i :3003 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Servidor está rodando na porta 3003${NC}"
else
    echo -e "${RED}✗ Servidor não está rodando${NC}"
    echo "Iniciando servidor..."
    npm run dev > /dev/null 2>&1 &
    sleep 5
fi

echo ""
echo "=== Testes concluídos ==="