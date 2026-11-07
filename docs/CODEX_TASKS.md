# Tarefas para Codex

## Primeiro: validar a base importada
1. Executar `npm ci` (downloads binários com checksums via postinstall).
2. Validar versão Node 20+, Postgres com pgvector, autenticação e permissões.
3. Executar `npm run typecheck`, `npm run lint`, `npm test` e `npm run dev` e documentar falhas.
4. Não executar `npm run build` com banco real sem revisar migrador em prebuild.
5. Verificar aplicação web antes de alterar UX.

## Depois: módulos exclusivos (incrementais)
- Nova Questão: texto, alternativas, gabarito, resposta marcada, imagem opcional.
- Concurso/edital/tópico com pesos e distinção entre conteúdo oficial e hipotético.
- Banco de conceitos e pegadinhas; cadernos como *visões* únicas de dados.
- Editor BlockNote integrado, respostas corretas, lei seca, padrões de banca.
- Geração de flashcards por IA com aprovação e FSRS integrado.
- Estatísticas determinísticas e prioridade calculada por ganho de pontos, desempenho, prazo e incerteza.
- Testes de isolamento por conta, deduplicação, referenciamento de fontes e limites de custos da IA.

Não inventar dados estatísticos nem citações legais. Não expor chaves no cliente. Método apenas questões + flashcards.
