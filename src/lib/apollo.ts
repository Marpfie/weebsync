import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { LocalStorageWrapper, persistCache } from 'apollo3-cache-persist';

const cache = new InMemoryCache();

export async function initApollo() {
    await persistCache({
        cache,
        storage: new LocalStorageWrapper(window.localStorage),
        // Stay safely under the 5MB localStorage limit
        maxSize: 4_194_304,
    });

    return new ApolloClient({
        link: new HttpLink({ uri: 'https://graphql.anilist.co' }),
        cache,
        defaultOptions: {
            watchQuery: {
                // Show cached data immediately, refresh in the background
                fetchPolicy: 'cache-and-network',
            },
        },
    });
}

