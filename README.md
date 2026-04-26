# AniList Recommendations

A social anime and manga recommendation website. It reads your friends' watch/read activity from AniList and surfaces titles they've rated highly that you haven't seen yet, ranked by how many friends recommended each title.

## Tech Stack

| Layer                    | Technology                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Framework**            | [React 19](https://react.dev/) with React Compiler                                       |
| **Language**             | TypeScript 6 (strict mode)                                                               |
| **Build tool**           | [Vite 8](https://vite.dev/)                                                              |
| **Routing**              | [@tanstack/react-router](https://tanstack.com/router) (file-based)                       |
| **GraphQL client**       | [@apollo/client](https://www.apollographql.com/docs/react/) with `apollo3-cache-persist` |
| **GraphQL codegen**      | [@graphql-codegen/client-preset](https://the-guild.dev/graphql/codegen)                  |
| **UI components**        | [shadcn](https://ui.shadcn.com/) (Nova preset, Base UI)                                  |
| **Styling**              | [Tailwind CSS v4](https://tailwindcss.com/)                                              |
| **Internationalisation** | [i18next](https://www.i18next.com/) + react-i18next                                      |
| **Rate limiting**        | [p-queue](https://github.com/sindresorhus/p-queue)                                       |
| **Package manager**      | [Bun](https://bun.sh/)                                                                   |

## Getting Started

```bash
bun install
bun run dev
```

Copy `.env.example` to `.env` and set `VITE_ANILIST_CLIENT_ID` to your AniList OAuth client ID before running.

## Scripts

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `bun run dev`           | Start development server             |
| `bun run build`         | Type-check and build for production  |
| `bun run preview`       | Preview production build locally     |
| `bun run lint`          | Run ESLint                           |
| `bun run lint:fix`      | Run ESLint with auto-fix             |
| `bun run codegen`       | Regenerate GraphQL types from schema |
| `bun run codegen:watch` | Watch mode for codegen               |
