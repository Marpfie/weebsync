import { createFileRoute } from '@tanstack/react-router'

import { FriendsPage } from '../components/pages/FriendsPage'

export const Route = createFileRoute('/friends')({ component: FriendsPage })
