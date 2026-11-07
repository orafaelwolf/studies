# Studies — Sistema all-in-one de estudos

**Base StudyBuddy importada.** Aplicação Next.js 16, React 19, PostgreSQL/Drizzle, Auth.js, OpenRouter e FSRS. Este repositório é o ponto inicial para desenvolver cadernos inteligentes de **respostas corretas, pegadinhas, lei seca e padrões de banca**, conectados a flashcards.

## Status

- Os **167 arquivos de texto/código** da base foram importados, preservando seus blobs originais. O README upstream está em [docs/UPSTREAM_STUDYBUDDY_README.md](docs/UPSTREAM_STUDYBUDDY_README.md).
- Seis recursos binários (2 fontes, favicon e 3 PDFs de exemplo) são recuperados automaticamente de um commit fixado do upstream em `npm ci`, com validação de checksum.
- **A aplicação ainda mantém o fluxo e a taxonomia originais do StudyBuddy.** Os módulos personalizados de concursos e cadernos não estão implementados.
- A cópia remota ainda não passou por compilação/testes completos neste ambiente; executar localmente com Codex.

## Começar com Codex

No terminal integrado do Codex, na pasta do projeto:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run dev
```

Configure `.env.local` conforme `.env.example`. Para criar as chaves de sessão e criptografia, utilize `npm run gen:secrets`. O PostgreSQL com `pgvector` precisa estar disponível; depois rode `npm run db:migrate` e `npm run db:seed` para o comportamento original da base. **Nunca versione credenciais**. O `npm run build` possui lógica upstream de migração quando o banco está configurado; confira antes de executar com dados reais.

## Repositórios usados / considerados

| Projeto | URL | Uso |
|---|---|---|
| StudyBuddy | https://github.com/DagaVedant/StudyBuddy | **Base** importada, licença MIT |
| BlockNote | https://github.com/TypeCellOS/BlockNote | Editor, instalar como biblioteca |
| ts-fsrs | https://github.com/open-spaced-repetition/ts-fsrs | Já utilizado pelo StudyBuddy |
| shadcn/ui | https://github.com/shadcn-ui/ui | Componentes visuais individuais |
| Vercel AI SDK | https://github.com/vercel/ai | Avaliar, não duplicar integração existente |
| OpenRouter Provider | https://github.com/OpenRouterTeam/ai-sdk-provider | Opcional se migrar para AI SDK |

Não fazer merge de todos os repositórios inteiros. Bibliotecas entram como dependências.

Veja [arquitetura](docs/ARCHITECTURE.md) e [tarefas para Codex](docs/CODEX_TASKS.md).

## Direitos autorais

O código original do StudyBuddy é de **Vedant Daga** e está sob licença MIT. Mantido [LICENSE](LICENSE), com o aviso de copyright original. Os novos módulos deverão preservar os avisos das dependências aplicáveis.

O conteúdo de questões será enviado pelos próprios usuários; sem coleta automatizada de terceiros. O método de estudo é **questões e flashcards**, sem mapas mentais, grifos e outras ferramentas de estudo.
