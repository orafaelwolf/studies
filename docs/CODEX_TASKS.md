# Plano de integração com Codex

PR 1: executar scripts/import-studybuddy.sh em checkout limpo; preservar licença e autoria; validar npm ci, typecheck, lint, testes e build. O script prebuild do upstream pode migrar banco: NÃO executar com banco de produção.

PR 2: adicionar exames, pesos, matérias e tópicos brasileiros; substituir taxonomia SAT/Competition Math sem destruir dados.

PR 3: criar formulário rápido de questões, gabarito e resposta do aluno. Construir pipeline IA JSON com evidências.

PR 4: implementar banco de conceitos, pegadinhas, lei seca, editor BlockNote, flashcards com FSRS e revisão.

PR 5: dashboard de estatísticas por edital, confiança da amostra e cálculo determinístico de prioridade.

Critérios de aceite: isolamento por usuário, rastreabilidade, deduplicação, segurança de API keys, testes automatizados e respeito a licenças.
