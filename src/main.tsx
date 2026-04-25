import { ApolloProvider } from '@apollo/client/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initApollo } from './lib/apollo.ts'

const root = createRoot(document.getElementById('root')!)

initApollo().then((client) => {
    root.render(
        <StrictMode>
            <ApolloProvider client={client}>
                <App />
            </ApolloProvider>
        </StrictMode>,
    )
})
