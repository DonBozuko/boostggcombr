import sys

content = open('src/routes/index.tsx').read()
marker = "// O conteúdo original do arquivo continua abaixo desta linha"
if marker in content:
    # Já está com o cabeçalho novo, mas precisamos restaurar o resto
    sys.exit(0)

