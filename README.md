# Studies — Cadernos de questões e flashcards

Plataforma all-in-one de estudo por questões e flashcards, com organização de cadernos por IA.

**Status:** documentação e bootstrap preparados. O código-base ainda NÃO foi importado; esta branch não representa uma aplicação funcional.

## Repositórios e integração

| Repositório | Função | Como integrar |
|---|---|---|
| [StudyBuddy](https://github.com/DagaVedant/StudyBuddy) | Base do aplicativo: Next.js, PostgreSQL, Drizzle, Auth.js, processamento de questões, OpenRouter, FSRS | Importar como base com o script |
| [BlockNote](https://github.com/TypeCellOS/BlockNote) | Editor dos cadernos | Instalar pacotes npm adequados |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | Agendamento de flashcards | Já presente no StudyBuddy; adaptar |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Componentes visuais | Adicionar componentes específicos |
| [Vercel AI SDK](https://github.com/vercel/ai) | Abstração de modelos de IA | Opcional; avaliar camada já presente |
| [OpenRouter AI SDK Provider](https://github.com/OpenRouterTeam/ai-sdk-provider) | OpenRouter no AI SDK | Adotar apenas se usarmos AI SDK |

**Não copiar nem fazer git merge dos repositórios das bibliotecas.** Eles devem ser dependências do aplicativo, evitando múltiplas aplicações e dependências em conflito.

## Próximo passo com Codex

Execute `bash scripts/import-studybuddy.sh` em checkout limpo desta branch, revise licenças e dependências, rode testes e só depois adapte o produto. Veja [arquitetura](docs/ARCHITECTURE.md) e [tarefas para Codex](docs/CODEX_TASKS.md).

O código StudyBuddy é MIT: manter LICENSE e copyright de Vedant Daga. Não versionar arquivos .env nem credenciais.
