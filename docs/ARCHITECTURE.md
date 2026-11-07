# Arquitetura Studies

Método exclusivo: questões + flashcards. Sem mapas mentais, grifos ou aulas.

## Open source
- StudyBuddy: base Next.js 16, PostgreSQL, Drizzle, Auth.js, OpenRouter e FSRS.
- BlockNote: editor dos cadernos; integrar por pacote npm.
- ts-fsrs: reusar motor já presente no StudyBuddy.
- shadcn/ui: componentes individuais.
- Vercel AI SDK + OpenRouter provider: apenas se a migração da camada de IA existente valer a pena.

## Codex — desenvolver
1. Entrada manual de questões: enunciado, alternativas, gabarito, alternativa marcada, imagem opcional.
2. Domínio de concursos: editais, disciplinas, tópicos e pesos, com status oficial ou hipotético.
3. Banco central KnowledgeItem, Trap, LegalReference e QuestionKnowledgeLink.
4. Cadernos de Corretas, Pegadinhas, Lei Seca, Padrões da Banca como visões do mesmo banco — sem duplicação.
5. Flashcards por conceito gerados pela IA, aprovados/alterados pelo aluno e revisados por FSRS.
6. Estatística por concurso e priorização com regras mensuráveis e tamanho da amostra.
7. Testes, auditoria de acesso por usuário, backup e exportação.

## API IA
Interpretar enunciado, explicar gabarito e alternativas, classificar assuntos, propor pegadinhas e flashcards, sugerir referências legais e deduplicação. Saída em JSON validada por schema. Validação de referências e indicação de incerteza são obrigatórias.

## Fluxo
Usuário envia questão -> backend valida e salva -> OpenRouter interpreta -> backend valida e relaciona conceitos -> cadernos e flashcards -> FSRS e estatísticas.

Dados pessoais, questões e cadernos privados por conta; não realizar scraping.
