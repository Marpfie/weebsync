import { createFileRoute } from '@tanstack/react-router'

import { AnimePage } from '../components/pages/AnimePage'

export const Route = createFileRoute('/anime')({ component: AnimePage })
