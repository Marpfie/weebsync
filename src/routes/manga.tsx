import { createFileRoute } from '@tanstack/react-router'

import { MangaPage } from '../components/pages/MangaPage'

export const Route = createFileRoute('/manga')({ component: MangaPage })
